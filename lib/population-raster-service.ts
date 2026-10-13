import {
  decodePopulationBlock,
  readPopulationBlockIndexHeader,
  readPopulationBlockRecord,
  type PopulationBlockIndex
} from './population-block-format';
import {adminLayerById,adminLayersForCountry,populationDataset,populationCatalogSummary} from './population-catalog';
import {POPULATION_RELEASE,type PopulationGeometry} from './population-contract';
import {POPULATION_BLOCK_HEIGHT,POPULATION_BLOCK_WIDTH} from './population-block-format';

const ACTIVE_MANIFEST_KEY='population/active.json';
const ACTIVE_MANIFEST_MAX_BYTES=2_000_000;
const COUNTRY_MANIFEST_MAX_BYTES=2_000_000;
const INDEX_MAX_BYTES=24_000_000;
const AGGREGATE_SHARD_MAX_BYTES=2_000_000;
const BOUNDARY_SOURCE_MAX_BYTES=12_000_000;
const BOUNDARY_INDEX_MAX_BYTES=10_000_000;
const BOUNDARY_DISPLAY_MAX_BYTES=500_000_000;
export const POPULATION_RASTER_MAX_BLOCKS_PER_QUERY=32;

type StoredAsset={key:string;bytes:number;sha256:string};
type ActiveCountry={manifestKey:string;manifestSha256:string;sourceSha256:string;datasetId:string};
type ActiveManifest={schemaVersion:1;release:string;year:number;resolution:string;catalogSha256:string;countries:Record<string,ActiveCountry>};
export type PopulationRasterActivation=ActiveManifest;
type AggregateShard={shard:string;key:string;bytes:number;sha256:string;features:number};
type BoundaryData={sourceBytes:number;sourceSha256:string;featureCount:number;index:StoredAsset;display:StoredAsset};
type AdministrativeAggregate={boundaryLayerId:string;boundaryYear:string;sourceUrl:string;sourceSha256:string;boundarySourceBytes:number;featureCount:number;shards:AggregateShard[];boundaryData?:BoundaryData};
type AdministrativeCoverage={status:'available';layers:number;features:number}|{status:'unavailable';reason:'no_pinned_geoboundaries_layer'};
export type PopulationCountryManifest={
  schemaVersion:number;
  countryCode:string;
  datasetId:string;
  provider:string;
  edition:string;
  year:number;
  resolution:string;
  units:string;
  license:string;
  doi:string;
  sourceSha256:string;
  crs:string;
  transform:number[];
  width:number;
  height:number;
  dataType:string;
  byteOrder:string;
  noDataValue:number;
  mask:string;
  compression:string;
  block:{width:number;height:number;rows:number;columns:number;recordBytes:number;indexHeaderBytes:number;expandedBytesMaximum:number;indexLayout:string};
  storage:{data:StoredAsset;index:StoredAsset};
  administrativeAggregates:AdministrativeAggregate[];
  administrativeCoverage:AdministrativeCoverage;
};
type CountryManifest=PopulationCountryManifest;
type PopulationBucket=Pick<R2Bucket,'get'|'head'>;
type RasterCache=Pick<Cache,'match'|'put'>;
type ErrorWithCode=Error&{populationError?:'provider_unavailable'|'provider_incompatible'|'query_failed'|'area_limit'|'no_coverage'};

function invalid(message:string):never{throw Object.assign(new Error(message),{populationError:'provider_incompatible'} satisfies Partial<ErrorWithCode>);}
function sha256Hex(bytes:ArrayBuffer|Uint8Array){
  const value=bytes instanceof Uint8Array?Uint8Array.from(bytes):new Uint8Array(bytes);
  return crypto.subtle.digest('SHA-256',value.buffer).then(digest=>Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''));
}
function requestKey(origin:string,name:string){return new Request(new URL(`/__population-raster-cache/${name}`,origin));}

