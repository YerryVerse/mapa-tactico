import {createHash} from 'node:crypto';
import {createReadStream,existsSync} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const runtimeRoot=resolve(root,'.sites-runtime/population-work');
const preparedRoot=resolve(runtimeRoot,'prepared-MTPOP001');
const catalog=JSON.parse(await readFile(resolve(root,'data/population/catalog.json'),'utf8'));
const runtimeCatalog=JSON.parse(await readFile(resolve(root,'data/population/service-catalog.json'),'utf8'));
const selectedCountries=[];
let requireComplete=false;
for(let index=2;index<process.argv.length;index++){
  if(process.argv[index]==='--country'&&process.argv[index+1])selectedCountries.push(process.argv[++index].toUpperCase());
  else if(process.argv[index]==='--require-complete')requireComplete=true;
  else throw new Error('Usage: node scripts/prepare-population-boundary-indexes.mjs [--country ISO3]... [--require-complete]');
}
const datasets=catalog.population.datasets.filter(item=>!selectedCountries.length||selectedCountries.includes(item.countryCode));
if(selectedCountries.some(code=>!datasets.some(item=>item.countryCode===code)))throw new Error('A selected country has no pinned WorldPop dataset');
const pythonPath=resolve(root,'.sites-runtime/population-python');
const env={...process.env,PYTHONUTF8:'1',PYTHONPATH:[pythonPath,process.env.PYTHONPATH].filter(Boolean).join(process.platform==='win32'?';':':')};
const missing=[],prepared=[],alreadyReady=[];

async function fileMatches(path,expectedBytes,expectedHash){
  if(!Number.isSafeInteger(expectedBytes)||expectedBytes<1||typeof expectedHash!=='string'||!/^[0-9a-f]{64}$/.test(expectedHash)||!existsSync(path))return false;
  if(Number((await stat(path)).size)!==expectedBytes)return false;
  const digest=createHash('sha256');
  for await(const chunk of createReadStream(path))digest.update(chunk);
  return digest.digest('hex')===expectedHash;
}

function runPython(country,output){
  const args=[resolve(root,'scripts','prepare-population-boundary-index.py'),'--runtime-catalog',resolve(root,'data/population/service-catalog.json'),'--country',country,'--prepared',output,'--boundaries',resolve(runtimeRoot,'boundaries')];
  const result=spawnSync('python',args,{cwd:root,env,stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`Boundary index preparation failed for ${country} (exit ${result.status??result.signal})`);
}

for(const dataset of datasets){
  const country=dataset.countryCode,version=`${dataset.edition}-${dataset.year}-${dataset.resolution}`,output=join(preparedRoot,country,version),manifestPath=join(output,'manifest.json');
  if(!existsSync(manifestPath)){missing.push(`${country}: raster/aggregates are not prepared`);continue;}
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  if(manifest.countryCode!==country||manifest.datasetId!==dataset.datasetId||manifest.sourceSha256!==manifest.storage?.data?.key?.split('/').at(-2))throw new Error(`${country}: prepared raster manifest identity is incompatible`);
  const layers=runtimeCatalog.boundaries.adminLayers.filter(item=>item.countryCode===country),aggregates=manifest.administrativeAggregates;
  if(!Array.isArray(aggregates)||aggregates.length!==layers.length||layers.some((layer,index)=>aggregates[index]?.boundaryLayerId!==layer.boundaryId)){
    missing.push(`${country}: administrative aggregates are incomplete`);continue;
  }
  let aggregateReady=true;
  for(const aggregate of aggregates){
    if(!Array.isArray(aggregate.shards)||aggregate.shards.reduce((total,shard)=>total+Number(shard.features||0),0)!==aggregate.featureCount){aggregateReady=false;break;}
    for(const shard of aggregate.shards){
      if(!await fileMatches(join(output,'aggregates',aggregate.boundaryLayerId,`${shard.shard}.json`),shard.bytes,shard.sha256)){aggregateReady=false;break;}
    }
    if(!aggregateReady)break;
  }
  if(!aggregateReady){missing.push(`${country}: administrative aggregate shards are incomplete`);continue;}
  const countryLayers=layers;
  let needsPreparation=false;
  for(let index=0;index<countryLayers.length;index++){
    const layer=countryLayers[index],aggregate=aggregates[index],boundaryPath=join(runtimeRoot,'boundaries',`${layer.boundaryId}.geojson`);
    if(!existsSync(boundaryPath)){aggregateReady=false;missing.push(`${country}: missing pinned boundary ${layer.boundaryId}`);break;}
    const sourceBytes=Number((await stat(boundaryPath)).size),boundaryData=aggregate.boundaryData;
    if(aggregate.boundarySourceBytes!==sourceBytes)needsPreparation=true;
    if(sourceBytes<=12_000_000)continue;
    if(!boundaryData||boundaryData.sourceBytes!==sourceBytes||boundaryData.sourceSha256!==aggregate.sourceSha256||boundaryData.featureCount!==aggregate.featureCount||
      !await fileMatches(join(output,'boundaries',layer.boundaryId,'index.json'),boundaryData.index?.bytes,boundaryData.index?.sha256)||
      !await fileMatches(join(output,'boundaries',layer.boundaryId,'display.ndjson'),boundaryData.display?.bytes,boundaryData.display?.sha256))needsPreparation=true;
  }
  if(!aggregateReady)continue;
  if(!needsPreparation){alreadyReady.push(country);continue;}
  runPython(country,output);
  const updated=JSON.parse(await readFile(manifestPath,'utf8'));
  for(const layer of countryLayers){
    const aggregate=updated.administrativeAggregates.find(item=>item.boundaryLayerId===layer.boundaryId),sourceBytes=Number((await stat(join(runtimeRoot,'boundaries',`${layer.boundaryId}.geojson`))).size);
    if(!aggregate||aggregate.boundarySourceBytes!==sourceBytes)throw new Error(`${country}: prepared boundary source size is inconsistent`);
    if(sourceBytes>12_000_000){
      const assets=aggregate.boundaryData;
      if(!assets||!await fileMatches(join(output,'boundaries',layer.boundaryId,'index.json'),assets.index?.bytes,assets.index?.sha256)||!await fileMatches(join(output,'boundaries',layer.boundaryId,'display.ndjson'),assets.display?.bytes,assets.display?.sha256))throw new Error(`${country}: prepared R2 boundary assets failed verification`);
    }
  }
  prepared.push(country);
  process.stdout.write(`${country}: límites versionados y comprobados\n`);
}

process.stdout.write(`Boundary indexes: ${prepared.length} prepared, ${alreadyReady.length} already ready, ${missing.length} awaiting raster or boundary inputs.\n`);
if(missing.length)for(const item of missing)process.stdout.write(`Pending: ${item}\n`);
if(requireComplete&&missing.length){process.stderr.write('Boundary preparation is incomplete.\n');process.exitCode=1;}
