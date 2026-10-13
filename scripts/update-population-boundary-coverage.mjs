import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=resolve(root,'data/population/catalog.json');
const runtimePath=resolve(root,'data/population/service-catalog.json');
const releases=resolve(root,'data/population/releases');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

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
const {manifestSha256:oldCatalogHash,...catalogPayload}=catalog;
const {manifestSha256:oldRuntimeHash,...runtimePayload}=runtime;
if(hash(catalogPayload)!==oldCatalogHash||hash(runtimePayload)!==oldRuntimeHash)throw new Error('An input population catalog checksum is invalid; no files were changed.');
const populationCountries=new Set(catalog.population.datasets.map(item=>item.countryCode));
if(populationCountries.size!==catalog.population.datasets.length||populationCountries.size!==runtime.population.datasets.length)throw new Error('Population catalog country coverage is inconsistent.');
const sourceLayerIds=catalog.boundaries.layers.map(item=>item.boundaryId).sort();
const runtimeLayerIds=runtime.boundaries.adminLayers.map(item=>item.boundaryId).sort();
if(JSON.stringify(sourceLayerIds)!==JSON.stringify(runtimeLayerIds))throw new Error('The source and runtime boundary catalogs do not contain the same layers.');
if(new Set(sourceLayerIds).size!==sourceLayerIds.length)throw new Error('The source boundary catalog repeats a stable layer ID.');
const seenBoundarySources=new Set();
for(const layer of catalog.boundaries.layers){
  if(!layer.boundaryId.startsWith(`${layer.countryCode}-${layer.level}-`))throw new Error(`Boundary ID level differs from its declared level: ${layer.boundaryId}`);
  const sourceKey=`${layer.countryCode}|${layer.level}|${layer.geoJsonUrl}`;
  if(seenBoundarySources.has(sourceKey))throw new Error(`The source boundary catalog repeats ${layer.countryCode} ${layer.level} GeoJSON URL.`);
  seenBoundarySources.add(sourceKey);
}
const layerCounts=Object.fromEntries(['ADM0','ADM1','ADM2'].map(level=>[level,catalog.boundaries.layers.filter(item=>item.level===level).length]));
catalog.boundaries.layerCounts=layerCounts;
runtime.boundaries.layerCounts=layerCounts;
const admin0CountryCount=new Set(catalog.boundaries.layers.filter(item=>item.level==='ADM0').map(item=>item.countryCode)).size;
catalog.boundaries.countryLayers=admin0CountryCount;
runtime.boundaries.countryLayers=admin0CountryCount;
const countriesWithBoundaries=new Set(catalog.boundaries.layers.map(item=>item.countryCode).filter(code=>populationCountries.has(code)));
const countriesWithAdm0=new Set(catalog.boundaries.layers.filter(item=>item.level==='ADM0').map(item=>item.countryCode).filter(code=>populationCountries.has(code)));
const coverage={
  populationDatasetCountryCount:populationCountries.size,
  countriesWithBoundaries:countriesWithBoundaries.size,
  countriesWithoutBoundariesCountryCodes:[...populationCountries].filter(code=>!countriesWithBoundaries.has(code)).sort(),
  countriesWithoutADM0CountryCodes:[...populationCountries].filter(code=>!countriesWithAdm0.has(code)).sort()
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
console.log(JSON.stringify({catalogSha256:catalog.manifestSha256,runtimeSha256:runtime.manifestSha256,...coverage},null,2));
