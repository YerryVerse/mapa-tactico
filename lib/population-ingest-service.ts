import {adminLayersForCountry,populationCatalogSummary,populationCountryCodes,populationDataset,verifyPopulationCatalog} from './population-catalog';
import {verifyPopulationCountryObjects} from './population-raster-service';

const JSON_HEADERS={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
const MAX_JSON_BYTES=65_536;
const MAX_PART_BYTES=8*1024*1024;
const MAX_OBJECT_BYTES=10*1024*1024*1024;
const RELEASE='R2025A-v1';
const MIGRATION_NAME='0002_unknown_franklin_richards';
const KEY_PATTERN=/^population\/releases\/R2025A-v1\/([A-Z]{3})\/([0-9a-f]{64})\/(?:data\.bin|index\.bin|manifest\.json|aggregates\/[A-Z]{3}-ADM[012]-[A-Za-z0-9-]{3,80}\/[0-9a-f]{2}\.json|boundary-data\/[A-Z]{3}-ADM[012]-[A-Za-z0-9-]{3,80}\/(?:index\.json|display\.ndjson))$/;
type Services={db:D1Database;bucket:R2Bucket;secret?:string};
type IngestJob={object_key:string;upload_id:string;sha256:string;bytes:number;status:string};
type IngestPart={object_key:string;part_number:number;etag:string;sha256:string;bytes:number};

function reply(status:number,body:Record<string,unknown>){return Response.json(body,{status,headers:JSON_HEADERS});}
function digestHex(bytes:Uint8Array){
  const copy=Uint8Array.from(bytes);
  return crypto.subtle.digest('SHA-256',copy.buffer).then(value=>[...new Uint8Array(value)].map(byte=>byte.toString(16).padStart(2,'0')).join(''));
}
async function authorize(request:Request,secret:string){
  const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return false;
  const [expected,actual]=await Promise.all([digestHex(new TextEncoder().encode(secret)),digestHex(new TextEncoder().encode(token))]);
  let difference=0;for(let index=0;index<expected.length;index++)difference|=expected.charCodeAt(index)^actual.charCodeAt(index);
  return difference===0;
}
async function readBytes(request:Request,maxBytes:number){
  const declared=request.headers.get('Content-Length');
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))throw new Error('request_too_large');
  const reader=request.body?.getReader();if(!reader)throw new Error('missing_request_body');
  const chunks:Uint8Array[]=[];let length=0;
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new Error('request_too_large');}chunks.push(value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return bytes;
}
async function readJson(request:Request){
  const contentType=request.headers.get('Content-Type')??'';
  if(!/^application\/json(?:\s*;|$)/i.test(contentType))throw new Error('invalid_json');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(await readBytes(request,MAX_JSON_BYTES));
  return JSON.parse(text) as unknown;
}
function parseAssetKey(key:unknown){
  if(typeof key!=='string'||key.length>240)return undefined;
  const match=KEY_PATTERN.exec(key);return match?{key,countryCode:match[1],sourceSha256:match[2]}:undefined;
}
function isHash(value:unknown):value is string{return typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);}
function safeInteger(value:unknown,minimum=0,maximum=MAX_OBJECT_BYTES):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=minimum&&value<=maximum;}
function validUploadId(value:unknown):value is string{return typeof value==='string'&&value.length>=8&&value.length<=1024&&/^[A-Za-z0-9_-]+$/.test(value);}

async function runPopulationMigration(db:D1Database){
  const statements=[
    'CREATE TABLE IF NOT EXISTS `population_ingest_jobs` (`object_key` text PRIMARY KEY NOT NULL,`upload_id` text NOT NULL,`sha256` text NOT NULL,`bytes` integer NOT NULL,`status` text NOT NULL,`created_at` integer NOT NULL,`updated_at` integer NOT NULL)',
    'CREATE TABLE IF NOT EXISTS `population_ingest_parts` (`object_key` text NOT NULL,`part_number` integer NOT NULL,`etag` text NOT NULL,`sha256` text NOT NULL,`bytes` integer NOT NULL,PRIMARY KEY(`object_key`,`part_number`))',
    'CREATE TABLE IF NOT EXISTS `population_ingest_ready` (`country_code` text PRIMARY KEY NOT NULL,`dataset_id` text NOT NULL,`source_sha256` text NOT NULL,`manifest_key` text NOT NULL,`manifest_sha256` text NOT NULL,`updated_at` integer NOT NULL)'
  ];
  try{
    await db.prepare('CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)').run();
    const applied=await db.prepare('SELECT name FROM d1_migrations WHERE name=?').bind(`${MIGRATION_NAME}.sql`).first<{name:string}>();
    for(const sql of statements)await db.prepare(sql).run();
    if(!applied)await db.prepare('INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)').bind(`${MIGRATION_NAME}.sql`).run();
    return reply(200,{status:'applied',migration:`${MIGRATION_NAME}.sql`,tables:['population_ingest_jobs','population_ingest_parts','population_ingest_ready']});
  }catch{return reply(503,{status:'error',error:'ingest_migration_failed'});}
}

