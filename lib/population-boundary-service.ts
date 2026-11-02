import {z} from 'zod';
import {adminLayer,adminLayerById,verifyPopulationCatalog} from './population-catalog';
import {geometryVertexCount,populationAdminBoundaryGeometrySchema,POPULATION_ADMIN_DISPLAY_MAX_POLYGONS,POPULATION_ADMIN_DISPLAY_MAX_VERTICES,POPULATION_ADMIN_MAX_VERTICES} from './population-contract';
import {loadActivePopulationCountryManifest} from './population-raster-service';
import {populationAdminAggregateResponse} from './population-service';
import {countryAliases} from './country-names';
import {populationCountryAlpha2} from './population-country-code';

const JSON_HEADERS={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
const MAX_BOUNDARY_FILE_BYTES=12_000_000;
const MAX_BOUNDARY_FEATURES=100_000;
const BOUNDARY_FETCH_TIMEOUT_MS=12_000;
const boundarySearchSchema=z.object({countryCode:z.string().regex(/^[A-Z]{3}$/),level:z.enum(['ADM0','ADM1','ADM2']),q:z.string().min(2).max(160).refine(text=>!/[\u0000-\u001f\u007f]/.test(text)).transform(text=>text.trim()).pipe(z.string().min(2))}).strict();
const boundarySelectionSchema=z.object({boundaryLayerId:z.string().regex(/^[A-Z]{3}-ADM[012]-[A-Za-z0-9-]{3,80}$/),featureId:z.string().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/)}).strict();
type BoundaryLayer=NonNullable<ReturnType<typeof adminLayerById>>;
type BoundaryFeature={type:'Feature';properties:Record<string,unknown>;geometry:unknown};
type BoundaryIndexFeature={featureId:string;name:string;aliases:string[];geometryType:'Polygon'|'MultiPolygon';areaKm2:number;geometryOffset:number;geometryBytes:number;geometrySha256:string;geometrySimplified:boolean;sourceVertices:number;displayVertices:number;displayToleranceDegrees:number};
type BoundaryIndex={features:BoundaryIndexFeature[];displayKey:string;displayBytes:number};
type BoundaryServices={db?:D1Database;bucket?:R2Bucket;cache?:Cache;fetcher?:(input:string|URL,init?:RequestInit)=>Promise<Response>;now?:()=>number};

