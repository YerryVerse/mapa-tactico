import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'data/population/catalog.json');
const runtimeOutput=resolve(root,'data/population/service-catalog.json');
const releases=resolve(root,'data/population/releases');
const stac='https://api.stac.worldpop.org';
const boundaries='https://www.geoboundaries.org/api/current/gbOpen/ALL';
const populationQuery={year:{eq:2025},resolution:{eq:'100m'},Release:{eq:'R2025A'},project:{eq:'Population'}};
const clean=value=>typeof value==='string'&&(!value.trim()||/^nan$/i.test(value.trim()))?null:value;

async function writeImmutable(path,content){
  const temporary=`${path}.${randomUUID()}.tmp`;
  await writeFile(temporary,content,{encoding:'utf8',flag:'wx'});
  try{await rename(temporary,path);}catch(error){
    try{const existing=await readFile(path,'utf8');if(existing===content)return;}catch{}
    throw error;
  }
}
async function replaceAtomically(path,content){
  const temporary=`${path}.${randomUUID()}.tmp`;
  await writeFile(temporary,content,{encoding:'utf8',flag:'wx'});
  await rename(temporary,path);
}

async function getJson(url,init){
  const response=await fetch(url,{...init,signal:AbortSignal.timeout(45_000)});
  if(!response.ok)throw new Error(`${response.status} ${response.statusText} from ${new URL(url).host}`);
  const type=response.headers.get('content-type')??'';
  if(!/json/i.test(type))throw new Error(`Non-JSON response from ${new URL(url).host}`);
  return response.json();
}

const collectionReply=await getJson(`${stac}/collections`);
if(!Array.isArray(collectionReply.collections))throw new Error('WorldPop STAC did not return a collections list');
const collectionIds=collectionReply.collections.map(item=>item.id).filter(id=>typeof id==='string'&&/^[A-Z]{3}$/.test(id)).sort();
if(collectionIds.length<200)throw new Error(`Unexpected WorldPop collection count: ${collectionIds.length}`);

let pageBody={collections:collectionIds,limit:1000,query:populationQuery};
const items=[];
for(let page=0;page<10;page++){
  const reply=await getJson(`${stac}/search`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(pageBody)});
  if(!Array.isArray(reply.features))throw new Error('WorldPop STAC returned an invalid item collection');
  items.push(...reply.features);
  const next=reply.links?.find(link=>link.rel==='next');
  if(!next)break;
  if(page===9)throw new Error('WorldPop STAC pagination exceeded the safety bound');
  const nextUrl=new URL(next.href,stac);
  if(nextUrl.origin!==stac)throw new Error('WorldPop STAC supplied a pagination link outside its own host');
  pageBody=next.body;
  if(!pageBody||typeof pageBody!=='object')throw new Error('WorldPop STAC supplied an invalid next-page request');
}