async function readParts(db:D1Database,key:string){
  const result=await db.prepare('SELECT object_key,part_number,etag,sha256,bytes FROM population_ingest_parts WHERE object_key=? ORDER BY part_number').bind(key).all<IngestPart>();
  return result.results??[];
}

async function startUpload(request:Request,services:Services){
  let raw:unknown;try{raw=await readJson(request);}catch{return reply(400,{status:'error',error:'invalid_import_request'});}
  if(!raw||typeof raw!=='object')return reply(400,{status:'error',error:'invalid_import_request'});
  const input=raw as Record<string,unknown>,asset=parseAssetKey(input.key);
  if(!asset||!isHash(input.sha256)||!safeInteger(input.bytes,1)||!await verifyPopulationCatalog())return reply(400,{status:'error',error:'invalid_import_request'});
  if(!populationDataset(asset.countryCode))return reply(404,{status:'error',error:'country_not_in_catalog'});
  const object=await services.bucket.head(asset.key);
  if(object){
    if(object.size!==input.bytes||object.customMetadata?.sha256!==input.sha256)return reply(409,{status:'error',error:'immutable_asset_conflict'});
    const now=Date.now();
    await services.db.prepare("INSERT INTO population_ingest_jobs(object_key,upload_id,sha256,bytes,status,created_at,updated_at) VALUES(?, 'completed-object', ?, ?, 'complete', ?, ?) ON CONFLICT(object_key) DO UPDATE SET status='complete',updated_at=excluded.updated_at WHERE population_ingest_jobs.sha256=excluded.sha256 AND population_ingest_jobs.bytes=excluded.bytes")
      .bind(asset.key,input.sha256,input.bytes,now,now).run();
    return reply(200,{status:'complete',key:asset.key,bytes:object.size,sha256:input.sha256});
  }
  const existing=await services.db.prepare('SELECT object_key,upload_id,sha256,bytes,status FROM population_ingest_jobs WHERE object_key=?').bind(asset.key).first<IngestJob>();
  if(existing){
    if(existing.sha256!==input.sha256||existing.bytes!==input.bytes)return reply(409,{status:'error',error:'immutable_asset_conflict'});
    if(existing.status==='complete')return reply(409,{status:'error',error:'completed_asset_missing'});
    return reply(200,{status:'uploading',key:asset.key,uploadId:existing.upload_id,partBytes:MAX_PART_BYTES,parts:await readParts(services.db,asset.key)});
  }
  const now=Date.now();
  try{
    const upload=await services.bucket.createMultipartUpload(asset.key,{httpMetadata:{contentType:asset.key.endsWith('.json')?'application/json':'application/octet-stream'},customMetadata:{sha256:input.sha256,bytes:String(input.bytes),release:RELEASE}});
    await services.db.prepare("INSERT INTO population_ingest_jobs(object_key,upload_id,sha256,bytes,status,created_at,updated_at) VALUES(?,?,?,?, 'uploading', ?, ?)")
      .bind(asset.key,upload.uploadId,input.sha256,input.bytes,now,now).run();
    return reply(201,{status:'uploading',key:asset.key,uploadId:upload.uploadId,partBytes:MAX_PART_BYTES,parts:[]});
  }catch{return reply(503,{status:'error',error:'multipart_start_failed'});}
}

