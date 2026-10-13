import {area as geodesicArea} from '@turf/area';
import {booleanValid} from '@turf/boolean-valid';
import {verifyPopulationGeometryRuntime} from './population-geometry';
import {canonicalGeometryKey,geometryVertexCount,populationAdminBoundaryGeometrySchema,populationAreaQuerySchema,populationReplySchema,POPULATION_ADMIN_MAX_VERTICES,POPULATION_CACHE_TTL_SECONDS,POPULATION_DAILY_CALL_BUDGET,POPULATION_MAX_AREA_KM2,POPULATION_MAX_BODY_BYTES,POPULATION_METHOD,POPULATION_RELEASE,POPULATION_RESOLUTION,POPULATION_SOURCE,POPULATION_TIMEOUT_MS,POPULATION_YEAR,type PopulationError,type PopulationGeometry} from './population-contract';
import {adminLayerById,populationDataset,populationEdition,verifyPopulationCatalog} from './population-catalog';
import {calculatePopulationFromAdminAggregate,calculatePopulationFromRasters,loadPopulationActivation,POPULATION_RASTER_MAX_BLOCKS_PER_QUERY,type PopulationRasterActivation} from './population-raster-service';

const JSON_HEADERS={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
let activeQueries=0;
type Services={db:D1Database;bucket:R2Bucket;cache?:Cache;now?:()=>number;maxDailyCalls?:number;timeoutMs?:number};

function fail(status:number,error:PopulationError,extra:Record<string,unknown>={}){
  return Response.json({status:error==='no_coverage'?'no_coverage':error==='partial_coverage'?'partial_coverage':'error',error,...extra},{status,headers:JSON_HEADERS});
}
function cacheRequest(origin:string,hash:string){return new Request(new URL(`/__population-cache/${populationEdition}/${hash}`,origin));}
async function digest(value:string){
  const bytes=new TextEncoder().encode(value),result=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(result)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function readBoundedText(response:Request|Response,maxBytes:number){
  const declared=Number(response.headers.get('Content-Length'));
  if(Number.isFinite(declared)&&declared>maxBytes)throw new Error('body_too_large');
  const reader=response.body?.getReader();if(!reader)throw new Error('missing_body');
  const chunks:Uint8Array[]=[];let length=0;
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new Error('body_too_large');}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
async function reservePopulationQuery(services:Services,now:number){
  const utcDay=Math.floor(now/86_400_000),max=services.maxDailyCalls??POPULATION_DAILY_CALL_BUDGET;
  const row=await services.db.prepare("INSERT INTO population_budget(id,utc_day,hits) VALUES('global',?,1) ON CONFLICT(id) DO UPDATE SET utc_day=excluded.utc_day,hits=CASE WHEN population_budget.utc_day=excluded.utc_day THEN population_budget.hits+1 ELSE 1 END WHERE population_budget.utc_day<>excluded.utc_day OR population_budget.hits<? RETURNING hits")
    .bind(utcDay,max).first<{hits:number}>();
  if(row)return {ok:true as const};
  return {ok:false as const,retryAfter:86_400-Math.floor(now/1000)%86_400};
}
function errorCode(error:unknown,aborted:boolean):PopulationError{
  if(aborted)return 'provider_timeout';
  const code=(error as {populationError?:string})?.populationError;
  if(code==='no_coverage'||code==='area_limit'||code==='provider_incompatible'||code==='provider_unavailable')return code;
  return aborted?'provider_timeout':'query_failed';
}
function failureStatus(error:PopulationError){
  if(error==='quota_exceeded')return 429;
  if(error==='invalid_geometry'||error==='invalid_country')return 400;
  if(error==='no_coverage'||error==='partial_coverage')return 422;
  if(error==='area_limit')return 413;
  return 503;
}
function failed(error:unknown,signal:AbortSignal,retryAfter?:number){
  const code=errorCode(error,signal.aborted);
  return fail(failureStatus(code),code,retryAfter?{retryAfter}:{});
}

export async function populationAreaResponse(request:Request,services:Services){
  const now=services.now?.()??Date.now();
  if(request.signal.aborted)return fail(503,'provider_timeout');
  if(request.method!=='POST')return fail(405,'query_failed');
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')??''))return fail(415,'invalid_geometry');
  const declared=Number(request.headers.get('Content-Length'));
  if(Number.isFinite(declared)&&declared>POPULATION_MAX_BODY_BYTES)return fail(413,'area_limit');
  let raw:string;
  try{raw=await readBoundedText(request,POPULATION_MAX_BODY_BYTES);}catch{return fail(413,'area_limit');}
  let body:unknown;try{body=JSON.parse(raw);}catch{return fail(400,'invalid_geometry');}
  const parsed=populationAreaQuerySchema.safeParse(body);
  if(!parsed.success)return fail(400,'invalid_geometry');
  const query=parsed.data;
  if(!verifyPopulationGeometryRuntime())return fail(503,'provider_incompatible');
  if(!booleanValid(query.geometry))return fail(400,'invalid_geometry');
  const geoAreaKm2=geodesicArea(query.geometry as never)/1_000_000;
  if(!Number.isFinite(geoAreaKm2)||geoAreaKm2<=0)return fail(400,'invalid_geometry');
  if(geoAreaKm2>POPULATION_MAX_AREA_KM2)return fail(413,'area_limit');
  const unsupported=query.countryCodes.filter(code=>!populationDataset(code));
  if(unsupported.length){
    const hasSupported=query.countryCodes.some(code=>Boolean(populationDataset(code)));
    return fail(422,hasSupported?'partial_coverage':'no_coverage',{unsupportedCountryCodes:unsupported});
  }
  if(!await verifyPopulationCatalog())return fail(503,'provider_incompatible');
  if(activeQueries>=4)return fail(429,'quota_exceeded',{retryAfter:1});
  let activation:PopulationRasterActivation;
  try{activation=await loadPopulationActivation(services.bucket);}
  catch(error){return failed(error,request.signal);}
  const countryCodes=query.countryCodes.slice().sort();
  const hash=await digest(`${activation.catalogSha256}\n${activation.release}\n${POPULATION_SOURCE}\n${POPULATION_METHOD}\n${countryCodes.join(',')}\n${canonicalGeometryKey(query.geometry)}`);
  const key=cacheRequest(new URL(request.url).origin,hash);
  try{
    const cached=await services.cache?.match(key);
    if(cached){
      const text=await readBoundedText(cached,POPULATION_MAX_BODY_BYTES),cachedBody=JSON.parse(text) as unknown,validated=populationReplySchema.safeParse(cachedBody);
      if(validated.success&&validated.data.status==='available'&&validated.data.geometryHash===hash&&validated.data.dataVersion===activation.catalogSha256)return Response.json(validated.data,{headers:JSON_HEADERS});
    }
  }catch{/* a corrupt cache entry is ignored and recalculated from the active raster release */}
  const reservation=await reservePopulationQuery(services,services.now?.()??now);
  if(!reservation.ok)return fail(429,'quota_exceeded',{retryAfter:reservation.retryAfter});
  activeQueries++;
  const controller=new AbortController(),abort=()=>controller.abort();
  if(request.signal.aborted)controller.abort();
  request.signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(),services.timeoutMs??POPULATION_TIMEOUT_MS);
  try{
    const result=await calculatePopulationFromRasters({
      bucket:services.bucket,
      cache:services.cache,
      origin:new URL(request.url).origin,
      geometry:query.geometry,
      countryCodes,
      activation,
      maxBlocks:POPULATION_RASTER_MAX_BLOCKS_PER_QUERY,
      signal:controller.signal,
      now:services.now
    });
    const coverage={status:result.noDataGridCells?'partial' as const:'complete' as const,validGridCells:result.validGridCells,intersectedGridCells:result.intersectedGridCells,noDataGridCells:result.noDataGridCells};
    const reply={status:'available' as const,geometryHash:hash,dataVersion:result.dataVersion,countryCodes,population:result.population,areaKm2:geoAreaKm2,year:POPULATION_YEAR,edition:`${POPULATION_RELEASE}-v1` as const,resolution:POPULATION_RESOLUTION,units:'people_per_grid_cell' as const,method:POPULATION_METHOD,source:POPULATION_SOURCE,license:'CC-BY-4.0' as const,doi:'10.5258/SOTON/WP00839' as const,coverage,sourceDatasets:result.datasets,processingTimeMs:result.processingTimeMs};
    try{if(services.cache)await services.cache.put(key,Response.json(reply,{headers:{'Cache-Control':`public, max-age=${POPULATION_CACHE_TTL_SECONDS}`,'Content-Type':'application/json; charset=utf-8'}}));}catch{/* a cache write failure does not discard a verified raster result */}
    return Response.json(reply,{headers:JSON_HEADERS});
  }catch(error){return failed(error,controller.signal);}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);activeQueries--;}
}

