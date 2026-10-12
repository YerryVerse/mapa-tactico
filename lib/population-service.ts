import {area as geodesicArea} from '@turf/area';
import {booleanValid} from '@turf/boolean-valid';
import {verifyPopulationGeometryRuntime} from './population-geometry';
import {canonicalGeometryKey,populationAreaQuerySchema,populationReplySchema,POPULATION_API,POPULATION_CACHE_TTL_SECONDS,POPULATION_DAILY_CALL_BUDGET,POPULATION_MAX_AREA_KM2,POPULATION_MAX_BODY_BYTES,POPULATION_METHOD,POPULATION_RELEASE,POPULATION_RESOLUTION,POPULATION_SOURCE,POPULATION_TIMEOUT_MS,POPULATION_YEAR,type PopulationError} from './population-contract';
import {admin0Layer,populationDataset,populationEdition,verifyPopulationCatalog} from './population-catalog';

const JSON_HEADERS={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
const WORLDPOP_DATA_SOURCE='worldpop_R2025A_2025_100m';
const UPSTREAM_BODY_BYTES=131_072;
const POLL_DELAYS=[200,400,800,1_200,1_800,2_500,3_500,4_500];
let activeQueries=0;
type Services={
  db:D1Database;
  cache?:Cache;
  fetcher?:(input:string|URL,init?:RequestInit)=>Promise<Response>;
  now?:()=>number;
  maxDailyCalls?:number;
};

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
async function readJson(response:Response,maxBytes=UPSTREAM_BODY_BYTES){
  if(!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(response.headers.get('Content-Type')??''))throw new Error('unexpected_content_type');
  return JSON.parse(await readBoundedText(response,maxBytes)) as unknown;
}
async function reserveUpstreamCall(services:Services,now:number){
  const utcDay=Math.floor(now/86_400_000),max=services.maxDailyCalls??POPULATION_DAILY_CALL_BUDGET;
  const row=await services.db.prepare("INSERT INTO population_budget(id,utc_day,hits) VALUES('global',?,1) ON CONFLICT(id) DO UPDATE SET utc_day=excluded.utc_day,hits=CASE WHEN population_budget.utc_day=excluded.utc_day THEN population_budget.hits+1 ELSE 1 END WHERE population_budget.utc_day<>excluded.utc_day OR population_budget.hits<? RETURNING hits")
    .bind(utcDay,max).first<{hits:number}>();
  if(row)return {ok:true as const};
  return {ok:false as const,retryAfter:86_400-Math.floor(now/1000)%86_400};
}
function wait(ms:number,signal:AbortSignal){
  return new Promise<void>((resolve,reject)=>{
    if(signal.aborted){reject(new Error('aborted'));return;}
    const finish=()=>{signal.removeEventListener('abort',abort);resolve();};
    const timer=setTimeout(finish,ms);
    const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(new Error('aborted'));};
    signal.addEventListener('abort',abort,{once:true});
  });
}
function upstreamError(error:unknown):PopulationError{
  const text=String(error).toLowerCase();
  if(/no data|no coverage|not covered/.test(text))return 'no_coverage';
  if(/invalid geojson|invalid geometry/.test(text))return 'invalid_geometry';
  return 'query_failed';
}

async function calculateWithWorldPop(geometry:unknown,services:Services,signal:AbortSignal,now:number){
  const fetcher=services.fetcher??fetch;
  const call=async(url:string,init:RequestInit)=>{
    const reservation=await reserveUpstreamCall(services,services.now?.()??now);
    if(!reservation.ok)throw Object.assign(new Error('quota_exceeded'),{populationError:'quota_exceeded' as const,retryAfter:reservation.retryAfter});
    return fetcher(url,{...init,signal});
  };
  const submit=await call(`${POPULATION_API}/population`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({geojson:geometry,year:POPULATION_YEAR,resolution:POPULATION_RESOLUTION})});
  if(submit.status===429)throw Object.assign(new Error('quota_exceeded'),{populationError:'quota_exceeded' as const,retryAfter:Number(submit.headers.get('Retry-After'))||3600});
  if(!submit.ok)throw Object.assign(new Error(`worldpop_submit_${submit.status}`),{populationError:'provider_unavailable' as const});
  let submitted:Record<string,unknown>;
  try{submitted=await readJson(submit) as Record<string,unknown>;}catch{throw Object.assign(new Error('invalid_submit_response'),{populationError:'provider_incompatible' as const});}
  const taskId=submitted.task_id;
  if(typeof taskId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskId))throw Object.assign(new Error('invalid_task_id'),{populationError:'provider_incompatible' as const});
  for(const delay of POLL_DELAYS){
    await wait(delay,signal);
    const statusResponse=await call(`${POPULATION_API}/tasks/${taskId}`,{headers:{Accept:'application/json'}});
    if(statusResponse.status===429)throw Object.assign(new Error('quota_exceeded'),{populationError:'quota_exceeded' as const,retryAfter:Number(statusResponse.headers.get('Retry-After'))||3600});
    if(!statusResponse.ok)throw Object.assign(new Error(`worldpop_task_${statusResponse.status}`),{populationError:'provider_unavailable' as const});
    let task:Record<string,unknown>;
    try{task=await readJson(statusResponse) as Record<string,unknown>;}catch{throw Object.assign(new Error('invalid_task_response'),{populationError:'provider_incompatible' as const});}
    if(task.status==='failure')throw Object.assign(new Error(typeof task.error==='string'?task.error:'provider_task_failed'),{populationError:upstreamError(task.error) as PopulationError});
    if(task.status==='success'){
      const result=task.result as Record<string,unknown>|null;
      if(!result||typeof result!=='object'||typeof result.total_population!=='number'||!Number.isFinite(result.total_population)||result.total_population<0||typeof result.area_km2!=='number'||!Number.isFinite(result.area_km2)||result.area_km2<=0||result.area_km2>POPULATION_MAX_AREA_KM2||result.data_year!==POPULATION_YEAR||result.data_source!==WORLDPOP_DATA_SOURCE||typeof result.processing_time_ms!=='number'||!Number.isFinite(result.processing_time_ms)||result.processing_time_ms<0)throw Object.assign(new Error('worldpop_result_incompatible'),{populationError:'provider_incompatible' as const});
      return {population:result.total_population,areaKm2:result.area_km2,processingTimeMs:Math.round(result.processing_time_ms)};
    }
    if(!['pending','running','processing'].includes(String(task.status)))throw Object.assign(new Error('worldpop_task_status_incompatible'),{populationError:'provider_incompatible' as const});
  }
  throw Object.assign(new Error('worldpop_timeout'),{populationError:'provider_timeout' as const});
}

