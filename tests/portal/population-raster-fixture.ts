import {deflateSync} from 'node:zlib';
import {vi} from 'vitest';
import {adminLayerById,adminLayersForCountry,populationDataset,populationCatalogSummary} from '../../lib/population-catalog';
import {POPULATION_BLOCK_CELLS,POPULATION_BLOCK_DATA_BYTES,POPULATION_BLOCK_HEIGHT,POPULATION_BLOCK_MASK_BYTES,POPULATION_BLOCK_WIDTH,populationBlockCrc32} from '../../lib/population-block-format';
import type {PopulationGeometry} from '../../lib/population-contract';

const sourceSha256='a'.repeat(64);
const geometry:PopulationGeometry={type:'Polygon',coordinates:[[[-0.15,51.50],[-0.10,51.50],[-0.10,51.48],[-0.15,51.48],[-0.15,51.50]]]};
const boundaryLayerId='GBR-ADM2-9080712';
const featureId='9080712B54935279696040';
const bytesFromHex=(value:string)=>Uint8Array.from(value.match(/.{2}/g)??[],byte=>Number.parseInt(byte,16));
async function sha256(bytes:Uint8Array){
  const copy=Uint8Array.from(bytes);
  const digest=await crypto.subtle.digest('SHA-256',copy.buffer);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function populationRasterFixture(options:{corruptCrc?:boolean;indexedBoundary?:boolean}={}){
  const dataset=populationDataset('GBR');
  if(!dataset)throw new Error('GBR fixture requires the pinned population catalog');
  const transform=[0.00083333333,0,-8.649167352070009,0,-0.00083333333,60.85583342591];
  const width=dataset.dimensions.width,height=dataset.dimensions.height;
  const [pixelWidth,,originX,,pixelHeight,originY]=transform;
  const centerColumn=Math.floor((-0.125-originX)/pixelWidth);
  const centerRow=Math.floor((originY-51.49)/Math.abs(pixelHeight));
  const tileColumn=Math.floor(centerColumn/POPULATION_BLOCK_WIDTH),tileRow=Math.floor(centerRow/POPULATION_BLOCK_HEIGHT);
  const tileValues=new Float32Array(POPULATION_BLOCK_CELLS);tileValues.fill(1);
  const invalidCell=(centerRow-tileRow*POPULATION_BLOCK_HEIGHT)*POPULATION_BLOCK_WIDTH+(centerColumn-tileColumn*POPULATION_BLOCK_WIDTH);
  const zeroCell=invalidCell+1;
  tileValues[invalidCell]=-99999;tileValues[zeroCell]=0;
  const data=new Uint8Array(POPULATION_BLOCK_DATA_BYTES+POPULATION_BLOCK_MASK_BYTES);
  data.set(new Uint8Array(tileValues.buffer));
  data.fill(255,POPULATION_BLOCK_DATA_BYTES);
  const maskIndex=POPULATION_BLOCK_DATA_BYTES+(invalidCell>>>3);
  data[maskIndex]&=~(1<<(invalidCell&7));
  const compressed=new Uint8Array(deflateSync(data));
  const crc=populationBlockCrc32(data)^(options.corruptCrc?1:0);

  const columns=Math.ceil(width/POPULATION_BLOCK_WIDTH),rows=Math.ceil(height/POPULATION_BLOCK_HEIGHT);
  const index=new Uint8Array(76+columns*rows*16),view=new DataView(index.buffer);
  index.set(new TextEncoder().encode('MTPOP001'),0);
  view.setUint32(8,1,true);view.setUint16(12,POPULATION_BLOCK_WIDTH,true);view.setUint16(14,POPULATION_BLOCK_HEIGHT,true);
  view.setUint32(16,columns,true);view.setUint32(20,rows,true);view.setUint32(24,width,true);view.setUint32(28,height,true);
  view.setUint32(32,16,true);view.setBigUint64(36,BigInt(compressed.byteLength),true);index.set(bytesFromHex(sourceSha256),44);
  const recordOffset=76+(tileRow*columns+tileColumn)*16;
  view.setBigUint64(recordOffset,BigInt(0),true);view.setUint32(recordOffset+8,compressed.byteLength,true);view.setUint32(recordOffset+12,crc,true);

  const sourcePrefix=`population/releases/R2025A-v1/GBR/${sourceSha256}`;
  let intersectedGridCells=0;
  for(let row=tileRow*POPULATION_BLOCK_HEIGHT;row<(tileRow+1)*POPULATION_BLOCK_HEIGHT;row++){
    const latitude=originY+(row+0.5)*pixelHeight;
    if(latitude<=51.48||latitude>=51.50)continue;
    for(let column=tileColumn*POPULATION_BLOCK_WIDTH;column<(tileColumn+1)*POPULATION_BLOCK_WIDTH;column++){
      const longitude=originX+(column+0.5)*pixelWidth;
      if(longitude>-0.15&&longitude<-0.10)intersectedGridCells++;
    }
  }
  const validGridCells=intersectedGridCells-1;
  const boundaryLayer=adminLayerById(boundaryLayerId);
  if(!boundaryLayer)throw new Error('GBR administrative aggregate fixture requires its pinned boundary layer');
  const boundarySourceSha256='b'.repeat(64),shard=(await sha256(new TextEncoder().encode(featureId))).slice(0,2);
  const aggregateKey=`${sourcePrefix}/aggregates/${boundaryLayerId}/${shard}.json`;
  const aggregatePayload={schemaVersion:1,countryCode:'GBR',datasetId:dataset.datasetId,boundaryLayerId,boundaryYear:boundaryLayer.boundaryYear,boundarySourceSha256,sourceSha256,method:'cell_center_inside_polygon',shard,records:{[featureId]:{population:validGridCells-1,validGridCells,intersectedGridCells,noDataGridCells:1}}};
  const aggregateBytes=new TextEncoder().encode(JSON.stringify(aggregatePayload));
  const displayRecord=new TextEncoder().encode(JSON.stringify({featureId,geometry})+'\n');
  const boundaryIndexBytes=new TextEncoder().encode(JSON.stringify({schemaVersion:1,countryCode:'GBR',boundaryLayerId,boundaryYear:boundaryLayer.boundaryYear,boundarySourceSha256,sourceBytes:12_000_001,featureCount:1,features:[{featureId,name:'Westminster',aliases:['City of Westminster'],geometryType:'Polygon',areaKm2:19.8,geometryOffset:0,geometryBytes:displayRecord.byteLength,geometrySha256:await sha256(displayRecord),geometrySimplified:false,sourceVertices:5,displayVertices:5,displayToleranceDegrees:0}]}));
  const boundaryPrefix=`${sourcePrefix}/boundary-data/${boundaryLayerId}`;
  const boundaryData=options.indexedBoundary?{sourceBytes:12_000_001,sourceSha256:boundarySourceSha256,featureCount:1,index:{key:`${boundaryPrefix}/index.json`,bytes:boundaryIndexBytes.byteLength,sha256:await sha256(boundaryIndexBytes)},display:{key:`${boundaryPrefix}/display.ndjson`,bytes:displayRecord.byteLength,sha256:await sha256(displayRecord)}}:undefined;
  const manifest={
    schemaVersion:1,countryCode:'GBR',datasetId:dataset.datasetId,provider:'WorldPop Global 2',edition:dataset.edition,year:2025,resolution:'100m',units:'people_per_grid_cell',license:'CC-BY-4.0',doi:'10.5258/SOTON/WP00839',
    sourceSha256,crs:'EPSG:4326',transform,width,height,dataType:'Float32',byteOrder:'little-endian',noDataValue:-99999,mask:'explicit-validity-bitset-lsb-first',compression:'zlib-deflate',
    block:{width:512,height:512,rows,columns,recordBytes:16,indexHeaderBytes:76,expandedBytesMaximum:POPULATION_BLOCK_DATA_BYTES+POPULATION_BLOCK_MASK_BYTES,indexLayout:'MTPOP001; row-major; uint64-le offset, uint32-le compressed length, uint32-le CRC-32'},
    administrativeAggregates:[{boundaryLayerId,boundaryYear:boundaryLayer.boundaryYear,sourceUrl:boundaryLayer.geoJsonUrl,sourceSha256:boundarySourceSha256,boundarySourceBytes:options.indexedBoundary?12_000_001:1_000,featureCount:1,shards:[{shard,key:aggregateKey,bytes:aggregateBytes.byteLength,sha256:await sha256(aggregateBytes),features:1}],...(boundaryData?{boundaryData}:{})}],
    administrativeCoverage:{status:'available',layers:adminLayersForCountry('GBR').length,features:1},
    storage:{
      data:{key:`${sourcePrefix}/data.bin`,bytes:compressed.byteLength,sha256:await sha256(compressed)},
      index:{key:`${sourcePrefix}/index.bin`,bytes:index.byteLength,sha256:await sha256(index)}
    }
  };
  const manifestBytes=new TextEncoder().encode(JSON.stringify(manifest));
  const manifestKey=`${sourcePrefix}/manifest.json`,manifestSha256=await sha256(manifestBytes);
  const active={schemaVersion:1,release:'R2025A-v1',year:2025,resolution:'100m',catalogSha256:populationCatalogSummary.manifestSha256,countries:{GBR:{manifestKey,manifestSha256,sourceSha256,datasetId:dataset.datasetId}}};
  const objects=new Map<string,Uint8Array>([
    ['population/active.json',new TextEncoder().encode(JSON.stringify(active))],
    [manifestKey,manifestBytes],
    [manifest.storage.index.key,index],
    [manifest.storage.data.key,compressed],
    [aggregateKey,aggregateBytes],
    ...(boundaryData?[[boundaryData.index.key,boundaryIndexBytes],[boundaryData.display.key,displayRecord]] as [string,Uint8Array][]:[])
  ]);
  const rangeReads:{key:string;offset:number;length:number}[]=[];
  const objectFor=(key:string,options?:{range?:{offset:number;length:number}})=>{
    const stored=objects.get(key);if(!stored)return null;
    const range=options?.range;
    if(range)rangeReads.push({key,offset:range.offset,length:range.length});
    const response=range?stored.slice(range.offset,range.offset+range.length):stored;
    return {key,size:stored.byteLength,range,arrayBuffer:async()=>Uint8Array.from(response).buffer};
  };
  const bucket={get:async(key:string,options?:{range?:{offset:number;length:number}})=>objectFor(key,options),head:async(key:string)=>{const stored=objects.get(key);return stored?{key,size:stored.byteLength}:null;}} as unknown as R2Bucket;
  return {bucket,geometry,rangeReads,objects,manifest,active,invalidCell,zeroCell,aggregatePayload,aggregateKey};
}

export function populationDatabase(options:{allow?:boolean}={}){
  const first=vi.fn(async()=>options.allow===false?null:{hits:1});
  const bind=vi.fn(()=>({first}));
  const prepare=vi.fn(()=>({bind}));
  return {db:{prepare} as unknown as D1Database,prepare,bind,first};
}

export function populationMemoryCache(){
  const records=new Map<string,Response>();
  const match=vi.fn(async(key:Request)=>records.get(key.url)?.clone());
  const put=vi.fn(async(key:Request,value:Response)=>{records.set(key.url,value.clone());});
  return {cache:{match,put} as unknown as Cache,records,match,put};
}
