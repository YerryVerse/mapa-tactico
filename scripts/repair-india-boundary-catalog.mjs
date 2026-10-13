import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=resolve(root,'data/population/catalog.json');
const runtimePath=resolve(root,'data/population/service-catalog.json');
const releases=resolve(root,'data/population/releases');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const wrongId='IND-ADM0-90661403';
const correctId='IND-ADM1-1811400';

async function writeImmutable(path,content){
  try{await writeFile(path,content,{encoding:'utf8',flag:'wx'});}
  catch(error){
    if(error.code!=='EEXIST')throw error;
    if(await readFile(path,'utf8')!==content)throw new Error(`An immutable catalog snapshot already differs: ${path}`);
  }
}

async function replaceAtomically(path,content){
  const temporary=`${path}.${randomUUID()}.tmp`;
  await writeFile(temporary,content,{encoding:'utf8',flag:'wx'});
  await rename(temporary,path);
}

const [catalog,runtime]=await Promise.all([
  readFile(catalogPath,'utf8').then(JSON.parse),
  readFile(runtimePath,'utf8').then(JSON.parse)
]);
const {manifestSha256:catalogHash,...catalogPayload}=catalog;
const {manifestSha256:runtimeHash,...runtimePayload}=runtime;
if(hash(catalogPayload)!==catalogHash||hash(runtimePayload)!==runtimeHash)throw new Error('An input catalog checksum is invalid; no files were changed.');

const source=catalog.boundaries.layers,adminLayers=runtime.boundaries.adminLayers;
const sourceIds=source.map(item=>item.boundaryId).sort(),runtimeIds=adminLayers.map(item=>item.boundaryId).sort();
if(JSON.stringify(sourceIds)!==JSON.stringify(runtimeIds))throw new Error('Source and runtime boundary layer IDs differ; no files were changed.');
const wrong=source.filter(item=>item.boundaryId===wrongId),wrongRuntime=adminLayers.filter(item=>item.boundaryId===wrongId);
const correct=source.filter(item=>item.boundaryId===correctId),correctRuntime=adminLayers.filter(item=>item.boundaryId===correctId);
if(wrong.length===0&&wrongRuntime.length===0&&correct.length===1&&correctRuntime.length===1){
  process.stdout.write('India boundary catalog correction is already present.\n');
}else{
  if(wrong.length!==1||wrongRuntime.length!==1||correct.length!==1||correctRuntime.length!==1)throw new Error('The expected India duplicate layers do not match; no files were changed.');
  const [bad,valid]=[wrong[0],correct[0]];
  const sameSource=bad.countryCode==='IND'&&bad.level==='ADM1'&&bad.unitCount===1&&
    valid.countryCode==='IND'&&valid.level==='ADM1'&&valid.unitCount===36&&bad.geoJsonUrl===valid.geoJsonUrl;
  const badRuntime=wrongRuntime[0],validRuntime=correctRuntime[0];
  const sameRuntimeSource=badRuntime.countryCode==='IND'&&badRuntime.level==='ADM1'&&validRuntime.countryCode==='IND'&&
    validRuntime.level==='ADM1'&&badRuntime.geoJsonUrl===validRuntime.geoJsonUrl;
  const duplicateCount=source.filter(item=>item.countryCode==='IND'&&item.level==='ADM1'&&item.geoJsonUrl===bad.geoJsonUrl).length;
  if(!sameSource||!sameRuntimeSource||duplicateCount!==2||!bad.boundaryId.startsWith('IND-ADM0-')||!valid.boundaryId.startsWith('IND-ADM1-'))throw new Error('India ADM1 mismatch differs from the audited duplicate; no files were changed.');
  catalog.boundaries.layers=source.filter(item=>item.boundaryId!==wrongId);
  runtime.boundaries.adminLayers=adminLayers.filter(item=>item.boundaryId!==wrongId);
}

const cleanLayers=catalog.boundaries.layers;
const seenSources=new Set();
for(const layer of cleanLayers){
  if(!layer.boundaryId.startsWith(`${layer.countryCode}-${layer.level}-`))throw new Error(`Boundary ID level mismatch remains: ${layer.boundaryId}`);
  const sourceKey=`${layer.countryCode}|${layer.level}|${layer.geoJsonUrl}`;
  if(seenSources.has(sourceKey))throw new Error(`Duplicate boundary source remains: ${sourceKey}`);
  seenSources.add(sourceKey);
}

const layerCounts=Object.fromEntries(['ADM0','ADM1','ADM2'].map(level=>[level,cleanLayers.filter(item=>item.level===level).length]));
const admin0CountryCount=new Set(cleanLayers.filter(item=>item.level==='ADM0').map(item=>item.countryCode)).size;
catalog.boundaries.layerCounts=layerCounts;
runtime.boundaries.layerCounts=layerCounts;
catalog.boundaries.countryLayers=admin0CountryCount;
runtime.boundaries.countryLayers=admin0CountryCount;
const countries=new Set(catalog.population.datasets.map(item=>item.countryCode));
const withBoundaries=new Set(cleanLayers.map(item=>item.countryCode).filter(code=>countries.has(code)));
const withAdm0=new Set(cleanLayers.filter(item=>item.level==='ADM0').map(item=>item.countryCode).filter(code=>countries.has(code)));
const coverage={
  populationDatasetCountryCount:countries.size,
  countriesWithBoundaries:withBoundaries.size,
  countriesWithoutBoundariesCountryCodes:[...countries].filter(code=>!withBoundaries.has(code)).sort(),
  countriesWithoutADM0CountryCodes:[...countries].filter(code=>!withAdm0.has(code)).sort()
};
catalog.boundaries.countryCoverage=coverage;
runtime.boundaries.countryCoverage=coverage;
delete catalog.manifestSha256;
catalog.manifestSha256=hash(catalog);
delete runtime.manifestSha256;
runtime.manifestSha256=hash(runtime);

const catalogText=`${JSON.stringify(catalog,null,2)}\n`;
const runtimeText=`${JSON.stringify(runtime,null,2)}\n`;
const releaseDirectory=resolve(releases,catalog.manifestSha256);
await mkdir(releaseDirectory,{recursive:true});
await writeImmutable(resolve(releaseDirectory,'catalog.json'),catalogText);
await writeImmutable(resolve(releaseDirectory,'service-catalog.json'),runtimeText);
await replaceAtomically(catalogPath,catalogText);
await replaceAtomically(runtimePath,runtimeText);
process.stdout.write(JSON.stringify({removedLayerId:wrongId,retainedLayerId:correctId,layerCounts,countryLayers:admin0CountryCount,countryCoverage:coverage,catalogSha256:catalog.manifestSha256,runtimeSha256:runtime.manifestSha256},null,2)+'\n');
