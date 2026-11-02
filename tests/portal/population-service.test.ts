import {describe,it,expect} from 'vitest';
import {area as geodesicArea} from '@turf/area';
import {booleanValid} from '@turf/boolean-valid';
import polygonClipping from 'polygon-clipping';
import {canonicalGeometryKey,populationGeometrySchema,populationReplySchema,POPULATION_MAX_AREA_KM2,POPULATION_MAX_BODY_BYTES,POPULATION_MAX_VERTICES,type PopulationGeometry} from '../../lib/population-contract';
import {canonicalLongitude,geodesicAreaKm2,normalizePopulationGeometry,toClippingGeometry,verifyPopulationGeometryRuntime} from '../../lib/population-geometry';
import {populationAreaResponse} from '../../lib/population-service';
import {populationBoundaryCoverageSummary,verifyPopulationCatalog} from '../../lib/population-catalog';
import {populationDatabase,populationMemoryCache,populationRasterFixture} from './population-raster-fixture';

const london:PopulationGeometry={type:'Polygon',coordinates:[[[-0.15,51.50],[-0.10,51.50],[-0.10,51.48],[-0.15,51.48],[-0.15,51.50]]]};
function request(geometry:PopulationGeometry=london,countryCodes?:string[],signal?:AbortSignal){
  return new Request('https://atlas.test/api/population/area',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({geometry,...(countryCodes?{countryCodes}:{})}),signal});
}
function rectangle(west:number,south:number,east:number,north:number):PopulationGeometry{
  return {type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]};
}

