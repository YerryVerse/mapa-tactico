import {describe,it,expect,vi} from 'vitest';
import {populationIngestResponse} from '../../lib/population-ingest-service';

const secret='operator-secret-for-tests-only';
const sha256=async(bytes:Uint8Array)=>{
  const copy=Uint8Array.from(bytes),digest=await crypto.subtle.digest('SHA-256',copy.buffer);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
};

function database(){
  const jobs=new Map<string,Record<string,any>>(),parts=new Map<string,Record<string,any>>();
  const prepare=vi.fn((sql:string)=>({bind:(...values:unknown[])=>({
    first:async()=>{
      if(sql.startsWith('SELECT name FROM d1_migrations'))return null;
      if(sql.includes('FROM population_ingest_jobs WHERE object_key=?'))return jobs.get(String(values[0]))??null;
      if(sql.includes('FROM population_ingest_parts WHERE object_key=? AND part_number=?'))return parts.get(`${values[0]}:${values[1]}`)??null;
      return null;
    },
    all:async()=>{
      if(sql.includes('FROM population_ingest_parts WHERE object_key=?'))return {results:[...parts.values()].filter(part=>part.object_key===values[0]).sort((a,b)=>a.part_number-b.part_number)};
      return {results:[]};
    },
    run:async()=>{
      if(sql.includes('INSERT INTO population_ingest_jobs')){
        if(sql.includes("'completed-object'")){const [objectKey,hash,bytes,createdAt,updatedAt]=values;jobs.set(String(objectKey),{object_key:objectKey,upload_id:'completed-object',sha256:hash,bytes,status:'complete',created_at:createdAt,updated_at:updatedAt});}
        else{const [objectKey,uploadId,hash,bytes,createdAt,updatedAt]=values;jobs.set(String(objectKey),{object_key:objectKey,upload_id:uploadId,sha256:hash,bytes,status:'uploading',created_at:createdAt,updated_at:updatedAt});}
      }else if(sql.startsWith('INSERT INTO population_ingest_parts')){
        const [objectKey,partNumber,etag,hash,bytes]=values;parts.set(`${objectKey}:${partNumber}`,{object_key:objectKey,part_number:partNumber,etag,sha256:hash,bytes});
      }else if(sql.startsWith('UPDATE population_ingest_jobs')){
        const [,objectKey]=values;const job=jobs.get(String(objectKey));if(job)job.status='complete';
      }
      return {success:true};
    }
  })}));
  return {db:{prepare} as unknown as D1Database,prepare,jobs,parts};
}

function bucket(){
  const stored=new Map<string,{bytes:Uint8Array;customMetadata:Record<string,string>}>(),uploads=new Map<string,{key:string;metadata:Record<string,string>;parts:Map<number,Uint8Array>}>();
  let uploadSequence=0;
  const createUpload=(key:string,uploadId:string,metadata:Record<string,string>)=>({
    key,uploadId,
    uploadPart:async(partNumber:number,value:ArrayBuffer|ArrayBufferView|string|Blob|ReadableStream)=>{
      const upload=uploads.get(uploadId);if(!upload)throw new Error('missing upload');
      const bytes=value instanceof Uint8Array?Uint8Array.from(value):value instanceof ArrayBuffer?new Uint8Array(value):new Uint8Array(await new Response(value as BodyInit).arrayBuffer());
      upload.parts.set(partNumber,bytes);return {partNumber,etag:`etag-${partNumber}-${bytes.byteLength}`};
    },
    complete:async(parts:Array<{partNumber:number;etag:string}>)=>{
      const upload=uploads.get(uploadId);if(!upload)throw new Error('missing upload');
      const buffers=parts.map(part=>upload.parts.get(part.partNumber)!);const length=buffers.reduce((sum,item)=>sum+item.byteLength,0);const bytes=new Uint8Array(length);let offset=0;for(const item of buffers){bytes.set(item,offset);offset+=item.byteLength;}
      stored.set(key,{bytes,customMetadata:metadata});uploads.delete(uploadId);return {key,size:length};
    },
    abort:async()=>{uploads.delete(uploadId);}
  });
  const r2={
    head:async(key:string)=>{const object=stored.get(key);return object?{key,size:object.bytes.byteLength,customMetadata:object.customMetadata}:null;},
    get:async()=>null,
    put:async(key:string,value:BodyInit,options?:R2PutOptions)=>{const bytes=new Uint8Array(await new Response(value).arrayBuffer());const customMetadata=options?.customMetadata??{};stored.set(key,{bytes,customMetadata});return {key,size:bytes.byteLength};},
    createMultipartUpload:async(key:string,options?:R2MultipartOptions)=>{const uploadId=`upload_${String(++uploadSequence).padStart(7,'0')}${'x'.repeat(329)}`;const metadata=options?.customMetadata??{};uploads.set(uploadId,{key,metadata,parts:new Map()});return createUpload(key,uploadId,metadata);},
    resumeMultipartUpload:(key:string,uploadId:string)=>createUpload(key,uploadId,uploads.get(uploadId)?.metadata??{})
  };
  return {bucket:r2 as unknown as R2Bucket,stored,uploads};
}