async function uploadPart(request:Request,services:Services){
  const key=parseAssetKey(request.headers.get('X-Population-Key')),
    uploadId=request.headers.get('X-Population-Upload-Id'),partNumber=Number(request.headers.get('X-Population-Part-Number')),
    expectedHash=request.headers.get('X-Population-Part-SHA256'),expectedBytes=Number(request.headers.get('X-Population-Part-Bytes'));
  if(!key||!validUploadId(uploadId)||!Number.isSafeInteger(partNumber)||partNumber<1||partNumber>10_000||!isHash(expectedHash)||!safeInteger(expectedBytes,1,MAX_PART_BYTES)||request.headers.get('Content-Type')!=='application/octet-stream')return reply(400,{status:'error',error:'invalid_import_part'});
  const job=await services.db.prepare('SELECT object_key,upload_id,sha256,bytes,status FROM population_ingest_jobs WHERE object_key=?').bind(key.key).first<IngestJob>();
  if(!job||job.status!=='uploading'||job.upload_id!==uploadId)return reply(409,{status:'error',error:'upload_session_unavailable'});
  let bytes:Uint8Array;try{bytes=await readBytes(request,MAX_PART_BYTES);}catch{return reply(413,{status:'error',error:'import_part_too_large'});}
  if(bytes.byteLength!==expectedBytes||await digestHex(bytes)!==expectedHash)return reply(422,{status:'error',error:'import_part_checksum_mismatch'});
  const saved=await services.db.prepare('SELECT object_key,part_number,etag,sha256,bytes FROM population_ingest_parts WHERE object_key=? AND part_number=?').bind(key.key,partNumber).first<IngestPart>();
  if(saved){
    if(saved.sha256!==expectedHash||saved.bytes!==expectedBytes)return reply(409,{status:'error',error:'part_retry_conflict'});
    return reply(200,{status:'uploaded',partNumber,etag:saved.etag,sha256:saved.sha256,bytes:saved.bytes,reused:true});
  }
  try{
    const part=await services.bucket.resumeMultipartUpload(key.key,uploadId).uploadPart(partNumber,bytes);
    await services.db.prepare('INSERT INTO population_ingest_parts(object_key,part_number,etag,sha256,bytes) VALUES(?,?,?,?,?)').bind(key.key,partNumber,part.etag,expectedHash,expectedBytes).run();
    return reply(201,{status:'uploaded',partNumber,etag:part.etag,sha256:expectedHash,bytes:expectedBytes,reused:false});
  }catch{return reply(503,{status:'error',error:'multipart_part_failed'});}
}

async function completeUpload(request:Request,services:Services){
  let raw:unknown;try{raw=await readJson(request);}catch{return reply(400,{status:'error',error:'invalid_import_request'});}
  if(!raw||typeof raw!=='object')return reply(400,{status:'error',error:'invalid_import_request'});
  const input=raw as Record<string,unknown>,asset=parseAssetKey(input.key);
  if(!asset||!isHash(input.sha256)||!safeInteger(input.bytes,1)||!validUploadId(input.uploadId))return reply(400,{status:'error',error:'invalid_import_request'});
  const job=await services.db.prepare('SELECT object_key,upload_id,sha256,bytes,status FROM population_ingest_jobs WHERE object_key=?').bind(asset.key).first<IngestJob>();
  if(!job||job.sha256!==input.sha256||job.bytes!==input.bytes||job.upload_id!==input.uploadId)return reply(409,{status:'error',error:'upload_session_unavailable'});
  const existing=await services.bucket.head(asset.key);
  if(existing&&existing.size===job.bytes&&existing.customMetadata?.sha256===job.sha256){
    await services.db.prepare("UPDATE population_ingest_jobs SET status='complete',updated_at=? WHERE object_key=?").bind(Date.now(),asset.key).run();
    return reply(200,{status:'complete',key:asset.key,bytes:existing.size,sha256:job.sha256,reused:true});
  }
  const parts=await readParts(services.db,asset.key);
  if(!parts.length||parts.some((part,index)=>part.part_number!==index+1)||parts.some((part,index)=>part.bytes<1||part.bytes>MAX_PART_BYTES||(index<parts.length-1&&part.bytes!==MAX_PART_BYTES))||parts.reduce((sum,part)=>sum+part.bytes,0)!==job.bytes)return reply(409,{status:'error',error:'upload_parts_incomplete'});
  try{
    const complete=await services.bucket.resumeMultipartUpload(asset.key,job.upload_id).complete(parts.map(({part_number,etag})=>({partNumber:part_number,etag})));
    const stored=await services.bucket.head(asset.key);
    if(!stored||stored.size!==job.bytes||stored.customMetadata?.sha256!==job.sha256||complete.size!==job.bytes)return reply(503,{status:'error',error:'completed_asset_verification_failed'});
    await services.db.prepare("UPDATE population_ingest_jobs SET status='complete',updated_at=? WHERE object_key=?").bind(Date.now(),asset.key).run();
    return reply(200,{status:'complete',key:asset.key,bytes:stored.size,sha256:job.sha256,reused:false});
  }catch{return reply(503,{status:'error',error:'multipart_complete_failed'});}
}

