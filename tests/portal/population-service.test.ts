import {describe,it,expect} from 'vitest';
import {area as geodesicArea} from '@turf/area';
import {booleanValid} from '@turf/boolean-valid';
import polygonClipping from 'polygon-clipping';
import {canonicalGeometryKey,POPULATION_MAX_AREA_KM2,type PopulationGeometry} from '../../lib/population-contract';
import {geodesicAreaKm2,toClippingGeometry,verifyPopulationGeometryRuntime} from '../../lib/population-geometry';
import {populationAreaResponse} from '../../lib/population-service';
import {populationBoundaryCoverageSummary,verifyPopulationCatalog} from '../../lib/population-catalog';
import {populationDatabase,populationMemoryCache,populationRasterFixture} from './population-raster-fixture';

const london:PopulationGeometry={type:'Polygon',coordinates:[[[-0.15,51.50],[-0.10,51.50],[-0.10,51.48],[-0.15,51.48],[-0.15,51.50]]]};
function request(geometry:PopulationGeometry=london,countryCodes=['GBR'],signal?:AbortSignal){
  return new Request('https://atlas.test/api/population/area',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({geometry,countryCodes}),signal});
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
  it('caches by normalized geometry and active release without retaining submitted geometry',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase(),memory=populationMemoryCache();
    const first=await populationAreaResponse(request(),{...database,bucket:fixture.bucket,cache:memory.cache});
    const reverse:PopulationGeometry={type:'Polygon',coordinates:[[[-0.10,51.48],[-0.10,51.50],[-0.15,51.50],[-0.15,51.48],[-0.10,51.48]]]};
    const second=await populationAreaResponse(request(reverse),{...database,bucket:fixture.bucket,cache:memory.cache});
    expect(first.status).toBe(200);expect(second.status).toBe(200);expect(memory.match).toHaveBeenCalledTimes(3);expect(memory.put).toHaveBeenCalledTimes(2);
    expect(database.first).toHaveBeenCalledTimes(1);
    expect(fixture.rangeReads).toHaveLength(1);
  });
  it('distinguishes unsupported-country coverage from a geometry outside the raster',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase();
    const unsupported=await populationAreaResponse(request(london,['VAT']),{...database,bucket:fixture.bucket});
    expect(unsupported.status).toBe(422);expect(await unsupported.json()).toMatchObject({status:'no_coverage',error:'no_coverage',unsupportedCountryCodes:['VAT']});
    const outside=await populationAreaResponse(request(rectangle(140,-35,140.1,-34.9)),{...database,bucket:fixture.bucket});
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
  it('applies the bounded R2 tile-read budget before loading a large raster window',async()=>{
    const fixture=await populationRasterFixture(),database=populationDatabase();
    const response=await populationAreaResponse(request(rectangle(-1,50,1,52)),{...database,bucket:fixture.bucket});
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
});
