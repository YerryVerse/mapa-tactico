import {existsSync,readdirSync} from 'node:fs';
import {readFile,stat,open} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {describe,it,expect} from 'vitest';
import {calculatePopulationFromRasters} from '../../lib/population-raster-service';
import {populationAdminResponse,searchAdministrativeBoundaries} from '../../lib/population-boundary-service';
import {populationAdminAggregateResponse} from '../../lib/population-service';
import {geodesicAreaKm2} from '../../lib/population-geometry';
import {populationDatabase} from './population-raster-fixture';
import {adminLayer,populationCatalogSummary,populationDataset} from '../../lib/population-catalog';
import type {PopulationGeometry} from '../../lib/population-contract';

const root=process.cwd();
const prepared=resolve(root,'.sites-runtime/population-work/prepared-MTPOP001/GBR/R2025A-v1-2025-100m');
const sourceFile=resolve(root,'.sites-runtime/population-work/boundaries/GBR-ADM2-9080712.geojson');
const hasRealData=existsSync(join(prepared,'manifest.json'))&&existsSync(sourceFile);
const australiaLayerId='AUS-ADM0-85198719';
const australiaFeatureId='85198719B13759021872828';
const australiaRoot=resolve(root,'.sites-runtime/population-work/prepared-MTPOP001/AUS');
const australiaVersion=existsSync(australiaRoot)?readdirSync(australiaRoot)[0]:undefined;
const australiaPrepared=australiaVersion?join(australiaRoot,australiaVersion):'';
const australiaSource=resolve(root,'.sites-runtime/population-work/boundaries',`${australiaLayerId}.geojson`);
const australiaIndexDir=join(australiaPrepared,'boundaries',australiaLayerId);
const hasAustraliaIndex=Boolean(australiaVersion&&existsSync(join(australiaPrepared,'manifest.json'))&&existsSync(australiaSource)&&existsSync(join(australiaIndexDir,'index.json'))&&existsSync(join(australiaIndexDir,'display.ndjson')));
const sha256=async(bytes:Uint8Array)=>{
  const copy=Uint8Array.from(bytes),digest=await crypto.subtle.digest('SHA-256',copy.buffer);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
};