async function verifyCountry(request:Request,services:Services){
  let raw:unknown;try{raw=await readJson(request);}catch{return reply(400,{status:'error',error:'invalid_import_request'});}
  if(!raw||typeof raw!=='object'||typeof (raw as Record<string,unknown>).countryCode!=='string'||!isHash((raw as Record<string,unknown>).sourceSha256))return reply(400,{status:'error',error:'invalid_import_request'});
  const countryCode=String((raw as Record<string,unknown>).countryCode),sourceSha=String((raw as Record<string,unknown>).sourceSha256);
  if(!/^[A-Z]{3}$/.test(countryCode)||!populationDataset(countryCode))return reply(404,{status:'error',error:'country_not_in_catalog'});
  if(!await verifyPopulationCatalog())return reply(503,{status:'error',error:'catalog_incompatible'});
  const dataset=populationDataset(countryCode)!;
  const expectedManifestKeyPrefix=`population/releases/${RELEASE}/${countryCode}/`;
  const candidates=await services.db.prepare('SELECT object_key,upload_id,sha256,bytes,status,created_at,updated_at FROM population_ingest_jobs WHERE object_key LIKE ?').bind(`${expectedManifestKeyPrefix}%`).all<IngestJob & {created_at:number;updated_at:number}>();
  const completeJobs=new Map((candidates.results??[]).filter(job=>job.status==='complete').map(job=>[job.object_key,job]));
  const manifestKey=`${expectedManifestKeyPrefix}${sourceSha}/manifest.json`,manifestJob=completeJobs.get(manifestKey);
  if(!manifestJob)return reply(409,{status:'error',error:'country_manifest_upload_missing'});
  if(manifestJob.object_key!==manifestKey)return reply(409,{status:'error',error:'country_manifest_path_invalid'});
  const entry={manifestKey:manifestJob.object_key,manifestSha256:manifestJob.sha256,sourceSha256:sourceSha,datasetId:dataset.datasetId};
  let manifest;
  try{manifest=await verifyPopulationCountryObjects(services.bucket,countryCode,entry);}
  catch{return reply(422,{status:'error',error:'country_assets_invalid'});}
  if(manifest.datasetId!==dataset.datasetId||manifest.sourceSha256!==sourceSha)return reply(422,{status:'error',error:'country_assets_invalid'});
  const expectedLayers=adminLayersForCountry(countryCode).map(layer=>layer.boundaryId).sort();
  const actualLayers=manifest.administrativeAggregates.map(item=>item.boundaryLayerId).sort();
  if(JSON.stringify(expectedLayers)!==JSON.stringify(actualLayers))return reply(422,{status:'error',error:'country_aggregates_incomplete'});
  if((expectedLayers.length===0&&manifest.administrativeCoverage.status!=='unavailable')||(expectedLayers.length>0&&manifest.administrativeCoverage.status!=='available'))return reply(422,{status:'error',error:'country_administrative_coverage_mismatch'});
  if(manifest.administrativeCoverage.status==='available'&&manifest.administrativeCoverage.features!==manifest.administrativeAggregates.reduce((total,aggregate)=>total+aggregate.featureCount,0))return reply(422,{status:'error',error:'country_administrative_feature_count_mismatch'});
  const expected=new Map<string,{sha256:string;bytes:number}>();
  expected.set(entry.manifestKey,{sha256:entry.manifestSha256,bytes:manifestJob.bytes});
  expected.set(manifest.storage.data.key,manifest.storage.data);
  expected.set(manifest.storage.index.key,manifest.storage.index);
  for(const aggregate of manifest.administrativeAggregates){
    for(const shard of aggregate.shards)expected.set(shard.key,{sha256:shard.sha256,bytes:shard.bytes});
    if(aggregate.boundaryData){
      expected.set(aggregate.boundaryData.index.key,aggregate.boundaryData.index);
      expected.set(aggregate.boundaryData.display.key,aggregate.boundaryData.display);
    }
  }
  for(const [key,asset] of expected){
    const job=completeJobs.get(key);
    if(!job||job.sha256!==asset.sha256||job.bytes!==asset.bytes)return reply(409,{status:'error',error:'country_assets_incomplete',missingAsset:key});
  }
  if(completeJobs.size!==expected.size)return reply(409,{status:'error',error:'country_assets_manifest_mismatch'});
  const now=Date.now();
  await services.db.prepare('INSERT INTO population_ingest_ready(country_code,dataset_id,source_sha256,manifest_key,manifest_sha256,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(country_code) DO UPDATE SET dataset_id=excluded.dataset_id,source_sha256=excluded.source_sha256,manifest_key=excluded.manifest_key,manifest_sha256=excluded.manifest_sha256,updated_at=excluded.updated_at')
    .bind(countryCode,dataset.datasetId,sourceSha,entry.manifestKey,entry.manifestSha256,now).run();
  return reply(200,{status:'country_ready',countryCode,datasetId:dataset.datasetId,sourceSha256:sourceSha,manifestSha256:entry.manifestSha256,administrativeLayers:actualLayers.length,assets:expected.size});
}

