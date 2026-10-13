import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,open,readFile,rename,stat,unlink,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const runtimeRoot=resolve(root,'.sites-runtime/population-work');
const catalog=JSON.parse(await readFile(resolve(root,'data/population/catalog.json'),'utf8'));
const endpoint=(process.env.POPULATION_INGEST_URL??'https://atlas-escenarios-hud.yerrybatista.chatgpt.site/api/ops/population/import').replace(/\/$/,'');
const uploadConcurrency=Number(process.env.POPULATION_UPLOAD_CONCURRENCY??6);
if(!Number.isSafeInteger(uploadConcurrency)||uploadConcurrency<1||uploadConcurrency>12)throw new Error('POPULATION_UPLOAD_CONCURRENCY must be an integer from 1 to 12.');
const countryConcurrency=Number(process.env.POPULATION_COUNTRY_CONCURRENCY??4);
if(!Number.isSafeInteger(countryConcurrency)||countryConcurrency<1||countryConcurrency>8)throw new Error('POPULATION_COUNTRY_CONCURRENCY must be an integer from 1 to 8.');
const partConcurrency=4,maxConcurrentPartRequests=8;
const args=process.argv.slice(2),selected=[];
for(let index=0;index<args.length;index++){
  if(args[index]==='--country'&&args[index+1])selected.push(args[++index].toUpperCase());
  else throw new Error('Usage: node scripts/upload-population-raster.mjs [--country ISO3]...');
}
const allCountries=catalog.population.datasets.map(dataset=>dataset.countryCode).sort();
const countries=selected.length?[...new Set(selected)].sort():allCountries;
if(countries.some(code=>!allCountries.includes(code)))throw new Error('A selected country is not present in the pinned population catalog.');