export async function populationAdminAggregateResponse(request:Request,services:Services,input:{countryCode:string;boundaryLayerId:string;featureId:string;geometry:PopulationGeometry;areaKm2?:number;boundary:Record<string,unknown>}){
  const now=services.now?.()??Date.now();
  if(request.signal.aborted)return fail(503,'provider_timeout');
  if(request.method!=='POST')return fail(405,'query_failed');
  if(!services.db||!services.bucket)return fail(503,'provider_unavailable');
  const layer=adminLayerById(input.boundaryLayerId);
  if(!layer||layer.countryCode!==input.countryCode||!populationDataset(input.countryCode))return fail(422,'invalid_country');
  const parsed=populationAdminBoundaryGeometrySchema.safeParse(input.geometry);
  if(!parsed.success)return fail(503,'provider_incompatible');
  if(geometryVertexCount(parsed.data)>POPULATION_ADMIN_MAX_VERTICES)return fail(413,'area_limit');
  const geoAreaKm2=input.areaKm2??geodesicArea(parsed.data as never)/1_000_000;
  if(!Number.isFinite(geoAreaKm2)||geoAreaKm2<=0||geoAreaKm2>510_065_621)return fail(503,'provider_incompatible');
  if(!verifyPopulationGeometryRuntime()||!await verifyPopulationCatalog())return fail(503,'provider_incompatible');
  if(activeQueries>=4)return fail(429,'quota_exceeded',{retryAfter:1});
  let activation:PopulationRasterActivation;
  try{activation=await loadPopulationActivation(services.bucket);}
  catch(error){return failed(error,request.signal);}
  const geometryHash=await digest(`${activation.catalogSha256}\n${activation.release}\n${input.boundaryLayerId}\n${input.featureId}`);
  const key=cacheRequest(new URL(request.url).origin,geometryHash);
  try{
    const cached=await services.cache?.match(key);
    if(cached){
      const cachedBody=JSON.parse(await readBoundedText(cached,POPULATION_MAX_BODY_BYTES)) as unknown,validated=populationReplySchema.safeParse(cachedBody);
      if(validated.success&&validated.data.status==='available'&&validated.data.geometryHash===geometryHash&&validated.data.dataVersion===activation.catalogSha256)return Response.json({...validated.data,boundary:input.boundary},{headers:JSON_HEADERS});
    }
  }catch{/* a corrupt cache entry is recalculated from the active administrative aggregate */}
  const reservation=await reservePopulationQuery(services,now);
  if(!reservation.ok)return fail(429,'quota_exceeded',{retryAfter:reservation.retryAfter});
  activeQueries++;
  const controller=new AbortController(),abort=()=>controller.abort();
  if(request.signal.aborted)controller.abort();
  request.signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(),services.timeoutMs??POPULATION_TIMEOUT_MS);
  try{
    const result=await calculatePopulationFromAdminAggregate({bucket:services.bucket,cache:services.cache,origin:new URL(request.url).origin,countryCode:input.countryCode,boundaryLayerId:input.boundaryLayerId,featureId:input.featureId,activation,signal:controller.signal});
    const coverage={status:result.noDataGridCells?'partial' as const:'complete' as const,validGridCells:result.validGridCells,intersectedGridCells:result.intersectedGridCells,noDataGridCells:result.noDataGridCells};
    const reply={status:'available' as const,geometryHash,dataVersion:result.dataVersion,countryCodes:[input.countryCode],population:result.population,areaKm2:geoAreaKm2,year:POPULATION_YEAR,edition:`${POPULATION_RELEASE}-v1` as const,resolution:POPULATION_RESOLUTION,units:'people_per_grid_cell' as const,method:POPULATION_METHOD,source:POPULATION_SOURCE,license:'CC-BY-4.0' as const,doi:'10.5258/SOTON/WP00839' as const,coverage,sourceDatasets:result.datasets,processingTimeMs:result.processingTimeMs};
    try{if(services.cache)await services.cache.put(key,Response.json(reply,{headers:{'Cache-Control':`public, max-age=${POPULATION_CACHE_TTL_SECONDS}`,'Content-Type':'application/json; charset=utf-8'}}));}catch{/* a cache write failure does not discard a verified aggregate */}
    return Response.json({...reply,boundary:input.boundary},{headers:JSON_HEADERS});
  }catch(error){return failed(error,controller.signal);}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);activeQueries--;}
}