describe('real WorldPop raster reference (opt-in when official files are prepared)',()=>{
  it.skipIf(!hasRealData)('matches the independent Rasterio administrative sum for Westminster within 1%',async()=>{
    const manifestBytes=new Uint8Array(await readFile(join(prepared,'manifest.json'))),manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestBytes));
    const manifestKey=manifest.storage.data.key.slice(0,manifest.storage.data.key.lastIndexOf('/'))+'/manifest.json';
    const indexPath=join(prepared,'index.bin'),dataPath=join(prepared,'data.bin');
    const active={schemaVersion:1,release:'R2025A-v1',year:2025,resolution:'100m',catalogSha256:(await import('../../lib/population-catalog')).populationCatalogSummary.manifestSha256,countries:{GBR:{manifestKey,manifestSha256:await sha256(manifestBytes),sourceSha256:manifest.sourceSha256,datasetId:manifest.datasetId}}};
    const activeBytes=new TextEncoder().encode(JSON.stringify(active));
    const paths=new Map<string,string>([[manifestKey,join(prepared,'manifest.json')],[manifest.storage.index.key,indexPath],[manifest.storage.data.key,dataPath]]);
    for(const layer of manifest.administrativeAggregates)for(const shard of layer.shards)paths.set(shard.key,join(prepared,'aggregates',layer.boundaryLayerId,`${shard.shard}.json`));
    const sizes=new Map<string,number>(await Promise.all([...paths].map(async([key,path])=>[key,(await stat(path)).size] as [string,number])));
    let rangeReads=0;
    const object=async(key:string,range?:{offset:number;length:number})=>{
      const path=paths.get(key);if(!path)return null;
      const size=sizes.get(key)??0;
      let bytes:Uint8Array;
      if(range){
        rangeReads++;
        const handle=await open(path,'r');try{bytes=new Uint8Array(range.length);await handle.read(bytes,0,range.length,range.offset);}finally{await handle.close();}
      }else bytes=new Uint8Array(await readFile(path));
      return {key,size,range,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
    };
    const bucket={
      get:async(key:string,options?:{range?:{offset:number;length:number}})=>key==='population/active.json'?{key,size:activeBytes.byteLength,arrayBuffer:async()=>Uint8Array.from(activeBytes).buffer}:object(key,options?.range),
      head:async(key:string)=>{const size=sizes.get(key);return size===undefined?null:{key,size};}
    } as unknown as R2Bucket;
    const boundaryPayload=JSON.parse(await readFile(sourceFile,'utf8')) as {features:Array<{properties:Record<string,unknown>;geometry:PopulationGeometry}>};
    const feature=boundaryPayload.features.find(item=>item.properties.shapeID==='9080712B54935279696040');
    expect(feature).toBeDefined();
    const shardId=await sha256(new TextEncoder().encode(String(feature?.properties.shapeID)));
    const aggregateRef=manifest.administrativeAggregates.find((item:{boundaryLayerId:string})=>item.boundaryLayerId==='GBR-ADM2-9080712')?.shards.find((item:{shard:string})=>item.shard===shardId.slice(0,2));
    expect(aggregateRef).toBeDefined();
    const aggregatePayload=JSON.parse(await readFile(join(prepared,'aggregates','GBR-ADM2-9080712',`${shardId.slice(0,2)}.json`),'utf8'));
    const reference=aggregatePayload.records[String(feature?.properties.shapeID)];
    const started=performance.now();
    const server=await calculatePopulationFromRasters({bucket,origin:'https://atlas.test',geometry:feature!.geometry,countryCodes:['GBR'],maxBlocks:32});
    const serverMs=Math.round(performance.now()-started),difference=Math.abs(server.population-reference.population),relativeDifference=difference/reference.population;
    const database=populationDatabase();
    const apiResponse=await populationAdminAggregateResponse(new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),{...database,bucket},{countryCode:'GBR',boundaryLayerId:'GBR-ADM2-9080712',featureId:String(feature!.properties.shapeID),geometry:feature!.geometry,boundary:{boundaryLayerId:'GBR-ADM2-9080712',featureId:String(feature!.properties.shapeID)}});
    const apiBody=await apiResponse.json() as Record<string,any>;
    console.log(JSON.stringify({case:'Westminster / GBR / WorldPop R2025A-v1 100m',servicePopulation:server.population,apiPopulation:apiBody.population,rasterioPopulation:reference.population,serviceCells:server.validGridCells,rasterioCells:reference.validGridCells,relativeDifferencePercent:Number((relativeDifference*100).toFixed(6)),serviceMs:serverMs,rangeReads,administrativeApiStatus:apiResponse.status}));
    expect(server.validGridCells).toBe(reference.validGridCells);
    expect(relativeDifference).toBeLessThan(0.01);
    expect(server.noDataGridCells).toBe(reference.noDataGridCells);
    expect(apiResponse.status).toBe(200);expect(apiBody.population).toBe(reference.population);expect(apiBody.coverage.validGridCells).toBe(reference.validGridCells);
    expect(rangeReads).toBeGreaterThan(0);
  },120_000);

  const germanyDataset=populationDataset('DEU')!;
  const germanyPrepared=resolve(root,'.sites-runtime/population-work/prepared-MTPOP001/DEU',`${germanyDataset.edition}-${germanyDataset.year}-${germanyDataset.resolution}`);
  const germanyLayer=adminLayer('DEU','ADM0')!;
  const germanySource=resolve(root,'.sites-runtime/population-work/source/DEU',`${germanyDataset.datasetId}.tif`);
  const germanyBoundary=resolve(root,'.sites-runtime/population-work/boundaries',`${germanyLayer.boundaryId}.geojson`);
  const hasGermanyData=existsSync(join(germanyPrepared,'manifest.json'))&&existsSync(germanySource)&&existsSync(germanyBoundary);
  it.skipIf(!hasGermanyData)('serves a prepared country aggregate above the external API 50,000 km² limit',async()=>{
    const manifestBytes=new Uint8Array(await readFile(join(germanyPrepared,'manifest.json'))),manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestBytes));
    const layerPayload=JSON.parse(await readFile(germanyBoundary,'utf8')) as {features:Array<{properties:Record<string,unknown>;geometry:PopulationGeometry}>};
    const feature=layerPayload.features.find(item=>item.properties.shapeGroup==='DEU'&&item.properties.shapeType==='ADM0');
    expect(feature).toBeDefined();
    const featureId=String(feature!.properties.shapeID),areaKm2=geodesicAreaKm2(feature!.geometry);
    expect(areaKm2).toBeGreaterThan(50_000);
    const reference=JSON.parse(execFileSync('python',[
      resolve(root,'scripts/verify-population-admin-rasterio.py'),
      '--country','DEU','--boundary-layer-id',germanyLayer.boundaryId,'--feature-id',featureId,
      '--source',germanySource,'--boundary',germanyBoundary
    ],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1',PYTHONPATH:resolve(root,'.sites-runtime/population-python')}})) as {population:number;validGridCells:number;intersectedGridCells:number;noDataGridCells:number};
    const manifestKey=`${manifest.storage.data.key.slice(0,manifest.storage.data.key.lastIndexOf('/'))}/manifest.json`;
    const paths=new Map<string,string>([[manifestKey,join(germanyPrepared,'manifest.json')],[manifest.storage.data.key,join(germanyPrepared,'data.bin')],[manifest.storage.index.key,join(germanyPrepared,'index.bin')]]);
    for(const aggregate of manifest.administrativeAggregates)for(const shard of aggregate.shards)paths.set(shard.key,join(germanyPrepared,'aggregates',aggregate.boundaryLayerId,`${shard.shard}.json`));
    const sizes=new Map<string,number>(await Promise.all([...paths].map(async([key,path])=>[key,(await stat(path)).size] as [string,number])));
    const manifestSha256=await sha256(manifestBytes),activeBytes=new TextEncoder().encode(JSON.stringify({
      schemaVersion:1,release:'R2025A-v1',year:2025,resolution:'100m',catalogSha256:populationCatalogSummary.manifestSha256,
      countries:{DEU:{manifestKey,manifestSha256,sourceSha256:manifest.sourceSha256,datasetId:manifest.datasetId}}
    }));
    const object=async(key:string,range?:{offset:number;length:number})=>{
      const path=paths.get(key);if(!path)return null;
      const size=sizes.get(key)??0;let bytes:Uint8Array;
      if(range){const handle=await open(path,'r');bytes=new Uint8Array(range.length);try{await handle.read(bytes,0,range.length,range.offset);}finally{await handle.close();}}
      else bytes=new Uint8Array(await readFile(path));
      return {key,size,range,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
    };
    const bucket={
      get:async(key:string,options?:{range?:{offset:number;length:number}})=>key==='population/active.json'?{key,size:activeBytes.byteLength,arrayBuffer:async()=>Uint8Array.from(activeBytes).buffer}:object(key,options?.range),
      head:async(key:string)=>{const size=sizes.get(key);return size===undefined?null:{key,size};}
    } as unknown as R2Bucket;
    const started=performance.now();
    const response=await populationAdminResponse(new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:germanyLayer.boundaryId,featureId})}),{
      ...populationDatabase(),bucket,
      fetcher:async()=>new Response(await readFile(germanyBoundary,'utf8'),{headers:{'Content-Type':'application/geo+json; charset=utf-8'}})
    });
    const body=await response.json() as Record<string,any>,elapsedMs=Math.round(performance.now()-started);
    console.log(JSON.stringify({case:'Germany / DEU / country ADM0 / WorldPop R2025A-v1',areaKm2:Math.round(areaKm2),servicePopulation:body.population,rasterioPopulation:reference.population,serviceCells:body.coverage?.validGridCells,rasterioCells:reference.validGridCells,relativeDifferencePercent:Number((Math.abs(Number(body.population)-reference.population)/reference.population*100).toFixed(8)),elapsedMs,adminStatus:response.status,errorCode:body.error??null}));
    expect(response.status).toBe(200);
    expect(body.status).toBe('available');
    expect(body.areaKm2).toBeGreaterThan(50_000);
    expect(body.coverage.validGridCells).toBe(reference.validGridCells);
    expect(body.coverage.intersectedGridCells).toBe(reference.intersectedGridCells);
    expect(body.coverage.noDataGridCells).toBe(reference.noDataGridCells);
    expect(Math.abs(Number(body.population)-reference.population)/reference.population).toBeLessThan(0.01);
  },180_000);
  it.skipIf(!hasAustraliaIndex)('searches and selects the real oversized Australia boundary through an R2 range index',async()=>{
    const manifestBytes=new Uint8Array(await readFile(join(australiaPrepared,'manifest.json'))),manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestBytes));
    const manifestKey=`${manifest.storage.data.key.slice(0,manifest.storage.data.key.lastIndexOf('/'))}/manifest.json`;
    const aggregate=manifest.administrativeAggregates.find((item:{boundaryLayerId:string})=>item.boundaryLayerId===australiaLayerId);
    expect(aggregate?.boundaryData).toBeDefined();
    const indexPath=join(australiaIndexDir,'index.json'),displayPath=join(australiaIndexDir,'display.ndjson');
    const index=JSON.parse(await readFile(indexPath,'utf8')) as {features:Array<{featureId:string;areaKm2:number;geometryOffset:number;geometryBytes:number}>};
    const indexedFeature=index.features.find(item=>item.featureId===australiaFeatureId);
    expect(indexedFeature).toBeDefined();
    const source=JSON.parse(await readFile(australiaSource,'utf8')) as {features:Array<{properties:Record<string,unknown>;geometry:PopulationGeometry}>};
    const original=source.features.find(item=>item.properties.shapeID===australiaFeatureId);
    expect(original).toBeDefined();
    expect(indexedFeature!.areaKm2).toBe(geodesicAreaKm2(original!.geometry));

    const targetShard=(await sha256(new TextEncoder().encode(australiaFeatureId))).slice(0,2);
    const aggregateRef=aggregate.shards.find((item:{shard:string})=>item.shard===targetShard);
    expect(aggregateRef).toBeDefined();
    const manifestSha256=await sha256(manifestBytes),activeBytes=new TextEncoder().encode(JSON.stringify({
      schemaVersion:1,release:'R2025A-v1',year:2025,resolution:'100m',catalogSha256:populationCatalogSummary.manifestSha256,
      countries:{AUS:{manifestKey,manifestSha256,sourceSha256:manifest.sourceSha256,datasetId:manifest.datasetId}}
    }));
    const paths=new Map<string,string>([
      [manifestKey,join(australiaPrepared,'manifest.json')],
      [manifest.storage.data.key,join(australiaPrepared,'data.bin')],
      [manifest.storage.index.key,join(australiaPrepared,'index.bin')],
      [aggregateRef!.key,join(australiaPrepared,'aggregates',australiaLayerId,`${aggregateRef!.shard}.json`)],
      [aggregate.boundaryData.index.key,indexPath],
      [aggregate.boundaryData.display.key,displayPath]
    ]);
    const sizes=new Map<string,number>(await Promise.all([...paths].map(async([key,path])=>[key,(await stat(path)).size] as [string,number])));
    const rangeReads:{key:string;offset:number;length:number}[]=[];
    const object=async(key:string,range?:{offset:number;length:number})=>{
      const path=paths.get(key);if(!path)return null;
      const size=sizes.get(key)??0;let bytes:Uint8Array;
      if(range){rangeReads.push({key,offset:range.offset,length:range.length});const handle=await open(path,'r');try{bytes=new Uint8Array(range.length);await handle.read(bytes,0,range.length,range.offset);}finally{await handle.close();}}
      else bytes=new Uint8Array(await readFile(path));
      return {key,size,range,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
    };
    const bucket={
      get:async(key:string,options?:{range?:{offset:number;length:number}})=>key==='population/active.json'?{key,size:activeBytes.byteLength,arrayBuffer:async()=>Uint8Array.from(activeBytes).buffer}:object(key,options?.range),
      head:async(key:string)=>{const size=sizes.get(key);return size===undefined?null:{key,size};}
    } as unknown as R2Bucket;
    let externalReads=0;const services={bucket,fetcher:async()=>{externalReads++;return new Response(null,{status:503});}};
    const search=await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=AUS&level=ADM0&q=Australia'),services);
    expect(search.status).toBe(200);
    expect(await search.json()).toMatchObject({status:'available',results:[{featureId:australiaFeatureId,areaKm2:indexedFeature!.areaKm2,geometrySimplified:true}]});
    const selected=await populationAdminResponse(new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:australiaLayerId,featureId:australiaFeatureId})}),{...populationDatabase(),...services});
    const body=await selected.json() as Record<string,any>;
    expect(selected.status).toBe(200);
    expect(body).toMatchObject({status:'available',areaKm2:indexedFeature!.areaKm2,boundary:{geometryRole:'display_only',geometrySimplified:true,geometryType:'MultiPolygon'}});
    expect(rangeReads).toContainEqual({key:aggregate.boundaryData.display.key,offset:indexedFeature!.geometryOffset,length:indexedFeature!.geometryBytes});
    expect(externalReads).toBe(0);
  },60_000);
});
