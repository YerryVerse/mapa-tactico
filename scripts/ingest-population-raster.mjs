import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,open,readFile,rename,stat,unlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=resolve(root,'data/population/catalog.json');
const runtimeRoot=resolve(root,'.sites-runtime/population-work');
const pythonPackages=resolve(root,'.sites-runtime/population-python');
const expectedPythonPackages=['numpy-2.5.4.dist-info','rasterio-1.5.2.dist-info','shapely-2.1.2.dist-info'];
const RASTER_MIN_DOWNLOAD_TIMEOUT_MS=120_000;
const RASTER_MAX_DOWNLOAD_TIMEOUT_MS=45*60_000;
const RASTER_EXPECTED_BYTES_PER_SECOND=600_000;
const MAX_BOUNDARY_FILE_BYTES=12_000_000;
const argumentsList=process.argv.slice(2);
const selectedCountries=[];
for(let index=0;index<argumentsList.length;index++){
  if(argumentsList[index]==='--country'&&argumentsList[index+1])selectedCountries.push(argumentsList[++index].toUpperCase());
  else throw new Error('Usage: node scripts/ingest-population-raster.mjs [--country ISO3]...');
}
const catalog=JSON.parse(await import('node:fs/promises').then(module=>module.readFile(catalogPath,'utf8')));
const runtimeCatalog=JSON.parse(await readFile(resolve(root,'data/population/service-catalog.json'),'utf8'));
const datasets=catalog.population.datasets.filter(item=>selectedCountries.length===0||selectedCountries.includes(item.countryCode));
if(selectedCountries.some(code=>!datasets.some(item=>item.countryCode===code)))throw new Error('A selected country has no pinned WorldPop 2025 dataset.');

await mkdir(runtimeRoot,{recursive:true});
await mkdir(pythonPackages,{recursive:true});
if(expectedPythonPackages.some(name=>!existsSync(join(pythonPackages,name)))){
  const bootstrap=spawnSync('python',['-m','pip','install','--disable-pip-version-check','--no-warn-script-location','--target',pythonPackages,'--requirement',resolve(root,'scripts/population-ingest-requirements.txt')],{cwd:root,stdio:'inherit',windowsHide:true});
  if(bootstrap.error||bootstrap.status!==0)throw new Error('Could not install the pinned offline raster preparation tools.');
}

async function rasterDownloadTimeout(dataset){
  try{
    const response=await fetch(dataset.dataUrl,{method:'HEAD',headers:{'Accept':'image/tiff, application/octet-stream','Accept-Encoding':'identity'},signal:AbortSignal.timeout(15_000)});
    const bytes=Number(response.headers.get('Content-Length'));
    if(response.ok&&Number.isSafeInteger(bytes)&&bytes>0){
      const timeoutMs=Math.min(RASTER_MAX_DOWNLOAD_TIMEOUT_MS,Math.max(RASTER_MIN_DOWNLOAD_TIMEOUT_MS,Math.ceil(bytes/RASTER_EXPECTED_BYTES_PER_SECOND*1000)));
      process.stdout.write(`${dataset.countryCode}: fuente ${bytes} bytes; ventana de descarga ${Math.ceil(timeoutMs/60_000)} min\n`);
      return timeoutMs;
    }
  }catch{/* a missing size hint must not prevent downloading an official source */}
  process.stdout.write(`${dataset.countryCode}: la fuente no anunció tamaño; se usa ventana de descarga de 45 min\n`);
  return RASTER_MAX_DOWNLOAD_TIMEOUT_MS;
}