describe('anonymous WorldPop raster query service',()=>{
  it('tracks missing administrative boundaries separately from available population rasters',()=>{
    expect(populationBoundaryCoverageSummary).toMatchObject({
      populationDatasetCountryCount:241,
      countriesWithBoundaries:229,
      countriesWithoutBoundariesCountryCodes:['ALA','CCK','CXR','ESH','HKG','JEY','MAC','MAF','NFK','SJM','SPM','SXM'],
      countriesWithoutADM0CountryCodes:['ALA','CCK','CXR','ESH','HKG','IND','JEY','MAC','MAF','NFK','PRI','SJM','SPM','SXM']
    });
  });
  it('checks the generated country and boundary manifest integrity',async()=>{expect(await verifyPopulationCatalog()).toBe(true);});
  it('sums the active official raster, reports NoData coverage and source checksums',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase();
    const response=await populationAreaResponse(request(),{...database,bucket:fixture.bucket,now:()=>Date.UTC(2026,9,12)});
    const body=await response.json() as Record<string,any>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({status:'available',year:2025,edition:'R2025A-v1',resolution:'100m',units:'people_per_grid_cell',source:'WorldPop Global 2',method:'cell_center_inside_polygon',coverage:{status:'partial',noDataGridCells:1},sourceDatasets:[{countryCode:'GBR',datasetId:'gbr_pop_2025_CN_100m_R2025A_v1',sourceSha256:'a'.repeat(64)}]});
    expect(body.geometryHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.coverage.intersectedGridCells).toBe(body.coverage.validGridCells+1);
    expect(body.population).toBe(body.coverage.validGridCells-1);
    expect(fixture.rangeReads).toHaveLength(1);
    expect(fixture.rangeReads[0].length).toBeGreaterThan(0);
    expect(database.prepare).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed totals, units and coverage instead of rendering them as population',async()=>{
    const fixture=await populationRasterFixture(),response=await populationAreaResponse(request(),{...populationDatabase(),bucket:fixture.bucket});
    const body=await response.json() as Record<string,any>;
    expect(populationReplySchema.safeParse(body).success).toBe(true);
    expect(populationReplySchema.safeParse({...body,population:Number.NaN}).success).toBe(false);
    expect(populationReplySchema.safeParse({...body,units:'people'}).success).toBe(false);
    expect(populationReplySchema.safeParse({...body,coverage:{...body.coverage,validGridCells:body.coverage.validGridCells+1}}).success).toBe(false);
    expect(populationReplySchema.safeParse({...body,coverage:{...body.coverage,status:'complete'}}).success).toBe(false);
  });
  it('uses cell centers at polygon edges, preserves valid zero, and follows the explicit NoData mask',async()=>{
    const fixture=await populationRasterFixture(),transform=fixture.manifest.transform,database=populationDatabase();
    const centerColumn=Math.floor((-0.125-transform[2])/transform[0]);
    const centerRow=Math.floor((transform[5]-51.49)/Math.abs(transform[4]));
    const cellWidth=Math.abs(transform[0]),cellHeight=Math.abs(transform[4]);
    const cellCenter=(column:number)=>({
      longitude:transform[2]+(column+0.5)*transform[0],
      latitude:transform[5]+(centerRow+0.5)*transform[4]
    });
    const zero=cellCenter(centerColumn+1),noData=cellCenter(centerColumn);
    const centerArea:PopulationGeometry={type:'Polygon',coordinates:[[[zero.longitude-cellWidth*.1,zero.latitude-cellHeight*.1],[zero.longitude+cellWidth*.1,zero.latitude-cellHeight*.1],[zero.longitude+cellWidth*.1,zero.latitude+cellHeight*.1],[zero.longitude-cellWidth*.1,zero.latitude+cellHeight*.1],[zero.longitude-cellWidth*.1,zero.latitude-cellHeight*.1]]]};
    const centerReply=await populationAreaResponse(request(centerArea,['GBR']),{...database,bucket:fixture.bucket});
    const centerBody=await centerReply.json() as Record<string,any>;
    expect(centerReply.status).toBe(200);
    expect(centerBody).toMatchObject({status:'available',method:'cell_center_inside_polygon',population:0,coverage:{status:'complete',validGridCells:1,intersectedGridCells:1,noDataGridCells:0}});

    const edgeOnlyArea:PopulationGeometry={type:'Polygon',coordinates:[[[zero.longitude+cellWidth*.1,zero.latitude-cellHeight*.1],[zero.longitude+cellWidth*.4,zero.latitude-cellHeight*.1],[zero.longitude+cellWidth*.4,zero.latitude+cellHeight*.1],[zero.longitude+cellWidth*.1,zero.latitude+cellHeight*.1],[zero.longitude+cellWidth*.1,zero.latitude-cellHeight*.1]]]};
    const edgeReply=await populationAreaResponse(request(edgeOnlyArea,['GBR']),{...populationDatabase(),bucket:fixture.bucket});
    expect(edgeReply.status).toBe(422);
    expect(await edgeReply.json()).toMatchObject({status:'no_coverage',error:'no_coverage'});

    const noDataArea:PopulationGeometry={type:'Polygon',coordinates:[[[noData.longitude-cellWidth*.1,noData.latitude-cellHeight*.1],[noData.longitude+cellWidth*.1,noData.latitude-cellHeight*.1],[noData.longitude+cellWidth*.1,noData.latitude+cellHeight*.1],[noData.longitude-cellWidth*.1,noData.latitude+cellHeight*.1],[noData.longitude-cellWidth*.1,noData.latitude-cellHeight*.1]]]};
    const noDataReply=await populationAreaResponse(request(noDataArea,['GBR']),{...populationDatabase(),bucket:fixture.bucket});
    expect(noDataReply.status).toBe(422);
    expect(await noDataReply.json()).toMatchObject({status:'no_coverage',error:'no_coverage'});
  });
  it('caches by normalized geometry and active release without retaining submitted geometry',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase(),memory=populationMemoryCache();
    const first=await populationAreaResponse(request(),{...database,bucket:fixture.bucket,cache:memory.cache});
    const reverse:PopulationGeometry={type:'Polygon',coordinates:[[[-0.10,51.48],[-0.10,51.50],[-0.15,51.50],[-0.15,51.48],[-0.10,51.48]]]};
    const second=await populationAreaResponse(request(reverse),{...database,bucket:fixture.bucket,cache:memory.cache});
    expect(first.status).toBe(200);expect(second.status).toBe(200);expect(memory.match).toHaveBeenCalledTimes(3);expect(memory.put).toHaveBeenCalledTimes(2);
    expect(database.first).toHaveBeenCalledTimes(1);
    expect(fixture.rangeReads).toHaveLength(1);
  });
  it('keeps distinct cache identities for sub-grid changes in geometry and area precision',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase(),memory=populationMemoryCache();
    const first=await populationAreaResponse(request(),{...database,bucket:fixture.bucket,cache:memory.cache});
    const changed=structuredClone(london);
    changed.coordinates[0][1][0]-=0.0000001;
    const second=await populationAreaResponse(request(changed),{...database,bucket:fixture.bucket,cache:memory.cache});
    const firstBody=await first.json() as Record<string,any>,secondBody=await second.json() as Record<string,any>;
    expect(first.status).toBe(200);expect(second.status).toBe(200);
    expect(secondBody.geometryHash).not.toBe(firstBody.geometryHash);
    expect(secondBody.areaKm2).not.toBe(firstBody.areaKm2);
    expect([...memory.records.keys()].some(key=>new URL(key).pathname.endsWith(`/${firstBody.geometryHash}`))).toBe(true);
    expect([...memory.records.keys()].some(key=>new URL(key).pathname.endsWith(`/${secondBody.geometryHash}`))).toBe(true);
  });
  it('distinguishes unsupported-country coverage from a geometry outside the raster',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase();
    const vatican=rectangle(12.449,41.899,12.456,41.906);
    const unsupported=await populationAreaResponse(request(vatican,['VAT']),{...database,bucket:fixture.bucket});
    expect(unsupported.status).toBe(422);expect(await unsupported.json()).toMatchObject({status:'partial_coverage',error:'partial_coverage',unsupportedCountryCodes:['VAT']});
    const outside=await populationAreaResponse(request(rectangle(-140,0,-139.9,0.1)),{...database,bucket:fixture.bucket});
    expect(outside.status).toBe(422);expect(await outside.json()).toMatchObject({status:'no_coverage',error:'no_coverage'});
  });
  it('rejects malformed geometry and areas beyond the published limit before quota use',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase();
    const open:PopulationGeometry={type:'Polygon',coordinates:[[[-0.15,51.50],[-0.10,51.50],[-0.10,51.48],[-0.15,51.48]]]};
    const crossed:PopulationGeometry={type:'Polygon',coordinates:[[[0,0],[1,1],[0,1],[1,0],[0,0]]]};
    expect((await populationAreaResponse(request(open),{...database,bucket:fixture.bucket})).status).toBe(400);
    expect((await populationAreaResponse(request(crossed),{...database,bucket:fixture.bucket})).status).toBe(400);
    expect((await populationAreaResponse(request(rectangle(-5,45,5,55)),{...database,bucket:fixture.bucket})).status).toBe(413);
    expect(database.prepare).not.toHaveBeenCalled();
  });
  it('bounds request bytes and vertices before quota use or raster reads',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase();
    const oversizedBody=new Request('https://atlas.test/api/population/area',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({geometry:london})+' '.repeat(POPULATION_MAX_BODY_BYTES+1)});
    const byteReply=await populationAreaResponse(oversizedBody,{...database,bucket:fixture.bucket});
    expect(byteReply.status).toBe(413);expect(await byteReply.json()).toMatchObject({error:'area_limit'});

    const vertices=Array.from({length:POPULATION_MAX_VERTICES+1},()=>[0,0] as [number,number]);
    const geometry={type:'Polygon' as const,coordinates:[vertices]};
    expect(new TextEncoder().encode(JSON.stringify({geometry})).byteLength).toBeLessThan(POPULATION_MAX_BODY_BYTES);
    const vertexReply=await populationAreaResponse(request(geometry),{...database,bucket:fixture.bucket});
    expect(vertexReply.status).toBe(400);expect(await vertexReply.json()).toMatchObject({error:'invalid_geometry'});
    expect(database.prepare).not.toHaveBeenCalled();expect(fixture.rangeReads).toHaveLength(0);
  });
  it('applies the bounded R2 tile-read budget before loading a large raster window',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase();
    const response=await populationAreaResponse(request(rectangle(-2,51.2,0,53.2)),{...database,bucket:fixture.bucket});
    expect(response.status).toBe(413);expect(await response.json()).toMatchObject({error:'area_limit'});
    expect(fixture.rangeReads).toHaveLength(0);
  });
  it('rejects a corrupt block checksum as an incompatible dataset',async()=>{
    const fixture=await populationRasterFixture({corruptCrc:true}),database=populationDatabase();
    const response=await populationAreaResponse(request(),{...database,bucket:fixture.bucket});
    expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:'provider_incompatible'});
  });
  it('enforces the global anonymous daily query budget without retaining visitor identity',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase({allow:false});
    const response=await populationAreaResponse(request(),{...database,bucket:fixture.bucket,now:()=>Date.UTC(2026,9,12)});
    expect(response.status).toBe(429);expect(await response.json()).toMatchObject({error:'quota_exceeded'});expect(fixture.rangeReads).toHaveLength(0);
  });
  it('returns a timeout result for an already cancelled anonymous request',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase(),controller=new AbortController();controller.abort();
    const response=await populationAreaResponse(request(london,['GBR'],controller.signal),{...database,bucket:fixture.bucket});
    expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:'provider_timeout'});expect(fixture.rangeReads).toHaveLength(0);
  });
  it('aborts raster work when its bounded service timeout expires',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase();
    const response=await populationAreaResponse(request(),{...database,bucket:fixture.bucket,timeoutMs:0});
    expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:'provider_timeout'});
  });
});