async function readObjectBytes(object:R2ObjectBody,maxBytes:number){
  const expectedBytes=object.range&&'length' in object.range&&typeof object.range.length==='number'?object.range.length:object.size;
  if(expectedBytes>maxBytes)invalid('Population object exceeds its read limit');
  const bytes=await object.arrayBuffer();
  if(bytes.byteLength!==expectedBytes||bytes.byteLength>maxBytes)invalid('Population object length differs from its metadata');
  return new Uint8Array(bytes);
}

async function readJsonObject<T>(bucket:PopulationBucket,key:string,maxBytes:number):Promise<{value:T;bytes:Uint8Array}>{
  const object=await bucket.get(key);
  if(!object)throw Object.assign(new Error('Population object is not available'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
  const bytes=await readObjectBytes(object,maxBytes);
  let value:T;
  try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as T;}
  catch{invalid('Population manifest is not valid UTF-8 JSON');}
  return {value:value!,bytes};
}

function validateActiveManifest(value:unknown):ActiveManifest{
  if(!value||typeof value!=='object')invalid('Population activation manifest is malformed');
  const active=value as Record<string,unknown>;
  if(active.schemaVersion!==1||active.release!=='R2025A-v1'||active.year!==2025||active.resolution!=='100m'||active.catalogSha256!==populationCatalogSummary.manifestSha256||!active.countries||typeof active.countries!=='object')invalid('Population activation manifest is incompatible with the server catalog');
  const countries=active.countries as Record<string,unknown>;
  for(const [code,raw] of Object.entries(countries)){
    if(!/^[A-Z]{3}$/.test(code)||!raw||typeof raw!=='object')invalid('Population activation contains an invalid country entry');
    const entry=raw as Record<string,unknown>;
    if(typeof entry.manifestKey!=='string'||typeof entry.manifestSha256!=='string'||!/^[0-9a-f]{64}$/.test(entry.manifestSha256)||typeof entry.sourceSha256!=='string'||!/^[0-9a-f]{64}$/.test(entry.sourceSha256)||typeof entry.datasetId!=='string')invalid('Population activation country metadata is incomplete');
    if(!new RegExp(`^population/releases/R2025A-v1/${code}/[0-9a-f]{64}/manifest\\.json$`).test(String(entry.manifestKey))||entry.sourceSha256!==entry.manifestKey.split('/')[4])invalid('Population activation points outside its immutable release');
  }
  return active as unknown as ActiveManifest;
}

function validateCountryManifest(value:unknown,code:string,activeEntry:ActiveCountry):CountryManifest{
  if(!value||typeof value!=='object')invalid('Country raster manifest is malformed');
  const manifest=value as CountryManifest;
  const dataset=populationDataset(code);
  if(!dataset||manifest.schemaVersion!==1||manifest.countryCode!==code||manifest.datasetId!==dataset.datasetId||manifest.datasetId!==activeEntry.datasetId||manifest.provider!=='WorldPop Global 2'||manifest.edition!==dataset.edition||manifest.year!==2025||manifest.resolution!=='100m'||manifest.units!=='people_per_grid_cell'||manifest.license!=='CC-BY-4.0'||manifest.doi!=='10.5258/SOTON/WP00839'||manifest.crs!=='EPSG:4326'||manifest.dataType!=='Float32'||manifest.byteOrder!=='little-endian'||manifest.noDataValue!==-99999||manifest.mask!=='explicit-validity-bitset-lsb-first'||manifest.compression!=='zlib-deflate')invalid('Country raster metadata does not match the pinned WorldPop catalog');
  if(manifest.sourceSha256!==activeEntry.sourceSha256||!/^[0-9a-f]{64}$/.test(manifest.sourceSha256)||!Array.isArray(manifest.transform)||manifest.transform.length!==6||manifest.transform.some(value=>typeof value!=='number'||!Number.isFinite(value))||!Number.isSafeInteger(manifest.width)||!Number.isSafeInteger(manifest.height))invalid('Country raster grid metadata is invalid');
  if(manifest.width!==dataset.dimensions.width||manifest.height!==dataset.dimensions.height)invalid('Country raster dimensions differ from STAC');
  if(!manifest.block||manifest.block.width!==512||manifest.block.height!==512||manifest.block.recordBytes!==16||manifest.block.indexHeaderBytes!==76||!Number.isSafeInteger(manifest.block.rows)||!Number.isSafeInteger(manifest.block.columns)||manifest.block.rows<1||manifest.block.columns<1)invalid('Country raster block format is incompatible');
  if(manifest.block.rows!==Math.ceil(manifest.height/512)||manifest.block.columns!==Math.ceil(manifest.width/512))invalid('Country raster tile grid does not match its dimensions');
  const prefix=`population/releases/R2025A-v1/${code}/${manifest.sourceSha256}`;
  for(const [name,asset] of Object.entries(manifest.storage??{})){
    if(!asset||typeof asset!=='object'||!Number.isSafeInteger(asset.bytes)||asset.bytes<0||typeof asset.sha256!=='string'||!/^[0-9a-f]{64}$/.test(asset.sha256)||asset.key!==`${prefix}/${name}.bin`)invalid('Country raster asset pointer is invalid');
  }
  if(manifest.storage.data.bytes<0||manifest.storage.index.bytes!==manifest.block.indexHeaderBytes+manifest.block.rows*manifest.block.columns*manifest.block.recordBytes||manifest.storage.index.bytes>INDEX_MAX_BYTES)invalid('Country raster index length is outside its verified limit');
  if(!Array.isArray(manifest.administrativeAggregates))invalid('Country raster manifest has no prepared administrative aggregates');
  const expectedLayers=adminLayersForCountry(code);
  if(!manifest.administrativeCoverage||typeof manifest.administrativeCoverage!=='object')invalid('Country raster manifest has no administrative coverage status');
  if(expectedLayers.length===0){
    if(manifest.administrativeCoverage.status!=='unavailable'||manifest.administrativeCoverage.reason!=='no_pinned_geoboundaries_layer'||manifest.administrativeAggregates.length!==0)invalid('Country administrative coverage must identify the absence of pinned boundaries');
  }else if(manifest.administrativeCoverage.status!=='available'||manifest.administrativeCoverage.layers!==expectedLayers.length||!Number.isSafeInteger(manifest.administrativeCoverage.features)||manifest.administrativeCoverage.features<1){
    invalid('Country administrative coverage does not match the pinned geoBoundaries catalog');
  }
  const aggregateLayerIds=new Set<string>();
  for(const aggregate of manifest.administrativeAggregates){
    const layer=adminLayerById(aggregate.boundaryLayerId);
    if(!layer||layer.countryCode!==code||layer.boundaryYear!==aggregate.boundaryYear||layer.geoJsonUrl!==aggregate.sourceUrl||aggregateLayerIds.has(aggregate.boundaryLayerId)||!/^[0-9a-f]{64}$/.test(aggregate.sourceSha256)||!Number.isSafeInteger(aggregate.boundarySourceBytes)||aggregate.boundarySourceBytes<1||!Number.isSafeInteger(aggregate.featureCount)||aggregate.featureCount<1||!Array.isArray(aggregate.shards))invalid('Administrative aggregate metadata differs from the pinned geoBoundaries catalog');
    aggregateLayerIds.add(aggregate.boundaryLayerId);
    const boundaryData=aggregate.boundaryData;
    if(aggregate.boundarySourceBytes>BOUNDARY_SOURCE_MAX_BYTES&&!boundaryData)invalid('An oversized administrative boundary has no versioned R2 index');
    if(boundaryData){
      if(!boundaryData||typeof boundaryData!=='object'||!boundaryData.index||typeof boundaryData.index!=='object'||!boundaryData.display||typeof boundaryData.display!=='object')invalid('Versioned administrative boundary index is malformed');
      const boundaryPrefix=`${prefix}/boundary-data/${aggregate.boundaryLayerId}`;
      if(aggregate.boundarySourceBytes<=BOUNDARY_SOURCE_MAX_BYTES||boundaryData.sourceBytes!==aggregate.boundarySourceBytes||boundaryData.sourceSha256!==aggregate.sourceSha256||boundaryData.featureCount!==aggregate.featureCount||
        boundaryData.index.key!==`${boundaryPrefix}/index.json`||!Number.isSafeInteger(boundaryData.index.bytes)||boundaryData.index.bytes<2||boundaryData.index.bytes>BOUNDARY_INDEX_MAX_BYTES||!/^[0-9a-f]{64}$/.test(boundaryData.index.sha256)||
        boundaryData.display.key!==`${boundaryPrefix}/display.ndjson`||!Number.isSafeInteger(boundaryData.display.bytes)||boundaryData.display.bytes<2||boundaryData.display.bytes>BOUNDARY_DISPLAY_MAX_BYTES||!/^[0-9a-f]{64}$/.test(boundaryData.display.sha256))invalid('Versioned administrative boundary index is incompatible');
    }
    const shards=new Set<string>();let featureTotal=0;
    for(const shard of aggregate.shards){
      if(!/^[0-9a-f]{2}$/.test(shard.shard)||shards.has(shard.shard)||shard.key!==`${prefix}/aggregates/${aggregate.boundaryLayerId}/${shard.shard}.json`||!Number.isSafeInteger(shard.bytes)||shard.bytes<2||shard.bytes>AGGREGATE_SHARD_MAX_BYTES||!/^[0-9a-f]{64}$/.test(shard.sha256)||!Number.isSafeInteger(shard.features)||shard.features<1)invalid('Administrative aggregate shard pointer is invalid');
      shards.add(shard.shard);featureTotal+=shard.features;
    }
    if(featureTotal!==aggregate.featureCount)invalid('Administrative aggregate feature counts are incomplete');
  }
  return manifest;
}

async function activeManifest(bucket:PopulationBucket){
  const {value}=await readJsonObject<unknown>(bucket,ACTIVE_MANIFEST_KEY,ACTIVE_MANIFEST_MAX_BYTES);
  return validateActiveManifest(value);
}

export async function loadPopulationActivation(bucket:PopulationBucket){return activeManifest(bucket);}

export async function loadActivePopulationCountryManifest(bucket:PopulationBucket,countryCode:string):Promise<PopulationCountryManifest|undefined>{
  if(!/^[A-Z]{3}$/.test(countryCode)||!populationDataset(countryCode))invalid('Population country is not in the pinned catalog');
  const activation=await activeManifest(bucket),entry=activation.countries[countryCode];
  if(!entry)return undefined;
  const {value,bytes}=await readJsonObject<unknown>(bucket,entry.manifestKey,COUNTRY_MANIFEST_MAX_BYTES);
  if(await sha256Hex(bytes)!==entry.manifestSha256)invalid('Country raster manifest checksum is invalid');
  return validateCountryManifest(value,countryCode,entry);
}

export async function verifyPopulationCountryObjects(bucket:PopulationBucket,countryCode:string,entry:ActiveCountry,origin='https://population-ingest.invalid'){
  const activation:ActiveManifest={schemaVersion:1,release:'R2025A-v1',year:2025,resolution:'100m',catalogSha256:populationCatalogSummary.manifestSha256,countries:{[countryCode]:entry}};
  const prepared=await countryManifest(bucket,activation,countryCode,origin);
  if(!prepared)invalid('Country population objects are not available');
  return prepared.manifest;
}

async function countryManifest(bucket:PopulationBucket,active:ActiveManifest,code:string,origin:string,cache?:RasterCache){
  const entry=active.countries[code];
  if(!entry)return undefined;
  const {value,bytes}=await readJsonObject<unknown>(bucket,entry.manifestKey,COUNTRY_MANIFEST_MAX_BYTES);
  if(await sha256Hex(bytes)!==entry.manifestSha256)invalid('Country raster manifest checksum is invalid');
  const manifest=validateCountryManifest(value,code,entry);
  const cacheKey=requestKey(origin,`R2025A-v1/${code}/${entry.manifestSha256}/index`);
  let indexBytes:Uint8Array|undefined;
  const cached=await cache?.match(cacheKey);
  if(cached){
    const content=await cached.arrayBuffer();
    if(content.byteLength===manifest.storage.index.bytes&&await sha256Hex(content)===manifest.storage.index.sha256)indexBytes=new Uint8Array(content);
  }
  if(!indexBytes){
    const object=await bucket.get(manifest.storage.index.key);
    if(!object)throw Object.assign(new Error('Population block index is not available'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
    if(object.size!==manifest.storage.index.bytes)invalid('Population block index length differs from its manifest');
    indexBytes=await readObjectBytes(object,INDEX_MAX_BYTES);
    if(await sha256Hex(indexBytes)!==manifest.storage.index.sha256)invalid('Population block index checksum is invalid');
    if(cache)try{const cacheCopy=Uint8Array.from(indexBytes);await cache.put(cacheKey,new Response(cacheCopy.buffer,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'public, max-age=86400'}}));}catch{/* a validated block index does not depend on cache storage */}
  }
  const indexBuffer=new Uint8Array(indexBytes.byteLength);indexBuffer.set(indexBytes);
  const index=readPopulationBlockIndexHeader(indexBuffer.buffer,manifest.sourceSha256);
  if(index.width!==manifest.width||index.height!==manifest.height||index.dataBytes!==manifest.storage.data.bytes)invalid('Population index and raster manifest disagree');
  const dataObject=await bucket.head(manifest.storage.data.key);
  if(!dataObject||dataObject.size!==manifest.storage.data.bytes)throw Object.assign(new Error('Population block object is not available or has the wrong length'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
  return {manifest,index,indexBytes,dataObjectSize:dataObject.size,manifestSha256:entry.manifestSha256};
}

type Ring=Array<[number,number]>;
type Polygon=Ring[];

function geometryPolygons(geometry:PopulationGeometry):Polygon[]{return geometry.type==='Polygon'?[geometry.coordinates as Polygon]:geometry.coordinates as Polygon[];}

function polygonBounds(polygons:Polygon[]){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const polygon of polygons)for(const ring of polygon)for(const [x,y] of ring){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  return {minX,minY,maxX,maxY};
}

function cellRange(bounds:{minX:number;minY:number;maxX:number;maxY:number},manifest:CountryManifest){
  const [pixelWidth,,originX,,pixelHeight,originY]=manifest.transform;
  const minColumn=Math.max(0,Math.floor((bounds.minX-originX)/pixelWidth)-1);
  const maxColumn=Math.min(manifest.width-1,Math.ceil((bounds.maxX-originX)/pixelWidth)+1);
  const minRow=Math.max(0,Math.floor((bounds.maxY-originY)/pixelHeight)-1);
  const maxRow=Math.min(manifest.height-1,Math.ceil((bounds.minY-originY)/pixelHeight)+1);
  if(minColumn>maxColumn||minRow>maxRow)return undefined;
  return {minColumn,maxColumn,minRow,maxRow};
}

type ScanInterval=[number,number];

function ringScanIntervals(latitude:number,ring:Ring):ScanInterval[]{
  const crossings:number[]=[];
  for(let index=0,previous=ring.length-1;index<ring.length;previous=index++){
    const [x1,y1]=ring[index],[x2,y2]=ring[previous];
    if((y1>latitude)!==(y2>latitude))crossings.push((x2-x1)*(latitude-y1)/(y2-y1)+x1);
  }
  crossings.sort((a,b)=>a-b);
  const intervals:ScanInterval[]=[];
  for(let index=0;index+1<crossings.length;index+=2)if(crossings[index]<crossings[index+1])intervals.push([crossings[index],crossings[index+1]]);
  return intervals;
}

function subtractIntervals(subject:ScanInterval[],holes:ScanInterval[]){
  let result=subject;
  for(const [holeStart,holeEnd] of holes){
    const next:ScanInterval[]=[];
    for(const [start,end] of result){
      if(holeEnd<=start||holeStart>=end){next.push([start,end]);continue;}
      if(holeStart>start)next.push([start,Math.min(holeStart,end)]);
      if(holeEnd<end)next.push([Math.max(holeEnd,start),end]);
    }
    result=next;
  }
  return result;
}

function mergeIntervals(intervals:ScanInterval[]){
  intervals.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const merged:ScanInterval[]=[];
  for(const interval of intervals){
    const previous=merged.at(-1);
    if(previous&&interval[0]<=previous[1])previous[1]=Math.max(previous[1],interval[1]);
    else merged.push([interval[0],interval[1]]);
  }
  return merged;
}

function geometryScanIntervals(latitude:number,polygons:Polygon[]){
  const combined:ScanInterval[]=[];
  for(const polygon of polygons){
    const outer=ringScanIntervals(latitude,polygon[0]);
    if(!outer.length)continue;
    const holes=polygon.slice(1).flatMap(ring=>ringScanIntervals(latitude,ring));
    combined.push(...subtractIntervals(outer,holes));
  }
  return mergeIntervals(combined);
}

function intervalContains(longitude:number,intervals:ScanInterval[]){
  let low=0,high=intervals.length-1;
  while(low<=high){
    const middle=(low+high)>>>1,[start,end]=intervals[middle];
    if(longitude<start)high=middle-1;
    else if(longitude>=end)low=middle+1;
    else return true;
  }
  return false;
}

async function readCompressedBlock(bucket:PopulationBucket,manifest:CountryManifest,index:PopulationBlockIndex,indexBytes:Uint8Array,tileColumn:number,tileRow:number){
  const record=readPopulationBlockRecord(indexBytes,index,tileColumn,tileRow);
  if(record.compressedBytes===0)return undefined;
  const object=await bucket.get(manifest.storage.data.key,{range:{offset:record.offset,length:record.compressedBytes}});
  if(!object||object.size!==manifest.storage.data.bytes)throw Object.assign(new Error('Population block range is unavailable'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
  const bytes=await readObjectBytes(object,record.compressedBytes);
  if(bytes.byteLength!==record.compressedBytes)invalid('Population block range is truncated');
  try{return {record,block:await decodePopulationBlock(bytes,record)};}
  catch{invalid('Population raster block is corrupt or incompatible');}
}

export type RasterPopulationTotals={population:number;validGridCells:number;intersectedGridCells:number;noDataGridCells:number;processingTimeMs:number;dataVersion:string;datasets:Array<{countryCode:string;datasetId:string;sourceSha256:string}>};

export async function calculatePopulationFromAdminAggregate(input:{bucket:PopulationBucket;cache?:RasterCache;origin:string;countryCode:string;boundaryLayerId:string;featureId:string;activation?:PopulationRasterActivation;signal?:AbortSignal}){
  const active=input.activation??await activeManifest(input.bucket);
  if(active.release!==`${POPULATION_RELEASE}-v1`||active.catalogSha256!==populationCatalogSummary.manifestSha256)invalid('Population activation release is stale');
  const prepared=await countryManifest(input.bucket,active,input.countryCode,input.origin,input.cache);
  if(!prepared)throw Object.assign(new Error('Selected country has no activated population dataset'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
  const aggregate=prepared.manifest.administrativeAggregates.find(item=>item.boundaryLayerId===input.boundaryLayerId);
  if(!aggregate)throw Object.assign(new Error('Administrative aggregate is not activated'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
  const featureDigest=await sha256Hex(new TextEncoder().encode(input.featureId));
  const shard=aggregate.shards.find(item=>item.shard===featureDigest.slice(0,2));
  if(!shard)throw Object.assign(new Error('Administrative feature is not present in the pinned aggregate'),{populationError:'no_coverage'} satisfies Partial<ErrorWithCode>);
  if(input.signal?.aborted)throw Object.assign(new Error('Population query was cancelled'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
  const cacheKey=requestKey(input.origin,`R2025A-v1/${input.countryCode}/${aggregate.boundaryLayerId}/${shard.sha256}`);
  const content=await input.cache?.match(cacheKey);
  let bytes:Uint8Array|undefined;
  if(content){
    const cached=await content.arrayBuffer();
    if(cached.byteLength===shard.bytes&&await sha256Hex(cached)===shard.sha256)bytes=new Uint8Array(cached);
  }
  if(!bytes){
    const object=await input.bucket.get(shard.key);
    if(!object)throw Object.assign(new Error('Administrative aggregate shard is unavailable'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
    if(object.size!==shard.bytes)invalid('Administrative aggregate shard size differs from its manifest');
    bytes=await readObjectBytes(object,AGGREGATE_SHARD_MAX_BYTES);
    if(await sha256Hex(bytes)!==shard.sha256)invalid('Administrative aggregate shard checksum is invalid');
    if(input.cache)try{await input.cache.put(cacheKey,new Response(Uint8Array.from(bytes).buffer,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=86400'}}));}catch{/* verified aggregate shards remain usable when cache writes fail */}
  }
  let payload:unknown;try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{invalid('Administrative aggregate shard is not valid UTF-8 JSON');}
  if(!payload||typeof payload!=='object')invalid('Administrative aggregate shard is malformed');
  const value=payload as Record<string,unknown>,layer=adminLayerById(input.boundaryLayerId);
  if(!layer||layer.countryCode!==input.countryCode||value.schemaVersion!==1||value.countryCode!==input.countryCode||value.datasetId!==prepared.manifest.datasetId||value.boundaryLayerId!==aggregate.boundaryLayerId||value.boundaryYear!==aggregate.boundaryYear||value.boundarySourceSha256!==aggregate.sourceSha256||value.sourceSha256!==prepared.manifest.sourceSha256||value.method!=='cell_center_inside_polygon'||value.shard!==shard.shard||!value.records||typeof value.records!=='object')invalid('Administrative aggregate shard metadata is incompatible');
  const record=(value.records as Record<string,unknown>)[input.featureId];
  if(!record||typeof record!=='object')throw Object.assign(new Error('Administrative feature is not present in the pinned aggregate'),{populationError:'no_coverage'} satisfies Partial<ErrorWithCode>);
  const totals=record as Record<string,unknown>;
  const population=totals.population,validGridCells=totals.validGridCells,intersectedGridCells=totals.intersectedGridCells,noDataGridCells=totals.noDataGridCells;
  if(typeof population!=='number'||!Number.isFinite(population)||population<0||typeof validGridCells!=='number'||!Number.isSafeInteger(validGridCells)||typeof intersectedGridCells!=='number'||!Number.isSafeInteger(intersectedGridCells)||typeof noDataGridCells!=='number'||!Number.isSafeInteger(noDataGridCells)||validGridCells<0||intersectedGridCells<0||noDataGridCells<0||validGridCells+noDataGridCells!==intersectedGridCells)invalid('Administrative aggregate values are invalid');
  if(intersectedGridCells===0||validGridCells===0)throw Object.assign(new Error('Administrative feature has no valid population cells'),{populationError:'no_coverage'} satisfies Partial<ErrorWithCode>);
  return {
    population,
    validGridCells,
    intersectedGridCells,
    noDataGridCells,
    processingTimeMs:0,
    dataVersion:active.catalogSha256,
    datasets:[{countryCode:input.countryCode,datasetId:prepared.manifest.datasetId,sourceSha256:prepared.manifest.sourceSha256}],
    boundaryLayerId:aggregate.boundaryLayerId,
    featureId:input.featureId
  };
}

export async function calculatePopulationFromRasters(input:{bucket:PopulationBucket;cache?:RasterCache;origin:string;geometry:PopulationGeometry;countryCodes:string[];activation?:PopulationRasterActivation;maxBlocks?:number;signal?:AbortSignal;now?:()=>number}):Promise<RasterPopulationTotals>{
  const start=(input.now??Date.now)();
  const active=input.activation??await activeManifest(input.bucket);
  if(active.release!==`${POPULATION_RELEASE}-v1`||active.catalogSha256!==populationCatalogSummary.manifestSha256)invalid('Population activation release is stale');
  let population=0,validGridCells=0,intersectedGridCells=0,blockReads=0;
  const datasets:Array<{countryCode:string;datasetId:string;sourceSha256:string}> = [];
  for(const countryCode of [...input.countryCodes].sort()){
    const prepared=await countryManifest(input.bucket,active,countryCode,input.origin,input.cache);
    if(!prepared)throw Object.assign(new Error('Selected country has no activated population dataset'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
    const {manifest,index,indexBytes}=prepared;
    const polygons=geometryPolygons(input.geometry),bounds=polygonBounds(polygons),range=cellRange(bounds,manifest);
    if(!range)continue;
    const firstTileColumn=Math.floor(range.minColumn/POPULATION_BLOCK_WIDTH),lastTileColumn=Math.floor(range.maxColumn/POPULATION_BLOCK_WIDTH);
    const firstTileRow=Math.floor(range.minRow/POPULATION_BLOCK_HEIGHT),lastTileRow=Math.floor(range.maxRow/POPULATION_BLOCK_HEIGHT);
    const tileCount=(lastTileColumn-firstTileColumn+1)*(lastTileRow-firstTileRow+1);
    if(blockReads+tileCount>(input.maxBlocks??POPULATION_RASTER_MAX_BLOCKS_PER_QUERY))throw Object.assign(new Error('Population geometry requires more raster blocks than the worker budget allows'),{populationError:'area_limit'} satisfies Partial<ErrorWithCode>);
    const [pixelWidth,,originX,,pixelHeight,originY]=manifest.transform;
    const scanlines=new Map<number,ScanInterval[]>();
    for(let row=range.minRow;row<=range.maxRow;row++)scanlines.set(row,geometryScanIntervals(originY+(row+0.5)*pixelHeight,polygons));
    for(let tileRow=firstTileRow;tileRow<=lastTileRow;tileRow++)for(let tileColumn=firstTileColumn;tileColumn<=lastTileColumn;tileColumn++){
      if(input.signal?.aborted)throw Object.assign(new Error('Population query was cancelled'),{populationError:'provider_unavailable'} satisfies Partial<ErrorWithCode>);
      blockReads++;
      const loaded=await readCompressedBlock(input.bucket,manifest,index,indexBytes,tileColumn,tileRow);
      if(!loaded)continue;
      const tileOriginColumn=tileColumn*POPULATION_BLOCK_WIDTH,tileOriginRow=tileRow*POPULATION_BLOCK_HEIGHT;
      const firstColumn=Math.max(range.minColumn,tileOriginColumn),lastColumn=Math.min(range.maxColumn,tileOriginColumn+POPULATION_BLOCK_WIDTH-1,manifest.width-1);
      const firstRow=Math.max(range.minRow,tileOriginRow),lastRow=Math.min(range.maxRow,tileOriginRow+POPULATION_BLOCK_HEIGHT-1,manifest.height-1);
      for(let row=firstRow;row<=lastRow;row++){
        const intervals=scanlines.get(row)??[];
        for(let column=firstColumn;column<=lastColumn;column++){
          const longitude=originX+(column+0.5)*pixelWidth;
          if(!intervalContains(longitude,intervals))continue;
          const cellIndex=(row-tileOriginRow)*POPULATION_BLOCK_WIDTH+(column-tileOriginColumn);
          intersectedGridCells++;
          if(!loaded.block.isValid(cellIndex))continue;
          validGridCells++;
          population+=loaded.block.values[cellIndex];
        }
      }
    }
    datasets.push({countryCode,datasetId:manifest.datasetId,sourceSha256:manifest.sourceSha256});
  }
  if(intersectedGridCells===0||validGridCells===0)throw Object.assign(new Error('Selected geometry does not intersect valid cells in the activated population rasters'),{populationError:'no_coverage'} satisfies Partial<ErrorWithCode>);
  return {
    population,
    validGridCells,
    intersectedGridCells,
    noDataGridCells:intersectedGridCells-validGridCells,
    processingTimeMs:Math.max(0,Math.round((input.now??Date.now)()-start)),
    dataVersion:active.catalogSha256,
    datasets
  };
}