async function downloadDataset(dataset){
  const directory=resolve(runtimeRoot,'source',dataset.countryCode);
  await mkdir(directory,{recursive:true});
  const filename=`${dataset.datasetId}.tif`;
  const destination=join(directory,filename);
  const partial=`${destination}.part`;
  if(existsSync(destination)&&Number((await stat(destination)).size)>0){
    if(sourceIsReadable(dataset,destination))return destination;
    process.stdout.write(`${dataset.countryCode}: se descarta GeoTIFF local incompleto; se descargará de nuevo la fuente oficial\n`);
    await unlink(destination);
  }
  let attempts=0,totalExpected;
  const downloadTimeoutMs=await rasterDownloadTimeout(dataset);
  while(attempts<8){
    attempts++;
    const existing=existsSync(partial)?Number((await stat(partial)).size):0;
    const headers=new Headers({'Accept':'image/tiff, application/octet-stream','Accept-Encoding':'identity'});
    if(existing>0)headers.set('Range',`bytes=${existing}-`);
    let response;
    try{
      response=await fetch(dataset.dataUrl,{headers,signal:AbortSignal.timeout(downloadTimeoutMs)});
      process.stdout.write(`${dataset.countryCode}: GET HTTP ${response.status}, ${response.headers.get('Content-Length')??'tamaño desconocido'} bytes; transfiriendo\n`);
      const contentRange=response.headers.get('Content-Range');
      if(response.status===416&&existing>0){
        const match=/^bytes \*\/(\d+)$/.exec(contentRange??'');
        await response.body?.cancel();
        if(match&&Number(match[1])===existing){
          await rename(partial,destination);
          if(sourceIsReadable(dataset,destination))return destination;
          await unlink(destination);
          throw new Error('Resumed WorldPop GeoTIFF failed its metadata and TIFF-directory probe');
        }
        const file=await open(partial,'w');await file.close();continue;
      }
      if(!response.ok)throw new Error(`WorldPop returned HTTP ${response.status}`);
      if(existing>0&&response.status===206){
        const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange??'');
        if(!match||Number(match[1])!==existing)throw new Error('WorldPop sent an incompatible resumed byte range');
        totalExpected=Number(match[3]);
      }else if(existing>0){
        process.stdout.write(`${dataset.countryCode}: WorldPop ignoró Range; se reinicia el fragmento con esta respuesta completa\n`);
        totalExpected=Number(response.headers.get('Content-Length'))||undefined;
      }else{
        const match=/^bytes 0-(\d+)\/(\d+)$/.exec(contentRange??'');
        if(response.status===206&&(!match||Number(match[1])!==0))throw new Error('WorldPop sent an incompatible initial byte range');
        totalExpected=match?Number(match[2]):Number(response.headers.get('Content-Length'))||undefined;
      }
      if(!response.body)throw new Error('WorldPop response has no body');
      const canResume=existing>0&&response.status===206;
      const initialBytes=canResume?existing:0;
      const file=await open(partial,canResume?'a':'w'),reader=response.body.getReader();
      let received=initialBytes,lastProgress=initialBytes;
      try{
        for(;;){
          const {done,value}=await reader.read();if(done)break;
          let offset=0;
          while(offset<value.byteLength){
            const {bytesWritten}=await file.write(value,offset,value.byteLength-offset);
            if(bytesWritten<1)throw new Error('WorldPop GeoTIFF write made no progress');
            offset+=bytesWritten;
          }
          received+=value.byteLength;
          if(received-lastProgress>=16*1024*1024){
            process.stdout.write(`${dataset.countryCode}: descarga ${received}/${totalExpected??'tamaño desconocido'} bytes\n`);
            lastProgress=received;
          }
        }
        await file.sync();
      }finally{reader.releaseLock();await file.close();}
      const bytes=Number((await stat(partial)).size);
      if(totalExpected!==undefined&&bytes>totalExpected)throw new Error('Downloaded GeoTIFF is larger than its HTTP response');
      if(totalExpected===undefined||bytes===totalExpected){
        await rename(partial,destination);
        if(sourceIsReadable(dataset,destination))return destination;
        await unlink(destination);
        throw new Error('Downloaded WorldPop GeoTIFF failed its metadata and TIFF-directory probe');
      }
      process.stdout.write(`${dataset.countryCode}: descarga reanudable ${bytes}/${totalExpected} bytes (intento ${attempts}/8)\n`);
    }catch(error){
      process.stdout.write(`${dataset.countryCode}: interrupción de descarga (${error instanceof Error?error.message:String(error)}); se conserva el fragmento reanudable (intento ${attempts}/8)\n`);
      if(attempts===8)throw error;
    }
  }
  throw new Error(`Could not finish the official GeoTIFF download for ${dataset.countryCode}`);
}