function fail(status:number,error:string){return Response.json({status:error==='boundary_not_available'?'no_coverage':'error',error},{status,headers:JSON_HEADERS});}
function normalizeName(value:string){return value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
async function readText(response:Request|Response,maxBytes:number){
  const declared=Number(response.headers.get('Content-Length'));
  if(Number.isFinite(declared)&&declared>maxBytes)throw new Error('boundary_too_large');
  const reader=response.body?.getReader();if(!reader)throw new Error('missing_boundary_body');
  const chunks:Uint8Array[]=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new Error('boundary_too_large');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
async function readBoundaryLayer(layer:BoundaryLayer,origin:string,services:BoundaryServices,signal?:AbortSignal){
  const url=new URL(layer.geoJsonUrl);
  if(url.protocol!=='https:'||url.hostname!=='github.com'||!url.pathname.startsWith('/wmgeolab/geoBoundaries/raw/'))throw new Error('boundary_url_incompatible');
  const key=new Request(new URL(`/__population-boundaries/${encodeURIComponent(layer.boundaryId)}`,origin));
  let response=await services.cache?.match(key);
  if(!response){
    const controller=new AbortController();
    if(signal?.aborted)controller.abort();
    const cancel=()=>controller.abort();
    signal?.addEventListener('abort',cancel,{once:true});
    const timer=setTimeout(()=>controller.abort(),BOUNDARY_FETCH_TIMEOUT_MS);
    try{response=await (services.fetcher??fetch)(url,{headers:{Accept:'application/geo+json, application/json'},signal:controller.signal});}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
    if(!response.ok)throw new Error('boundary_provider_unavailable');
    const providerContentType=response.headers.get('Content-Type')??'';
    if(!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(providerContentType)&&!/^application\/octet-stream(?:\s*;|$)/i.test(providerContentType))throw new Error('boundary_provider_incompatible');
    const text=await readText(response,MAX_BOUNDARY_FILE_BYTES);
    response=new Response(text,{headers:{'Content-Type':'application/geo+json; charset=utf-8','Cache-Control':'public, max-age=604800'}});
    try{await services.cache?.put(key,response.clone());}catch{/* serving the validated provider response does not depend on cache availability */}
  }
  const contentType=response.headers.get('Content-Type')??'';
  if(!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(contentType))throw new Error('boundary_cache_incompatible');
  const raw=JSON.parse(await readText(response,MAX_BOUNDARY_FILE_BYTES)) as {type?:unknown;features?:unknown};
  if(raw.type!=='FeatureCollection'||!Array.isArray(raw.features)||raw.features.length>MAX_BOUNDARY_FEATURES)throw new Error('boundary_collection_incompatible');
  const features:BoundaryFeature[]=[];
  for(const candidate of raw.features){
    if(!candidate||typeof candidate!=='object')continue;
    const feature=candidate as Record<string,unknown>,properties=feature.properties;
    if(feature.type!=='Feature'||!properties||typeof properties!=='object'||!feature.geometry||typeof feature.geometry!=='object')continue;
    const props=properties as Record<string,unknown>;
    if(typeof props.shapeID!=='string'||typeof props.shapeName!=='string'||props.shapeGroup!==layer.countryCode||props.shapeType!==layer.level)continue;
    features.push({type:'Feature',properties:props,geometry:feature.geometry});
  }
  if(!features.length)throw new Error('boundary_features_missing');
  return features;
}
function boundaryInfo(layer:BoundaryLayer,feature:BoundaryFeature){
  const alternate=feature.properties.shapeNameAlt;
  return {
    boundaryLayerId:layer.boundaryId,
    featureId:String(feature.properties.shapeID),
    name:String(feature.properties.shapeName),
    countryCode:layer.countryCode,
    level:layer.level,
    boundaryYear:layer.boundaryYear,
    license:layer.license,
    source:layer.source,
    aliases:Array.isArray(alternate)?alternate.filter((value):value is string=>typeof value==='string').slice(0,10):typeof alternate==='string'?[alternate]:[]
  };
}
function indexedBoundaryInfo(layer:BoundaryLayer,feature:BoundaryIndexFeature){
  return {boundaryLayerId:layer.boundaryId,featureId:feature.featureId,name:feature.name,countryCode:layer.countryCode,level:layer.level,boundaryYear:layer.boundaryYear,license:layer.license,source:layer.source,aliases:feature.aliases};
}
function sha256Hex(bytes:Uint8Array){return crypto.subtle.digest('SHA-256',bytes.slice().buffer).then(digest=>Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''));}
async function readR2Bytes(object:R2ObjectBody,maxBytes:number){
  const expected=object.range&&'length' in object.range&&typeof object.range.length==='number'?object.range.length:object.size;
  if(expected>maxBytes)throw new Error('boundary_too_large');
  const bytes=new Uint8Array(await object.arrayBuffer());
  if(bytes.byteLength!==expected||bytes.byteLength>maxBytes)throw new Error('boundary_size_mismatch');
  return bytes;
}
async function indexedBoundaryLayer(layer:BoundaryLayer,origin:string,services:BoundaryServices):Promise<BoundaryIndex|undefined>{
  if(!services.bucket)return undefined;
  let manifest;
  try{manifest=await loadActivePopulationCountryManifest(services.bucket,layer.countryCode);}
  catch(error){if((error as {populationError?:string})?.populationError==='provider_unavailable')return undefined;throw error;}
  const aggregate=manifest?.administrativeAggregates.find(item=>item.boundaryLayerId===layer.boundaryId),assets=aggregate?.boundaryData;
  if(!aggregate||!assets)return undefined;
  const cacheKey=new Request(new URL(`/__population-boundary-index/${encodeURIComponent(layer.boundaryId)}/${assets.index.sha256}`,origin));
  let raw:Uint8Array|undefined;
  const cached=await services.cache?.match(cacheKey);
  if(cached){
    const bytes=new Uint8Array(await cached.arrayBuffer());
    if(bytes.byteLength===assets.index.bytes&&await sha256Hex(bytes)===assets.index.sha256)raw=bytes;
  }
  if(!raw){
    const object=await services.bucket.get(assets.index.key);
    if(!object)throw new Error('boundary_provider_unavailable');
    raw=await readR2Bytes(object,10_000_000);
    if(raw.byteLength!==assets.index.bytes||await sha256Hex(raw)!==assets.index.sha256)throw new Error('boundary_index_integrity_error');
    try{await services.cache?.put(cacheKey,new Response(raw.slice(),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=86400'}}));}catch{/* indexed boundary metadata remains readable without cache storage */}
  }
  let parsed:unknown;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw new Error('boundary_index_incompatible');}
  if(!parsed||typeof parsed!=='object')throw new Error('boundary_index_incompatible');
  const index=parsed as Record<string,unknown>,features=index.features;
  if(index.schemaVersion!==1||index.countryCode!==layer.countryCode||index.boundaryLayerId!==layer.boundaryId||index.boundaryYear!==layer.boundaryYear||index.boundarySourceSha256!==aggregate.sourceSha256||index.sourceBytes!==assets.sourceBytes||index.featureCount!==aggregate.featureCount||!Array.isArray(features)||features.length!==aggregate.featureCount)throw new Error('boundary_index_incompatible');
  const seen=new Set<string>();let expectedOffset=0;
  for(const rawFeature of features){
    if(!rawFeature||typeof rawFeature!=='object')throw new Error('boundary_index_incompatible');
    const feature=rawFeature as Record<string,unknown>;
    if(typeof feature.featureId!=='string'||! /^[A-Za-z0-9._:-]{1,160}$/.test(feature.featureId)||seen.has(feature.featureId)||typeof feature.name!=='string'||!feature.name.trim()||feature.name.length>240||!Array.isArray(feature.aliases)||feature.aliases.length>10||feature.aliases.some(alias=>typeof alias!=='string'||alias.length>240)||!['Polygon','MultiPolygon'].includes(String(feature.geometryType))||typeof feature.areaKm2!=='number'||!Number.isFinite(feature.areaKm2)||feature.areaKm2<=0||feature.areaKm2>510_065_621||
      !Number.isSafeInteger(feature.geometryOffset)||Number(feature.geometryOffset)!==expectedOffset||!Number.isSafeInteger(feature.geometryBytes)||Number(feature.geometryBytes)<2||Number(feature.geometryBytes)>2_000_000||Number(feature.geometryOffset)+Number(feature.geometryBytes)>assets.display.bytes||typeof feature.geometrySha256!=='string'||!/^[0-9a-f]{64}$/.test(feature.geometrySha256)||typeof feature.geometrySimplified!=='boolean'||!Number.isSafeInteger(feature.sourceVertices)||Number(feature.sourceVertices)<4||!Number.isSafeInteger(feature.displayVertices)||Number(feature.displayVertices)<4||Number(feature.displayVertices)>POPULATION_ADMIN_MAX_VERTICES||typeof feature.displayToleranceDegrees!=='number'||!Number.isFinite(feature.displayToleranceDegrees)||feature.displayToleranceDegrees<0)throw new Error('boundary_index_incompatible');
    seen.add(feature.featureId);
    expectedOffset+=Number(feature.geometryBytes);
  }
  if(expectedOffset!==assets.display.bytes)throw new Error('boundary_index_incompatible');
  return {features:features as BoundaryIndexFeature[],displayKey:assets.display.key,displayBytes:assets.display.bytes};
}
async function readIndexedBoundaryGeometry(services:BoundaryServices,index:BoundaryIndex,feature:BoundaryIndexFeature){
  if(!services.bucket)throw new Error('boundary_provider_unavailable');
  const object=await services.bucket.get(index.displayKey,{range:{offset:feature.geometryOffset,length:feature.geometryBytes}});
  if(!object)throw new Error('boundary_provider_unavailable');
  const bytes=await readR2Bytes(object,2_000_000);
  if(bytes.byteLength!==feature.geometryBytes||await sha256Hex(bytes)!==feature.geometrySha256)throw new Error('boundary_geometry_integrity_error');
  let record:unknown;try{record=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new Error('boundary_geometry_incompatible');}
  if(!record||typeof record!=='object'||(record as Record<string,unknown>).featureId!==feature.featureId||(record as Record<string,unknown>).geometry===undefined)throw new Error('boundary_geometry_incompatible');
  return (record as {geometry:unknown}).geometry;
}
function boundaryError(error:unknown){
  const text=String(error).toLowerCase();
  if(/too_large/.test(text))return {status:413,error:'boundary_layer_too_large'};
  if(/aborted|timeout/.test(text))return {status:503,error:'boundary_provider_timeout'};
  if(/unavailable|failed to fetch/.test(text))return {status:503,error:'boundary_provider_unavailable'};
  return {status:503,error:'boundary_provider_incompatible'};
}

export async function searchAdministrativeBoundaries(request:Request,services:BoundaryServices){
  if(request.method!=='GET')return fail(405,'boundary_query_failed');
  const url=new URL(request.url),params=url.searchParams;
  if([...params.keys()].some(key=>!['countryCode','level','q'].includes(key)))return fail(400,'invalid_boundary_query');
  const parsed=boundarySearchSchema.safeParse({countryCode:params.get('countryCode'),level:params.get('level'),q:params.get('q')});
  if(!parsed.success)return fail(400,'invalid_boundary_query');
  if(!await verifyPopulationCatalog())return fail(503,'boundary_provider_incompatible');
  const layer=adminLayer(parsed.data.countryCode,parsed.data.level);
  if(!layer)return fail(404,'boundary_not_available');
  try{
    const query=normalizeName(parsed.data.q),indexed=await indexedBoundaryLayer(layer,url.origin,services);
    const alpha2=populationCountryAlpha2(parsed.data.countryCode);
    const translatedCountryName=parsed.data.level==='ADM0'&&Boolean(alpha2)&&countryAliases(alpha2!).some(alias=>normalizeName(alias).startsWith(query));
    const candidates=indexed?indexed.features.flatMap(feature=>{
      const info=indexedBoundaryInfo(layer,feature),names=[info.name,...info.aliases].map(normalizeName);
      if(!names.some(name=>name.includes(query))&&!translatedCountryName)return [];
      return [{...info,geometryType:feature.geometryType,areaKm2:feature.areaKm2,geometrySimplified:feature.geometrySimplified}];
    }):(await readBoundaryLayer(layer,url.origin,services,request.signal)).flatMap(feature=>{
      const info=boundaryInfo(layer,feature),names=[info.name,...info.aliases].map(normalizeName);
      if(!names.some(name=>name.includes(query))&&!translatedCountryName)return [];
      return [{...info,geometryType:(feature.geometry as {type?:unknown}).type}];
    });
    const matches=candidates.sort((a,b)=>{
      const aName=normalizeName(a.name),bName=normalizeName(b.name),aRank=aName===query?0:aName.startsWith(query)?1:2,bRank=bName===query?0:bName.startsWith(query)?1:2;
      return aRank-bRank||a.name.localeCompare(b.name);
    }).slice(0,8);
    return Response.json({status:matches.length?'available':'no_match',provider:'geoBoundaries',releaseType:'gbOpen',results:matches},{headers:JSON_HEADERS});
  }catch(error){const issue=boundaryError(error);return fail(issue.status,issue.error);}
}

export async function populationAdminResponse(request:Request,services:BoundaryServices){
  if(request.method!=='POST')return fail(405,'boundary_query_failed');
  if(!services.db||!services.bucket)return fail(503,'population_provider_unavailable');
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')??''))return fail(415,'invalid_boundary_selection');
  let raw:string;try{raw=await readText(request,5_000);}catch{return fail(413,'invalid_boundary_selection');}
  let input:unknown;try{input=JSON.parse(raw);}catch{return fail(400,'invalid_boundary_selection');}
  const parsed=boundarySelectionSchema.safeParse(input);if(!parsed.success)return fail(400,'invalid_boundary_selection');
  if(!await verifyPopulationCatalog())return fail(503,'boundary_provider_incompatible');
  const layer=adminLayerById(parsed.data.boundaryLayerId);if(!layer)return fail(404,'boundary_not_available');
  let feature:BoundaryFeature|undefined,indexedFeature:BoundaryIndexFeature|undefined,geometryValue:unknown;
  try{
    const indexed=await indexedBoundaryLayer(layer,new URL(request.url).origin,services);
    if(indexed){
      indexedFeature=indexed.features.find(candidate=>candidate.featureId===parsed.data.featureId);
      if(!indexedFeature)return fail(404,'boundary_not_available');
      geometryValue=await readIndexedBoundaryGeometry(services,indexed,indexedFeature);
    }else{
      const features=await readBoundaryLayer(layer,new URL(request.url).origin,services,request.signal);
      feature=features.find(candidate=>candidate.properties.shapeID===parsed.data.featureId);
      if(!feature)return fail(404,'boundary_not_available');
      geometryValue=feature.geometry;
    }
  }catch(error){const issue=boundaryError(error);return fail(issue.status,issue.error);}
  const geometry=populationAdminBoundaryGeometrySchema.safeParse(geometryValue);
  if(!geometry.success)return fail(422,'invalid_boundary_geometry');
  if(geometryVertexCount(geometry.data)>POPULATION_ADMIN_MAX_VERTICES||new TextEncoder().encode(JSON.stringify(geometry.data)).byteLength>MAX_BOUNDARY_FILE_BYTES)return fail(413,'boundary_too_complex');
  if(indexedFeature&&((geometry.data as {type:string}).type!==indexedFeature.geometryType||geometryVertexCount(geometry.data)!==indexedFeature.displayVertices))return fail(503,'boundary_provider_incompatible');
  const info=indexedFeature?indexedBoundaryInfo(layer,indexedFeature):boundaryInfo(layer,feature!);
  const polygonCount=geometry.data.type==='Polygon'?1:geometry.data.coordinates.length,displayGeometry=geometryVertexCount(geometry.data)<=POPULATION_ADMIN_DISPLAY_MAX_VERTICES&&polygonCount<=POPULATION_ADMIN_DISPLAY_MAX_POLYGONS;
  const administrativeBoundary={...info,geometryType:geometry.data.type,geometryRole:'display_only',geometrySimplified:indexedFeature?.geometrySimplified??false,...(displayGeometry?{geometry:geometry.data}:{}),...(indexedFeature?{areaKm2:indexedFeature.areaKm2}: {})};
  return populationAdminAggregateResponse(request,{...services,db:services.db,bucket:services.bucket},{countryCode:layer.countryCode,boundaryLayerId:layer.boundaryId,featureId:parsed.data.featureId,geometry:geometry.data,areaKm2:indexedFeature?.areaKm2,boundary:administrativeBoundary});
}
