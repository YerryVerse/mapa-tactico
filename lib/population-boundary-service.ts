import {area as geodesicArea} from '@turf/area';
import {booleanValid} from '@turf/boolean-valid';
import {z} from 'zod';
import {adminLayer,adminLayerById,verifyPopulationCatalog} from './population-catalog';
import {populationGeometrySchema,POPULATION_MAX_BODY_BYTES,POPULATION_MAX_VERTICES,type PopulationGeometry} from './population-contract';
import {geometryVertexCount} from './population-contract';
import {populationAreaResponse} from './population-service';

const JSON_HEADERS={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
const MAX_BOUNDARY_FILE_BYTES=12_000_000;
const MAX_BOUNDARY_FEATURES=100_000;
const BOUNDARY_FETCH_TIMEOUT_MS=12_000;
const boundarySearchSchema=z.object({countryCode:z.string().regex(/^[A-Z]{3}$/),level:z.enum(['ADM0','ADM1','ADM2']),q:z.string().min(2).max(160).refine(text=>!/[\u0000-\u001f\u007f]/.test(text)).transform(text=>text.trim()).pipe(z.string().min(2))}).strict();
const boundarySelectionSchema=z.object({boundaryLayerId:z.string().regex(/^[A-Z]{3}-ADM[012]-[A-Za-z0-9-]{3,80}$/),featureId:z.string().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/)}).strict();
type BoundaryLayer=NonNullable<ReturnType<typeof adminLayerById>>;
type BoundaryFeature={type:'Feature';properties:Record<string,unknown>;geometry:unknown};
type BoundaryServices={db?:D1Database;cache?:Cache;fetcher?:(input:string|URL,init?:RequestInit)=>Promise<Response>;now?:()=>number};

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
    const features=await readBoundaryLayer(layer,url.origin,services,request.signal),query=normalizeName(parsed.data.q);
    const matches=features.flatMap(feature=>{
      const info=boundaryInfo(layer,feature),names=[info.name,...info.aliases].map(normalizeName);
      if(!names.some(name=>name.includes(query)))return [];
      return [{...info,geometryType:(feature.geometry as {type?:unknown}).type}];
    }).sort((a,b)=>{
      const aName=normalizeName(a.name),bName=normalizeName(b.name),aRank=aName===query?0:aName.startsWith(query)?1:2,bRank=bName===query?0:bName.startsWith(query)?1:2;
      return aRank-bRank||a.name.localeCompare(b.name);
    }).slice(0,8);
    return Response.json({status:matches.length?'available':'no_match',provider:'geoBoundaries',releaseType:'gbOpen',results:matches},{headers:JSON_HEADERS});
  }catch(error){const issue=boundaryError(error);return fail(issue.status,issue.error);}
}

export async function populationAdminResponse(request:Request,services:BoundaryServices){
  if(request.method!=='POST')return fail(405,'boundary_query_failed');
  if(!services.db)return fail(503,'population_provider_unavailable');
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')??''))return fail(415,'invalid_boundary_selection');
  let raw:string;try{raw=await readText(request,5_000);}catch{return fail(413,'invalid_boundary_selection');}
  let input:unknown;try{input=JSON.parse(raw);}catch{return fail(400,'invalid_boundary_selection');}
  const parsed=boundarySelectionSchema.safeParse(input);if(!parsed.success)return fail(400,'invalid_boundary_selection');
  if(!await verifyPopulationCatalog())return fail(503,'boundary_provider_incompatible');
  const layer=adminLayerById(parsed.data.boundaryLayerId);if(!layer)return fail(404,'boundary_not_available');
  let feature:BoundaryFeature;
  try{
    const features=await readBoundaryLayer(layer,new URL(request.url).origin,services,request.signal);
    const found=features.find(candidate=>candidate.properties.shapeID===parsed.data.featureId);
    if(!found)return fail(404,'boundary_not_available');
    feature=found;
  }catch(error){const issue=boundaryError(error);return fail(issue.status,issue.error);}
  const geometry=populationGeometrySchema.safeParse(feature.geometry);
  if(!geometry.success||!booleanValid(geometry.data))return fail(422,'invalid_boundary_geometry');
  if(geometryVertexCount(geometry.data)>POPULATION_MAX_VERTICES||new TextEncoder().encode(JSON.stringify(geometry.data)).byteLength>POPULATION_MAX_BODY_BYTES)return fail(413,'boundary_too_complex');
  const administrativeBoundary=boundaryInfo(layer,feature);
  const internal=new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({geometry:geometry.data,countryCodes:[layer.countryCode]}),signal:request.signal});
  const population=await populationAreaResponse(internal,{...services,db:services.db});
  let reply:unknown;try{reply=await population.json();}catch{return fail(503,'population_provider_unavailable');}
  return Response.json({...(reply as Record<string,unknown>),boundary:{...administrativeBoundary,geometry:geometry.data}},{status:population.status,headers:JSON_HEADERS});
}