async function downloadBoundary(layer){
  const directory=resolve(runtimeRoot,'boundaries');
  await mkdir(directory,{recursive:true});
  const destination=join(directory,`${layer.boundaryId}.geojson`),partial=`${destination}.part`;
  if(existsSync(destination)&&Number((await stat(destination)).size)>0)return destination;
  let attempts=0,totalExpected;
  while(attempts<8){
    attempts++;
    const existing=existsSync(partial)?Number((await stat(partial)).size):0;
    const headers=new Headers({'Accept':'application/geo+json, application/json, application/octet-stream','Accept-Encoding':'identity'});
    if(existing>0)headers.set('Range',`bytes=${existing}-`);
    let response;
    try{
      response=await fetch(layer.geoJsonUrl,{headers,signal:AbortSignal.timeout(120_000)});
      if(response.status===416&&existing>0){
        const match=/^bytes \*\/(\d+)$/.exec(response.headers.get('Content-Range')??'');
        await response.body?.cancel();
        if(match&&Number(match[1])===existing){await rename(partial,destination);return destination;}
        const file=await open(partial,'w');await file.close();continue;
      }
      if(!response.ok)throw new Error(`geoBoundaries returned HTTP ${response.status}`);
      const contentRange=response.headers.get('Content-Range');
      if(existing>0&&response.status===206){
        const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange??'');
        if(!match||Number(match[1])!==existing)throw new Error('geoBoundaries sent an incompatible resumed byte range');
        totalExpected=Number(match[3]);
      }else if(existing>0){
        await response.body?.cancel();const file=await open(partial,'w');await file.close();continue;
      }else{
        const match=/^bytes 0-(\d+)\/(\d+)$/.exec(contentRange??'');
        if(response.status===206&&(!match||Number(match[1])!==0))throw new Error('geoBoundaries sent an incompatible initial byte range');
        totalExpected=match?Number(match[2]):Number(response.headers.get('Content-Length'))||undefined;
      }
      if(!response.body)throw new Error('geoBoundaries response has no body');
      await pipeline(Readable.fromWeb(response.body),createWriteStream(partial,{flags:existing>0?'a':'w'}));
      const file=await open(partial,'r+');try{await file.sync();}finally{await file.close();}
      const bytes=Number((await stat(partial)).size);
      if(totalExpected!==undefined&&bytes>totalExpected)throw new Error('Downloaded boundary GeoJSON is larger than its HTTP response');
      if(totalExpected===undefined||bytes===totalExpected){await rename(partial,destination);return destination;}
      process.stdout.write(`${layer.boundaryId}: descarga GeoJSON reanudable ${bytes}/${totalExpected} bytes\n`);
    }catch(error){
      process.stdout.write(`${layer.boundaryId}: interrupción de GeoJSON (intento ${attempts}/8)\n`);
      if(attempts===8)throw error;
    }
  }
  throw new Error(`Could not finish the pinned geoBoundaries layer ${layer.boundaryId}`);
}

function runPython(script,args){
  const existing=process.env.PYTHONPATH;
  const env={...process.env,PYTHONUTF8:'1',PYTHONPATH:[pythonPackages,existing].filter(Boolean).join(process.platform==='win32'?';':':')};
  const result=spawnSync('python',[resolve(root,'scripts',script),...args],{cwd:root,env,encoding:'utf8',stdio:'inherit',windowsHide:true});
  if(result.error||result.status!==0)throw new Error(`Population data step ${script} failed${result.error?`: ${result.error.message}`:''}.`);
}