describe('fixed geometry engine',()=>{
  it('runs union, intersection and geodesic area operations in the active runtime',()=>{expect(verifyPopulationGeometryRuntime()).toBe(true);});
  it('validates holes and reports a geodesic surface in square kilometres',()=>{
    expect(booleanValid(london)).toBe(true);
    expect(geodesicAreaKm2(london)).toBeGreaterThan(7.6);
    expect(geodesicAreaKm2(london)).toBeLessThan(7.9);
    expect(geodesicArea(london as never)/1_000_000).toBeCloseTo(geodesicAreaKm2(london),8);
  });
  it('accepts a small three-vertex polygon from the keyboard coordinate workflow',()=>{
    const triangle:PopulationGeometry={type:'Polygon',coordinates:[[[-0.15,51.48],[-0.10,51.48],[-0.10,51.50],[-0.15,51.48]]]};
    const normalized=normalizePopulationGeometry(triangle);
    expect(populationGeometrySchema.safeParse(normalized).success).toBe(true);
    expect(booleanValid(normalized)).toBe(true);
    expect(geodesicAreaKm2(normalized)).toBeGreaterThan(0);
  });
  it('unions shared areas before calculating, so overlaps count once',()=>{
    const a=toClippingGeometry(rectangle(0,0,2,1)),b=toClippingGeometry(rectangle(1,0,3,1));
    const merged=polygonClipping.union(a,b),overlap=polygonClipping.intersection(a,b);
    expect(merged).toHaveLength(1);expect(overlap).toHaveLength(1);
    expect(geodesicAreaKm2(merged)).toBeLessThan(geodesicAreaKm2(a)+geodesicAreaKm2(b));
    expect(geodesicAreaKm2(merged)).toBeGreaterThan(geodesicAreaKm2(overlap));
    expect(geodesicAreaKm2(merged)).toBeLessThanOrEqual(POPULATION_MAX_AREA_KM2);
  });
  it('produces the same cache identity when polygon orientation and starting point change',()=>{
    const rotated:PopulationGeometry={type:'Polygon',coordinates:[[[-0.10,51.50],[-0.10,51.48],[-0.15,51.48],[-0.15,51.50],[-0.10,51.50]]]};
    expect(canonicalGeometryKey(rotated)).toBe(canonicalGeometryKey(london));
  });
  it('splits a short antimeridian crossing into two small valid polygons',()=>{
    const crossing=rectangle(179.5,10,-179.5,11),normalized=normalizePopulationGeometry(crossing);
    expect(normalized.type).toBe('MultiPolygon');
    expect(booleanValid(normalized)).toBe(true);
    expect(geodesicAreaKm2(normalized)).toBeGreaterThan(11_000);
    expect(geodesicAreaKm2(normalized)).toBeLessThan(13_000);
    expect((normalized.type==='MultiPolygon'?normalized.coordinates:[])).toHaveLength(2);
  });
  it('normalizes the repeated rendered world to the same WGS84 area',()=>{
    expect([canonicalLongitude(190),canonicalLongitude(181),canonicalLongitude(-181),canonicalLongitude(540)]).toEqual([-170,-179,179,180]);
    const repeatedWorld:PopulationGeometry={type:'Polygon',coordinates:[[[190,10],[191,10],[191,11],[190,11],[190,10]]]};
    const canonical:PopulationGeometry={type:'Polygon',coordinates:[[[-170,10],[-169,10],[-169,11],[-170,11],[-170,10]]]};
    const normalized=normalizePopulationGeometry(repeatedWorld),expected=normalizePopulationGeometry(canonical);
    expect(normalized).toEqual(expected);
    expect(booleanValid(normalized)).toBe(true);
    expect(geodesicAreaKm2(normalized)).toBeCloseTo(geodesicAreaKm2(expected),8);
  });
  it('unions repeated or overlapping polygons before counting their area',()=>{
    const left=rectangle(0,0,1,1),right=rectangle(.5,0,1.5,1);
    if(left.type!=='Polygon'||right.type!=='Polygon')throw new Error('Expected polygon fixtures');
    const duplicated:PopulationGeometry={type:'MultiPolygon',coordinates:[left.coordinates,right.coordinates]};
    const normalized=normalizePopulationGeometry(duplicated);
    const expected=geodesicAreaKm2(normalizePopulationGeometry(rectangle(0,0,1.5,1)));
    expect(normalized.type).toBe('Polygon');
    expect(geodesicAreaKm2(normalized)).toBeCloseTo(expected,5);
  });
  it('keeps reversed coordinate order valid after normalization',()=>{
    const reversed:PopulationGeometry={type:'Polygon',coordinates:[[[-0.10,51.48],[-0.10,51.50],[-0.15,51.50],[-0.15,51.48],[-0.10,51.48]]]};
    const normalized=normalizePopulationGeometry(reversed),validated=populationGeometrySchema.safeParse(normalized);
    expect(validated.success,JSON.stringify(validated.success?{}:validated.error.issues)).toBe(true);
    expect(booleanValid(normalized)).toBe(true);
  });
  it('rejects an ambiguous polygon that spans most of the world without a date-line crossing edge',()=>{
    const wide:PopulationGeometry={type:'Polygon',coordinates:[[[-170,-1],[-60,-1],[50,-1],[170,-1],[170,1],[50,1],[-60,1],[-170,1],[-170,-1]]]};
    expect(()=>normalizePopulationGeometry(wide)).toThrow('population_geometry_wrap_ambiguous');
  });
});