export async function populationAreaResponse(request:Request,services:Services){
  const now=services.now?.()??Date.now();
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
  const unknownCountries=query.countryCodes.filter(code=>!admin0Layer(code));
  if(unknownCountries.length)return fail(422,'no_coverage',{unsupportedCountryCodes:unknownCountries});
  const unsupported=query.countryCodes.filter(code=>!populationDataset(code));
  if(unsupported.length){
    const hasSupported=query.countryCodes.some(code=>Boolean(populationDataset(code)));
    return fail(422,hasSupported?'partial_coverage':'no_coverage',{unsupportedCountryCodes:unsupported});
  }
  if(!await verifyPopulationCatalog())return fail(503,'provider_incompatible');
  if(activeQueries>=4)return fail(429,'quota_exceeded',{retryAfter:1});
  const countryCodes=query.countryCodes.slice().sort();
  const hash=await digest(`${populationEdition}\n${POPULATION_SOURCE}\npeople_per_grid_cell\n${POPULATION_METHOD}\n${countryCodes.join(',')}\n${canonicalGeometryKey(query.geometry)}`);
  const key=cacheRequest(new URL(request.url).origin,hash);
  try{
    const cached=await services.cache?.match(key);
    if(cached){const body=await readJson(cached);const validated=populationReplySchema.safeParse(body);if(validated.success&&validated.data.status==='available'&&validated.data.geometryHash===hash&&validated.data.edition===`${POPULATION_RELEASE}-v1`)return Response.json(validated.data,{headers:JSON_HEADERS});}
  }catch{/* a corrupt cache entry is ignored and replaced by a new provider response */}
  activeQueries++;
  const controller=new AbortController(),abort=()=>controller.abort();
  let timedOut=false;
  if(request.signal.aborted)controller.abort();
  request.signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},POPULATION_TIMEOUT_MS);
  try{
    const result=await calculateWithWorldPop(query.geometry,services,controller.signal,now);
    const reply={status:'available' as const,geometryHash:hash,countryCodes, population:result.population,areaKm2:result.areaKm2,year:POPULATION_YEAR,edition:`${POPULATION_RELEASE}-v1` as const,resolution:POPULATION_RESOLUTION,units:'people_per_grid_cell' as const,method:POPULATION_METHOD,source:POPULATION_SOURCE,license:'CC-BY-4.0' as const,doi:'10.5258/SOTON/WP00839' as const,coverage:'country_dataset_available_fraction_unreported' as const,processingTimeMs:result.processingTimeMs};
    try{if(services.cache)await services.cache.put(key,Response.json(reply,{headers:{'Cache-Control':`public, max-age=${POPULATION_CACHE_TTL_SECONDS}`,'Content-Type':'application/json; charset=utf-8'}}));}catch{/* a cache write failure must not discard a valid provider result */}
    return Response.json(reply,{headers:JSON_HEADERS});
  }catch(error){
    const populationError=(error as {populationError?:PopulationError}).populationError??(timedOut?'provider_timeout':request.signal.aborted?'provider_timeout':'provider_unavailable');
    const retryAfter=(error as {retryAfter?:number}).retryAfter;
    return fail(populationError==='quota_exceeded'?429:populationError==='invalid_geometry'?400:populationError==='no_coverage'||populationError==='partial_coverage'?422:503,populationError,retryAfter?{retryAfter}:{});
  }finally{
    clearTimeout(timer);request.signal.removeEventListener('abort',abort);activeQueries--;
  }
}