async function activateRelease(services:Services){
  if(!await verifyPopulationCatalog())return reply(503,{status:'error',error:'catalog_incompatible'});
  const countries=populationCountryCodes();
  const ready=await services.db.prepare('SELECT country_code,dataset_id,source_sha256,manifest_key,manifest_sha256,updated_at FROM population_ingest_ready').all<{country_code:string;dataset_id:string;source_sha256:string;manifest_key:string;manifest_sha256:string;updated_at:number}>();
  const rows=ready.results??[],byCode=new Map(rows.map(row=>[row.country_code,row]));
  if(rows.length!==countries.length||countries.some(code=>!byCode.has(code)))return reply(409,{status:'error',error:'release_not_complete',readyCountries:rows.length,expectedCountries:countries.length});
  const activeCountries:Record<string,{manifestKey:string;manifestSha256:string;sourceSha256:string;datasetId:string}>={};
  for(const countryCode of countries){
    const row=byCode.get(countryCode)!,dataset=populationDataset(countryCode)!;
    if(row.dataset_id!==dataset.datasetId||!isHash(row.source_sha256)||!isHash(row.manifest_sha256)||row.manifest_key!==`population/releases/${RELEASE}/${countryCode}/${row.source_sha256}/manifest.json`)return reply(409,{status:'error',error:'release_manifest_mismatch',countryCode});
    activeCountries[countryCode]={manifestKey:row.manifest_key,manifestSha256:row.manifest_sha256,sourceSha256:row.source_sha256,datasetId:row.dataset_id};
  }
  const active={schemaVersion:1 as const,release:RELEASE,year:2025,resolution:'100m',catalogSha256:populationCatalogSummary.manifestSha256,countries:activeCountries};
  const activeBytes=new TextEncoder().encode(JSON.stringify(active));
  const previousObject=await services.bucket.get('population/active.json');
  if(previousObject){
    const previousBytes=new Uint8Array(await previousObject.arrayBuffer());
    let same=false;try{const previous=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(previousBytes)) as {catalogSha256?:string;countries?:unknown};same=previous.catalogSha256===active.catalogSha256&&JSON.stringify(previous.countries)===JSON.stringify(active.countries);}catch{/* invalid prior activation is retained under history before replacement */}
    if(same)return reply(200,{status:'already_active',release:RELEASE,year:2025,countries:countries.length,catalogSha256:active.catalogSha256});
    const priorSha=await digestHex(previousBytes),historyKey=`population/activation-history/${priorSha}.json`;
    if(!await services.bucket.head(historyKey))await services.bucket.put(historyKey,previousBytes,{httpMetadata:{contentType:'application/json; charset=utf-8'},customMetadata:{sha256:priorSha}});
  }
  const activeSha=await digestHex(activeBytes);
  await services.bucket.put('population/active.json',activeBytes,{httpMetadata:{contentType:'application/json; charset=utf-8'},customMetadata:{sha256:activeSha,release:RELEASE}});
  const saved=await services.bucket.head('population/active.json');
  if(!saved||saved.size!==activeBytes.byteLength||saved.customMetadata?.sha256!==activeSha)return reply(503,{status:'error',error:'activation_verification_failed'});
  return reply(200,{status:'activated',release:RELEASE,year:2025,countries:countries.length,catalogSha256:active.catalogSha256,activeSha256:activeSha,previousActivationPreserved:Boolean(previousObject)});
}

export async function populationIngestResponse(request:Request,services:Services){
  if(request.method!=='POST')return reply(405,{status:'error',error:'method_not_allowed'});
  if(!services.secret||!await authorize(request,services.secret))return reply(404,{status:'error',error:'not_found'});
  const action=new URL(request.url).searchParams.get('action');
  if(action==='migrate')return runPopulationMigration(services.db);
  if(action==='activate')return activateRelease(services);
  if(action==='part')return uploadPart(request,services);
  if(action==='start')return startUpload(request,services);
  if(action==='complete')return completeUpload(request,services);
  if(action==='verify-country')return verifyCountry(request,services);
  return reply(404,{status:'error',error:'not_found'});
}