const countryData=items.filter(item=>item?.properties?.project==='Population'&&item?.properties?.year===2025&&item?.properties?.resolution==='100m'&&item?.properties?.Release==='R2025A'&&typeof item?.id==='string'&&/_pop_2025_CN_100m_R2025A_v1$/i.test(item.id));
const datasets=countryData.map(item=>{
  const p=item.properties??{},asset=item.assets?.data??{};
  if(!/^[A-Z]{3}$/.test(item.collection??'')||!/^https:\/\/data\.worldpop\.org\//.test(asset.href??''))throw new Error(`Invalid dataset reference: ${item.id}`);
  const record={
    countryCode:item.collection,
    countryName:p.name,
    datasetId:item.id,
    year:p.year,
    edition:`${p.Release}-${p.Version}`,
    resolution:p.resolution,
    units:'people_per_grid_cell',
    crs:p['projection:epsg']===4326?'EPSG:4326':p['projection:epsg'],
    pixelSizeDegrees:p['data:pixel_size'],
    dimensions:{width:p['data:width'],height:p['data:height']},
    dataType:p['data:data_type'],
    noDataValue:p['data:nodata_value'],
    compression:p['data:compression'],
    bounds:item.bbox,
    fileSize:p.size,
    dataUrl:asset.href,
    doi:p['Digital Object Identifier (DOI)'],
    description:clean(p.description),
    providerChecksum:null
  };
  record.metadataSha256=createHash('sha256').update(JSON.stringify(record)).digest('hex');
  return record;
}).sort((a,b)=>a.countryCode.localeCompare(b.countryCode));
const datasetCountries=new Set(datasets.map(item=>item.countryCode));
if(datasetCountries.size!==datasets.length)throw new Error('WorldPop STAC returned duplicate 2025 country datasets');

const adminLayers=[];
for(const level of ['ADM0','ADM1','ADM2']){
  const reply=await getJson(`${boundaries}/${level}/`);
  if(!Array.isArray(reply))throw new Error(`geoBoundaries did not return the ${level} catalog`);
  for(const item of reply){
    if(item.boundaryType!==level||!/^[A-Z]{3}$/.test(item.boundaryISO??'')||!/^https:\/\//.test(item.gjDownloadURL??''))throw new Error(`Invalid geoBoundaries ${level} record`);
    adminLayers.push({
      boundaryId:item.boundaryID,
      countryCode:item.boundaryISO,
      level:item.boundaryType,
      boundaryYear:item.boundaryYearRepresented,
      name:item.boundaryName,
      source:item.boundarySource,
      license:item.boundaryLicense,
      licenseDetails:clean(item.licenseDetail),
      primarySourceUrl:clean(item.boundarySourceURL),
      buildDate:item.buildDate,
      unitCount:Number(item.admUnitCount),
      geoJsonUrl:item.gjDownloadURL,
      simplifiedGeoJsonUrl:clean(item.simplifiedGeometryGeoJSON)
    });
  }
}
adminLayers.sort((a,b)=>a.countryCode.localeCompare(b.countryCode)||a.level.localeCompare(b.level));
const adm0Countries=new Set(adminLayers.filter(item=>item.level==='ADM0').map(item=>item.countryCode));
const boundarySummary=Object.fromEntries(['ADM0','ADM1','ADM2'].map(level=>[level,adminLayers.filter(item=>item.level===level).length]));

const catalog={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  population:{
    provider:'WorldPop Global 2',
    api:'https://api.worldpop.org/v2',
    stac:'https://api.stac.worldpop.org',
    release:'R2025A',
    releaseVersion:'v1',
    year:2025,
    resolution:'100m',
    cellUnits:'people per grid cell; do not multiply by area',
    licensing:'CC-BY-4.0',
    doi:'10.5258/SOTON/WP00839',
    crs:'EPSG:4326',
    noDataValue:-99999,
    anonymousDailyApiCalls:1000,
    anonymousMaximumAreaKm2:50000,
    manifestCountries:collectionIds.length,
    availableCountryDatasets:datasetCountries.size,
    unavailableCountryCodes:collectionIds.filter(code=>!datasetCountries.has(code)),
    datasets
  },
  boundaries:{
    provider:'geoBoundaries',
    releaseType:'gbOpen',
    releaseApi:'https://www.geoboundaries.org/api/current/gbOpen/ALL/{ADM_LEVEL}/',
    licensePolicy:'gbOpen is the open CC-BY 4.0 release; preserve each source boundary license and attribution from the layer metadata.',
    countryLayers:adm0Countries.size,
    layerCounts:boundarySummary,
    adminUnitDefinition:'An administrative unit is not automatically equivalent to a city. The UI must show the selected administrative level and boundary year.',
    layers:adminLayers
  }
};
catalog.manifestSha256=createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
const runtime={
  schemaVersion:1,
  generatedAt:catalog.generatedAt,
  population:{
    provider:catalog.population.provider,
    api:catalog.population.api,
    release:catalog.population.release,
    releaseVersion:catalog.population.releaseVersion,
    year:catalog.population.year,
    resolution:catalog.population.resolution,
    cellUnits:catalog.population.cellUnits,
    noDataValue:catalog.population.noDataValue,
    licensing:catalog.population.licensing,
    doi:catalog.population.doi,
    crs:catalog.population.crs,
    anonymousDailyApiCalls:catalog.population.anonymousDailyApiCalls,
    anonymousMaximumAreaKm2:catalog.population.anonymousMaximumAreaKm2,
    availableCountryDatasets:catalog.population.availableCountryDatasets,
    unavailableCountryCodes:catalog.population.unavailableCountryCodes,
    datasets:catalog.population.datasets.map(item=>({countryCode:item.countryCode,datasetId:item.datasetId}))
  },
  boundaries:{
    provider:catalog.boundaries.provider,
    releaseType:catalog.boundaries.releaseType,
    layerCounts:catalog.boundaries.layerCounts,
    adminLayers:catalog.boundaries.layers.map(item=>({
      boundaryId:item.boundaryId,
      countryCode:item.countryCode,
      level:item.level,
      boundaryYear:item.boundaryYear,
      name:item.name,
      source:item.source,
      license:item.license,
      geoJsonUrl:item.geoJsonUrl
    }))
  }
};
runtime.manifestSha256=createHash('sha256').update(JSON.stringify(runtime)).digest('hex');
await mkdir(dirname(output),{recursive:true});
const catalogText=`${JSON.stringify(catalog,null,2)}\n`,runtimeText=`${JSON.stringify(runtime,null,2)}\n`;
const releaseDirectory=resolve(releases,catalog.manifestSha256);
await mkdir(releaseDirectory,{recursive:true});
await writeImmutable(resolve(releaseDirectory,'catalog.json'),catalogText);
await writeImmutable(resolve(releaseDirectory,'service-catalog.json'),runtimeText);
await replaceAtomically(output,catalogText);
await replaceAtomically(runtimeOutput,runtimeText);
console.log(`Catalog written: ${output}`);
console.log(`WorldPop ${datasets.length}/${collectionIds.length} countries; no data for ${catalog.population.unavailableCountryCodes.join(', ')}`);
console.log(`Runtime catalog written: ${runtimeOutput}`);
console.log(`geoBoundaries layers: ${JSON.stringify(boundarySummary)}; manifest SHA-256 ${catalog.manifestSha256}; runtime SHA-256 ${runtime.manifestSha256}`);
