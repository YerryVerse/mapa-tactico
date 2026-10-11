import {searchCountries,searchCities,shardPath,readShard,SEARCH_EDITION} from './gazetteer';
import {searchQuerySchema,validatedPlaces} from './search-contract';
import {matchLanguage} from './languages';
import {message,type MessageKey} from './messages';
export const SEARCH_BUDGET=120;
export const SEARCH_CONCURRENCY=4;
// Bounds heap work within each isolate; the shared minute quota lives in D1.
let active=0;
type Services={db:D1Database;assetFetch:(request:Request)=>Promise<Response>;cache?:Cache;now?:()=>number};
export async function searchResponse(request:Request,services:Services){
 const url=new URL(request.url),headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
 const errorLanguage=matchLanguage(url.searchParams.get('lang')??'es')??'es';
 const errorKeys:Record<string,MessageKey>={invalid_query:'invalidQuery',quota_exceeded:'searchQuota',provider_unavailable:'searchUnavailable',provider_timeout:'searchTimeout'};
 const fail=(status:number,error:string,_message:string,retryAfter?:number)=>Response.json({error,message:message(errorLanguage,errorKeys[error]??'searchUnavailable'),...(retryAfter?{retryAfter}:{})},{status,headers:{...headers,...(retryAfter?{'Retry-After':String(retryAfter)}:{})}});
 const parsed=searchQuerySchema.safeParse({q:url.searchParams.get('q'),lang:url.searchParams.get('lang')??undefined,limit:url.searchParams.get('limit')??undefined});
 if(!parsed.success||[...url.searchParams.keys()].some(k=>!['q','lang','limit'].includes(k)))return fail(400,'invalid_query','Escribe un país o ciudad entre 2 y 160 caracteres, sin caracteres de control.');
 const {q,lang,limit}=parsed.data;let timer:ReturnType<typeof setTimeout>|undefined,admitted=false;
 try{
  const now=services.now?.()??Date.now(),window=Math.floor(now/60000);
  const budget=await services.db.prepare("INSERT INTO search_budget(id,window,hits) VALUES('global',?,1) ON CONFLICT(id) DO UPDATE SET window=excluded.window,hits=CASE WHEN search_budget.window=excluded.window THEN search_budget.hits+1 ELSE 1 END WHERE search_budget.window<>excluded.window OR search_budget.hits<? RETURNING hits").bind(window,SEARCH_BUDGET).first<{hits:number}>();
  if(!budget)return fail(429,'quota_exceeded','Se alcanzó el límite de búsquedas. Espera un momento y vuelve a buscar.',60-Math.floor(now/1000)%60);
  if(active>=SEARCH_CONCURRENCY)return fail(429,'quota_exceeded','El buscador está ocupado. Espera un momento y vuelve a buscar.',1);
  active++;admitted=true;
  const cacheKey=new Request(new URL('/__search-cache/'+SEARCH_EDITION+'?'+new URLSearchParams({q:q.toLowerCase(),lang,limit:String(limit)}),url.origin));
  const cached=await services.cache?.match(cacheKey);
  if(cached){const data=await cached.json() as {results?:unknown};const results=validatedPlaces(data.results,limit);return Response.json({results},{headers});}
  const controller=new AbortController();
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Catalog timeout'));},5000);});
  const cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});
  const countries=searchCountries(q,lang);
  const lookup=async()=>{const response=await services.assetFetch(new Request(new URL(await shardPath(q),url.origin),{signal:controller.signal}));return searchCities(await readShard(response),q,lang,limit);};
  let cities;try{cities=await Promise.race([lookup(),timeout]);}finally{request.signal.removeEventListener('abort',cancel);}
  if(request.signal.aborted)return fail(408,'provider_timeout','Búsqueda cancelada. Vuelve a buscar.');
  const results=validatedPlaces([...countries,...cities].slice(0,100),limit);
  await services.cache?.put(cacheKey,Response.json({results},{headers:{'Cache-Control':'public,max-age=3600'}}));
  return Response.json({results},{headers});
 }catch{return fail(503,'provider_unavailable','No se pudo consultar el catálogo. Vuelve a buscar o elige una ubicación en el mapa.');}
 finally{if(timer)clearTimeout(timer);if(admitted)active--;}
}
