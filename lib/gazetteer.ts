import {z} from 'zod';
import countries from '../content/search/countries.json';
import manifest from '../content/search/manifest.json';
import {placeSchema,validatedPlaces,type SearchPlace} from './search-contract';
import {countryLabel,countryId,countryAliases,COUNTRY_EDITION} from './country-names';
export const normalizePlace=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const rowSchema=z.tuple([z.string().regex(/^\d+$/),z.string().min(1).max(200),z.string().regex(/^[A-Z]{2}$/),z.string().min(1).max(160),z.number().min(-180).max(180),z.number().min(-90).max(90),z.number().finite().nonnegative(),z.string(),z.array(z.string().max(200)).max(1000)]);
const allowed=new Set(manifest.allowedFeatures);
export const SEARCH_EDITION=manifest.version+'-'+manifest.sourceHashes['country-labels.geojson'].slice(0,8)+'-'+COUNTRY_EDITION;
export const SHARD_BYTES=2_500_000;
export async function shardPath(q:string){
 const prefix=[...normalizePlace(q)].slice(0,2).join('');
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(prefix));
 return '/gazetteer/'+manifest.version+'/'+new Uint8Array(hash)[0].toString(16).padStart(2,'0')+'.json';
}
function countryName(code:string,lang:string){return countryLabel(countryId(code),lang);}
const countryIndex=countries.flatMap(raw=>{const p=placeSchema.safeParse(raw);return p.success?[{place:p.data,aliases:[raw.name,raw.countryCode,...countryAliases(raw.countryCode)].map(normalizePlace)}]:[];});
export function searchCountries(q:string,lang:string):SearchPlace[]{
 const key=normalizePlace(q);return countryIndex.flatMap(({place,aliases})=>{
  const name=countryName(place.countryCode,lang);
  return aliases.some(a=>a.startsWith(key))?[{...place,name,countryName:name}]:[];
 });
}
// Positive feature-code whitelist is enforced again on cached/sharded records.
export function searchCities(input:unknown,q:string,lang:string,limit:number):SearchPlace[]{
 if(!Array.isArray(input)||input.length>30000)throw new Error('Invalid catalog shard');
 const key=normalizePlace(q),exact:SearchPlace[]=[],partial:SearchPlace[]=[];
 for(const value of input){if(!Array.isArray(value)||!Array.isArray(value[8])||!value[8].some((a:unknown)=>typeof a==='string'&&a.startsWith(key)))continue;const row=rowSchema.safeParse(value);if(!row.success)continue;const [id,name,code,region,lng,lat,,feature,aliases]=row.data;
  if(!allowed.has(feature)||!aliases.some(a=>a.startsWith(key)))continue;
  const p={id:'geonames-'+id,kind:'city' as const,name,countryCode:code,countryName:countryName(code,lang),region,lng,lat};
  (aliases.includes(key)?exact:partial).push(p);
 }
 return validatedPlaces([...exact,...partial].slice(0,100),limit);
}
export async function readShard(response:Response){
 if(!response.ok||!/^application\/json/i.test(response.headers.get('Content-Type')??''))throw new Error('Catalog unavailable');
 const reader=response.body?.getReader();if(!reader)throw new Error('Missing catalog');let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>SHARD_BYTES){await reader.cancel();throw new Error('Catalog budget exceeded');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
 return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