async function readSecret(){
  if(process.env.POPULATION_INGEST_SECRET)return process.env.POPULATION_INGEST_SECRET;
  process.stdout.write('Waiting for the operator secret on stdin (input is hidden).\n');
  const {createInterface}=await import('node:readline');
  const terminal=Boolean(process.stdin.isTTY);
  const quietOutput=terminal?{columns:process.stdout.columns??80,isTTY:true,on(){return this;},removeListener(){return this;},write(){return true;}}:undefined;
  const reader=createInterface({input:process.stdin,...(quietOutput?{output:quietOutput}:{}),crlfDelay:Infinity,terminal});
  const secret=await new Promise((resolveSecret,reject)=>{reader.once('line',resolveSecret);reader.once('close',()=>reject(new Error('Operator secret was not supplied.')));});
  reader.close();
  if(typeof secret!=='string'||secret.length<32)throw new Error('The operator secret must contain at least 32 characters.');
  return secret;
}
const secret=await readSecret();
const headers={'Authorization':`Bearer ${secret}`,'Accept':'application/json'};
const statePath=join(runtimeRoot,'upload-progress.json');
await mkdir(runtimeRoot,{recursive:true});
let progress=await readFile(statePath,'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return {schemaVersion:1,assets:{},countries:{}};throw error;});
let progressWriteSequence=0,progressWriteQueue=Promise.resolve();

function sha256(bytes){return createHash('sha256').update(bytes).digest('hex');}
async function fileSha256(path){
  const digest=createHash('sha256');
  for await(const chunk of createReadStream(path))digest.update(chunk);
  return digest.digest('hex');
}
async function saveProgress(){
  const serialized=JSON.stringify(progress,null,2)+'\n';
  const write=async()=>{
    const old=await readFile(statePath,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(old===serialized)return;
    const temporary=`${statePath}.${process.pid}.${++progressWriteSequence}.tmp`;
    await writeFile(temporary,serialized,{encoding:'utf8'});
    let renameError;
    for(let attempt=1;attempt<=6;attempt++){
      try{await rename(temporary,statePath);return;}
      catch(error){
        renameError=error;
        if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt===6)break;
        await delay(50*attempt);
      }
    }
    await unlink(temporary).catch(()=>{});
    throw renameError;
  };
  const pending=progressWriteQueue.then(write);
  progressWriteQueue=pending.catch(()=>{});
  await pending;
}
async function requestJson(action,body,acceptedStatuses=[]){
  let lastError;
  for(let attempt=1;attempt<=5;attempt++){
    try{
      const response=await fetch(`${endpoint}?action=${action}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json().catch(()=>({error:'invalid_server_response'}));
      if(response.ok||acceptedStatuses.includes(response.status))return result;
      if(response.status<500||attempt===5)throw new Error(`Operator API action ${action} returned HTTP ${response.status}: ${result.error??'unknown_error'}`);
      lastError=new Error(`HTTP ${response.status}`);
    }catch(error){if(attempt===5)throw error;lastError=error;}
    await delay(250*attempt);
  }
  throw lastError??new Error(`Operator API action ${action} failed.`);
}
async function requestPart(key,uploadId,partNumber,bytes,partHash){
  let lastError;
  for(let attempt=1;attempt<=5;attempt++){
    try{
      const response=await fetch(`${endpoint}?action=part`,{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream','X-Population-Key':key,'X-Population-Upload-Id':uploadId,'X-Population-Part-Number':String(partNumber),'X-Population-Part-Bytes':String(bytes.byteLength),'X-Population-Part-SHA256':partHash},body:bytes});
      const result=await response.json().catch(()=>({error:'invalid_server_response'}));
      if(response.ok)return result;
      if(response.status<500||attempt===5)throw new Error(`Operator API rejected part ${partNumber}: ${result.error??`HTTP ${response.status}`}`);
      lastError=new Error(`HTTP ${response.status}`);
    }catch(error){if(attempt===5)throw error;lastError=error;}
    await delay(250*attempt);
  }
  throw lastError??new Error(`Could not upload part ${partNumber}.`);
}

let activePartRequests=0;
const partRequestWaiters=[];
async function withPartRequestSlot(operation){
  if(activePartRequests>=maxConcurrentPartRequests)await new Promise(resolveRequest=>partRequestWaiters.push(resolveRequest));
  else activePartRequests++;
  try{return await operation();}
  finally{
    const next=partRequestWaiters.shift();
    if(next)next();
    else activePartRequests--;
  }
}

async function uploadAsset(key,path,expectedSha256){
  const bytes=Number((await stat(path)).size);
  const actualSha256=await fileSha256(path);
  if(actualSha256!==expectedSha256)throw new Error(`Local asset checksum differs from its manifest: ${key}`);
  const start=await requestJson('start',{key,sha256:actualSha256,bytes});
  if(start.status==='complete'){
    progress.assets[key]={status:'complete',sha256:actualSha256,bytes,updatedAt:new Date().toISOString()};await saveProgress();
    return;
  }
  if(start.status!=='uploading'||typeof start.uploadId!=='string')throw new Error(`Could not create or resume multipart upload for ${key}.`);
  const partBytes=Number(start.partBytes);
  if(!Number.isSafeInteger(partBytes)||partBytes<5*1024*1024||partBytes>8*1024*1024)throw new Error('The server returned an unsupported multipart part size.');
  const savedParts=new Map((start.parts??[]).map(part=>[Number(part.part_number??part.partNumber),part]));
  const file=await open(path,'r');
  try{
    const totalParts=Math.ceil(bytes/partBytes),completedParts=new Set(savedParts.keys());
    for(let firstPart=1;firstPart<=totalParts;firstPart+=partConcurrency){
      const group=Array.from({length:Math.min(partConcurrency,totalParts-firstPart+1)},(_,index)=>firstPart+index);
      await Promise.all(group.map(async partNumber=>{
        const offset=(partNumber-1)*partBytes,length=Math.min(partBytes,bytes-offset),saved=savedParts.get(partNumber);
        if(saved){
          await withPartRequestSlot(async()=>{
            const chunk=Buffer.allocUnsafe(length),read=await file.read(chunk,0,length,offset);
            if(read.bytesRead!==length)throw new Error(`Local file was truncated during upload: ${key}`);
            if(saved.sha256!==sha256(chunk)||Number(saved.bytes)!==length)throw new Error(`Server has a conflicting retry checkpoint for ${key}, part ${partNumber}.`);
          });
        }else await withPartRequestSlot(async()=>{
          const chunk=Buffer.allocUnsafe(length),read=await file.read(chunk,0,length,offset);
          if(read.bytesRead!==length)throw new Error(`Local file was truncated during upload: ${key}`);
          await requestPart(key,start.uploadId,partNumber,chunk,sha256(chunk));
        });
        completedParts.add(partNumber);
      }));
      const uploadedBytes=Math.min(bytes,Math.max(...group)*partBytes);
      progress.assets[key]={status:'uploading',sha256:actualSha256,bytes,completedParts:completedParts.size,updatedAt:new Date().toISOString()};
      await saveProgress();
      if(bytes>=1024*1024&&(firstPart===1||firstPart+group.length-1===totalParts||firstPart%8===1))process.stdout.write(`${key}: ${uploadedBytes}/${bytes} bytes (${completedParts.size}/${totalParts} parts)\n`);
    }
  }finally{await file.close();}
  const complete=await requestJson('complete',{key,uploadId:start.uploadId,sha256:actualSha256,bytes});
  if(complete.status!=='complete')throw new Error(`The operator API did not complete ${key}.`);
  progress.assets[key]={status:'complete',sha256:actualSha256,bytes,updatedAt:new Date().toISOString()};await saveProgress();
}

async function uploadCountry(countryCode){
  const dataset=catalog.population.datasets.find(item=>item.countryCode===countryCode);
  const folder=resolve(runtimeRoot,'prepared-MTPOP001',countryCode,`${dataset.edition}-${dataset.year}-${dataset.resolution}`);
  const manifestPath=join(folder,'manifest.json'),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  if(manifest.countryCode!==countryCode||manifest.datasetId!==dataset.datasetId||manifest.sourceSha256.length!==64||!Array.isArray(manifest.administrativeAggregates))throw new Error(`Prepared country manifest is incomplete for ${countryCode}.`);
  const expectedLayers=catalog.boundaries.layers.filter(layer=>layer.countryCode===countryCode);
  const actualLayers=manifest.administrativeAggregates;
  if(actualLayers.length!==expectedLayers.length||actualLayers.some((layer,index)=>layer.boundaryLayerId!==expectedLayers[index].boundaryId))throw new Error(`Prepared administrative layer list differs from the pinned catalog for ${countryCode}.`);
  if(expectedLayers.length===0){
    if(manifest.administrativeCoverage?.status!=='unavailable'||manifest.administrativeCoverage?.reason!=='no_pinned_geoboundaries_layer')throw new Error(`Missing administrative coverage must be explicit for ${countryCode}.`);
  }else if(manifest.administrativeCoverage?.status!=='available'||manifest.administrativeCoverage.layers!==expectedLayers.length||manifest.administrativeCoverage.features!==actualLayers.reduce((total,layer)=>total+layer.featureCount,0)){
    throw new Error(`Administrative coverage totals differ from the prepared layers for ${countryCode}.`);
  }
  const previous=progress.countries[countryCode];
  if(previous?.status==='country_ready'&&previous.sourceSha256===manifest.sourceSha256){
    const verified=await requestJson('verify-country',{countryCode,sourceSha256:manifest.sourceSha256},[409,422]);
    if(verified.status==='country_ready'&&verified.manifestSha256===previous.manifestSha256&&verified.assets===previous.assets){
      process.stdout.write(`${countryCode}: revalidación de manifiesto y objetos correcta (${verified.assets})\n`);
      return;
    }
  }
  const files=[
    {key:manifest.storage.data.key,path:join(folder,'data.bin'),sha256:manifest.storage.data.sha256},
    {key:manifest.storage.index.key,path:join(folder,'index.bin'),sha256:manifest.storage.index.sha256},
    ...manifest.administrativeAggregates.flatMap(layer=>layer.shards.map(shard=>({key:shard.key,path:join(folder,'aggregates',layer.boundaryLayerId,`${shard.shard}.json`),sha256:shard.sha256}))),
    ...manifest.administrativeAggregates.flatMap(layer=>layer.boundaryData?[
      {key:layer.boundaryData.index.key,path:join(folder,'boundaries',layer.boundaryLayerId,'index.json'),sha256:layer.boundaryData.index.sha256},
      {key:layer.boundaryData.display.key,path:join(folder,'boundaries',layer.boundaryLayerId,'display.ndjson'),sha256:layer.boundaryData.display.sha256}
    ]:[]),
    {key:`population/releases/${manifest.edition}/${countryCode}/${manifest.sourceSha256}/manifest.json`,path:manifestPath,sha256:await fileSha256(manifestPath)}
  ];
  process.stdout.write(`${countryCode}: carga de ${files.length} archivos verificados\n`);
  let nextFile=0,completedFiles=0;
  await Promise.all(Array.from({length:Math.min(uploadConcurrency,files.length)},async()=>{
    while(nextFile<files.length){
      const index=nextFile++,asset=files[index];
      await uploadAsset(asset.key,asset.path,asset.sha256);
      completedFiles++;
      if(index===0||completedFiles===files.length||completedFiles%32===0)process.stdout.write(`${countryCode}: ${completedFiles}/${files.length} archivos\n`);
    }
  }));
  const ready=await requestJson('verify-country',{countryCode,sourceSha256:manifest.sourceSha256});
  if(ready.status!=='country_ready')throw new Error(`Country asset verification failed for ${countryCode}.`);
  progress.countries[countryCode]={status:'country_ready',sourceSha256:manifest.sourceSha256,manifestSha256:ready.manifestSha256,assets:ready.assets,updatedAt:new Date().toISOString()};
  await saveProgress();
  process.stdout.write(`${countryCode}: assets y agregados verificados (${ready.assets})\n`);
}

const migration=await requestJson('migrate',{});
if(migration.status!=='applied')throw new Error('The operator migration did not complete.');
process.stdout.write(`D1 migration ready: ${migration.migration}\n`);
let nextCountry=0;
await Promise.all(Array.from({length:Math.min(countryConcurrency,countries.length)},async()=>{
  while(nextCountry<countries.length){
    const index=nextCountry++,countryCode=countries[index];
    process.stdout.write(`[${index+1}/${countries.length}] ${countryCode}\n`);
    await uploadCountry(countryCode);
  }
}));
if(countries.length===allCountries.length&&countries.every((code,index)=>code===allCountries[index])){
  const result=await requestJson('activate',{});
  if(result.status!=='activated'&&result.status!=='already_active')throw new Error('The R2 release activation did not complete.');
  progress.activation={status:result.status,release:result.release,year:result.year,countries:result.countries,catalogSha256:result.catalogSha256,updatedAt:new Date().toISOString()};
  await saveProgress();
  process.stdout.write(`Activated ${result.release} for ${result.countries} countries.\n`);
}else process.stdout.write('Selected countries are prepared; the global activation remains unchanged until all catalog countries are ready.\n');