function sourceIsReadable(dataset,source){
  const existing=process.env.PYTHONPATH;
  const env={...process.env,PYTHONPATH:[pythonPackages,existing].filter(Boolean).join(process.platform==='win32'?';':':')};
  const result=spawnSync('python',[resolve(root,'scripts','probe-population-source.py'),'--catalog',catalogPath,'--country',dataset.countryCode,'--source',source],{cwd:root,env,encoding:'utf8',stdio:'ignore',windowsHide:true});
  return !result.error&&result.status===0;
}

async function fileMatches(path,bytes,expectedSha256){
  try{
    if(!Number.isSafeInteger(bytes)||bytes<0||! /^[0-9a-f]{64}$/.test(expectedSha256)||Number((await stat(path)).size)!==bytes)return false;
    const digest=createHash('sha256');
    for await(const chunk of createReadStream(path))digest.update(chunk);
    return digest.digest('hex')===expectedSha256;
  }catch{return false;}
}

async function preparedCountryIsComplete(dataset,source,output){
  try{
    const manifest=JSON.parse(await readFile(join(output,'manifest.json'),'utf8'));
    if(manifest.countryCode!==dataset.countryCode||manifest.datasetId!==dataset.datasetId||manifest.edition!==dataset.edition||manifest.year!==dataset.year||manifest.resolution!==dataset.resolution)return false;
    const sourceSize=Number((await stat(source)).size);
    if(!await fileMatches(source,sourceSize,manifest.sourceSha256))return false;
    if(!await fileMatches(join(output,'data.bin'),manifest.storage?.data?.bytes,manifest.storage?.data?.sha256))return false;
    if(!await fileMatches(join(output,'index.bin'),manifest.storage?.index?.bytes,manifest.storage?.index?.sha256))return false;
    const layers=runtimeCatalog.boundaries.adminLayers.filter(item=>item.countryCode===dataset.countryCode);
    const aggregates=manifest.administrativeAggregates;
    if(!Array.isArray(aggregates)||aggregates.length!==layers.length)return false;
    if(!layers.length&&(manifest.administrativeCoverage?.status!=='unavailable'||manifest.administrativeCoverage?.reason!=='no_pinned_geoboundaries_layer'))return false;
    if(layers.length&&(manifest.administrativeCoverage?.status!=='available'||manifest.administrativeCoverage?.layers!==layers.length||manifest.administrativeCoverage?.features!==aggregates.reduce((sum,aggregate)=>sum+aggregate.featureCount,0)))return false;
    for(let layerIndex=0;layerIndex<layers.length;layerIndex++){
      const expected=layers[layerIndex],aggregate=aggregates[layerIndex];
      if(aggregate.boundaryLayerId!==expected.boundaryId||aggregate.boundaryYear!==expected.boundaryYear||aggregate.sourceUrl!==expected.geoJsonUrl||!Array.isArray(aggregate.shards))return false;
      let features=0;
      for(const shard of aggregate.shards){
        if(typeof shard.shard!=='string'||!/^[0-9a-f]{2}$/.test(shard.shard))return false;
        if(!await fileMatches(join(output,'aggregates',aggregate.boundaryLayerId,`${shard.shard}.json`),shard.bytes,shard.sha256))return false;
        if(!Number.isSafeInteger(shard.features)||shard.features<0)return false;
        features+=shard.features;
      }
      if(features!==aggregate.featureCount)return false;
    }
    return true;
  }catch{return false;}
}