function authenticatedRequest(url:string,init:RequestInit={}){
  const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${secret}`);
  return new Request(url,{...init,headers});
}

describe('operator-only resumable population upload',()=>{
  it('hides the administrative route from anonymous visitors',async()=>{
    const db=database(),r2=bucket();
    const response=await populationIngestResponse(new Request('https://atlas.test/api/ops/population/import?action=start',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),{db:db.db,bucket:r2.bucket,secret});
    expect(response.status).toBe(404);expect(db.prepare).not.toHaveBeenCalled();
  });
  it('starts once, verifies each chunk, resumes idempotently and completes the immutable R2 object',async()=>{
    const db=database(),r2=bucket(),key=`population/releases/R2025A-v1/GBR/${'a'.repeat(64)}/data.bin`,data=new TextEncoder().encode('small-final-multipart-test'),fileHash=await sha256(data);
    const start=await populationIngestResponse(authenticatedRequest('https://atlas.test/api/ops/population/import?action=start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,sha256:fileHash,bytes:data.byteLength})}),{db:db.db,bucket:r2.bucket,secret});
    const startBody=await start.json() as Record<string,any>;expect(start.status).toBe(201);expect(startBody.status).toBe('uploading');
    expect(startBody.uploadId).toHaveLength(343);
    const retryStart=await populationIngestResponse(authenticatedRequest('https://atlas.test/api/ops/population/import?action=start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,sha256:fileHash,bytes:data.byteLength})}),{db:db.db,bucket:r2.bucket,secret});
    const retryStartBody=await retryStart.json() as Record<string,unknown>;expect(retryStart.status).toBe(200);expect(retryStartBody.status).toBe('uploading');expect(r2.uploads.size).toBe(1);
    const partHash=await sha256(data),partRequest=authenticatedRequest('https://atlas.test/api/ops/population/import?action=part',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Population-Key':key,'X-Population-Upload-Id':startBody.uploadId,'X-Population-Part-Number':'1','X-Population-Part-Bytes':String(data.byteLength),'X-Population-Part-SHA256':partHash},body:data});
    const part=await populationIngestResponse(partRequest,{db:db.db,bucket:r2.bucket,secret});
    expect(part.status).toBe(201);expect(await part.json()).toMatchObject({status:'uploaded',partNumber:1,sha256:partHash,bytes:data.byteLength,reused:false});
    const retryPart=await populationIngestResponse(authenticatedRequest('https://atlas.test/api/ops/population/import?action=part',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Population-Key':key,'X-Population-Upload-Id':startBody.uploadId,'X-Population-Part-Number':'1','X-Population-Part-Bytes':String(data.byteLength),'X-Population-Part-SHA256':partHash},body:data}),{db:db.db,bucket:r2.bucket,secret});
    expect(retryPart.status).toBe(200);expect(await retryPart.json()).toMatchObject({reused:true});
    const complete=await populationIngestResponse(authenticatedRequest('https://atlas.test/api/ops/population/import?action=complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,uploadId:startBody.uploadId,sha256:fileHash,bytes:data.byteLength})}),{db:db.db,bucket:r2.bucket,secret});
    expect(complete.status).toBe(200);expect(await complete.json()).toMatchObject({status:'complete',key,bytes:data.byteLength,sha256:fileHash});
    expect(new TextDecoder().decode(r2.stored.get(key)?.bytes)).toBe('small-final-multipart-test');
    const retryComplete=await populationIngestResponse(authenticatedRequest('https://atlas.test/api/ops/population/import?action=complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,uploadId:startBody.uploadId,sha256:fileHash,bytes:data.byteLength})}),{db:db.db,bucket:r2.bucket,secret});
    expect(retryComplete.status).toBe(200);expect(await retryComplete.json()).toMatchObject({status:'complete',reused:true});
  });
  it('rejects a chunk whose bytes do not match its supplied hash',async()=>{
    const db=database(),r2=bucket(),key=`population/releases/R2025A-v1/GBR/${'b'.repeat(64)}/index.bin`,data=new TextEncoder().encode('integrity-check');
    const start=await populationIngestResponse(authenticatedRequest('https://atlas.test/api/ops/population/import?action=start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,sha256:await sha256(data),bytes:data.byteLength})}),{db:db.db,bucket:r2.bucket,secret});
    const {uploadId}=await start.json() as {uploadId:string};
    const part=await populationIngestResponse(authenticatedRequest('https://atlas.test/api/ops/population/import?action=part',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Population-Key':key,'X-Population-Upload-Id':uploadId,'X-Population-Part-Number':'1','X-Population-Part-Bytes':String(data.byteLength),'X-Population-Part-SHA256':'c'.repeat(64)},body:data}),{db:db.db,bucket:r2.bucket,secret});
    expect(part.status).toBe(422);expect(await part.json()).toMatchObject({error:'import_part_checksum_mismatch'});expect([...r2.uploads.values()][0].parts.size).toBe(0);
  });
});