async function prepareOversizedBoundaryIndexes(dataset,output){
  const layers=runtimeCatalog.boundaries.adminLayers.filter(item=>item.countryCode===dataset.countryCode);
  if(!layers.length)return;
  const manifest=JSON.parse(await readFile(join(output,'manifest.json'),'utf8'));
  const aggregates=new Map((manifest.administrativeAggregates??[]).map(aggregate=>[aggregate.boundaryLayerId,aggregate]));
  let needsPreparation=false;
  for(const layer of layers){
    const boundaryPath=resolve(runtimeRoot,'boundaries',`${layer.boundaryId}.geojson`);
    if(!existsSync(boundaryPath))throw new Error(`Missing pinned boundary GeoJSON: ${layer.boundaryId}`);
    const sourceBytes=Number((await stat(boundaryPath)).size);
    const aggregate=aggregates.get(layer.boundaryId),boundaryData=aggregate?.boundaryData;
    if(aggregate?.boundarySourceBytes!==sourceBytes)needsPreparation=true;
    if(sourceBytes<=MAX_BOUNDARY_FILE_BYTES)continue;
    if(!boundaryData||boundaryData.sourceBytes!==sourceBytes||boundaryData.sourceSha256!==aggregate.sourceSha256||boundaryData.featureCount!==aggregate.featureCount||
      !await fileMatches(join(output,'boundaries',layer.boundaryId,'index.json'),boundaryData.index?.bytes,boundaryData.index?.sha256)||
      !await fileMatches(join(output,'boundaries',layer.boundaryId,'display.ndjson'),boundaryData.display?.bytes,boundaryData.display?.sha256))needsPreparation=true;
  }
  if(!needsPreparation)return;
  runPython('prepare-population-boundary-index.py',['--runtime-catalog',resolve(root,'data/population/service-catalog.json'),'--country',dataset.countryCode,'--prepared',output,'--boundaries',resolve(runtimeRoot,'boundaries')]);
}

const failedCountries=[];
for(let index=0;index<datasets.length;index++){
  const dataset=datasets[index];
  try{
    process.stdout.write(`[${index+1}/${datasets.length}] ${dataset.countryCode}: descarga/reanudación del GeoTIFF oficial\n`);
    const source=await downloadDataset(dataset);
    const output=resolve(runtimeRoot,'prepared-MTPOP001',dataset.countryCode,`${dataset.edition}-${dataset.year}-${dataset.resolution}`);
    if(await preparedCountryIsComplete(dataset,source,output)){
      await prepareOversizedBoundaryIndexes(dataset,output);
      process.stdout.write(`${dataset.countryCode}: salida local completa y sus checksums verificados; se conserva sin reprocesar\n`);
      continue;
    }
    await mkdir(dirname(output),{recursive:true});
    runPython('prepare-population-raster.py',['--catalog',catalogPath,'--country',dataset.countryCode,'--source',source,'--output',output]);
    runPython('verify-population-raster.py',['--source',source,'--prepared',output]);
    const countryLayers=runtimeCatalog.boundaries.adminLayers.filter(item=>item.countryCode===dataset.countryCode);
    for(let layerIndex=0;layerIndex<countryLayers.length;layerIndex++){
      const layer=countryLayers[layerIndex];
      process.stdout.write(`  ${dataset.countryCode}: límite ${layerIndex+1}/${countryLayers.length} ${layer.boundaryId}\n`);
      await downloadBoundary(layer);
    }
    runPython('prepare-population-admin-aggregates.py',['--catalog',catalogPath,'--runtime-catalog',resolve(root,'data/population/service-catalog.json'),'--country',dataset.countryCode,'--source',source,'--prepared',output,'--boundaries',resolve(runtimeRoot,'boundaries')]);
    await prepareOversizedBoundaryIndexes(dataset,output);
  }catch(error){
    failedCountries.push(dataset.countryCode);
    process.stderr.write(`${dataset.countryCode}: preparación pendiente por error recuperable: ${error instanceof Error?error.message:String(error)}\n`);
  }
}

if(failedCountries.length){
  process.stderr.write(`Pendientes para reintento: ${failedCountries.join(', ')}\n`);
  process.exitCode=1;
}else process.stdout.write(`Prepared and independently verified ${datasets.length} official WorldPop raster dataset(s).\n`);
