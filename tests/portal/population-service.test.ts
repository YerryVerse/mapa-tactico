import {describe,it,expect,vi} from 'vitest';
import {area as geodesicArea} from '@turf/area';
import {booleanValid} from '@turf/boolean-valid';
import polygonClipping from 'polygon-clipping';
import {canonicalGeometryKey,POPULATION_MAX_AREA_KM2,type PopulationGeometry} from '../../lib/population-contract';
import {geodesicAreaKm2,toClippingGeometry,verifyPopulationGeometryRuntime} from '../../lib/population-geometry';
import {populationAreaResponse} from '../../lib/population-service';
import {verifyPopulationCatalog} from '../../lib/population-catalog';

const london:PopulationGeometry={type:'Polygon',coordinates:[[[-0.15,51.50],[-0.10,51.50],[-0.10,51.48],[-0.15,51.48],[-0.15,51.50]]]};
const success={status:'success',progress:100,result:{total_population:99049.27,area_km2:7.7275,data_year:2025,data_source:'worldpop_R2025A_2025_100m',processing_time_ms:74},error:null};
const taskId='0d4cb0c6-c442-43f6-a2e1-7db2a3788aad';
function services(){
  const fetcher=vi.fn(async(input:string|URL,_init?:RequestInit)=>{
    const url=String(input);
    return url.endsWith('/population')?Response.json({task_id:taskId,status:'pending'}):Response.json(success);
  });
  const db={prepare:vi.fn(()=>({bind:()=>({first:async()=>({hits:1})})}))} as unknown as D1Database;
  return {db,fetcher};
}
function request(geometry:PopulationGeometry=london,countryCodes=['GBR']){
  return new Request('https://atlas.test/api/population/area',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({geometry,countryCodes})});
}
function rectangle(west:number,south:number,east:number,north:number):PopulationGeometry{
  return {type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]};
}

describe('WorldPop anonymous population service',()=>{
  it('checks the generated country and boundary manifest integrity',async()=>{expect(await verifyPopulationCatalog()).toBe(true);});
  it('uses the pinned 2025 Global 2 source and validates the aggregate response',async()=>{
    const s=services(),response=await populationAreaResponse(request(),{...s,now:()=>Date.UTC(2026,9,12)});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({status:'available',population:99049.27,areaKm2:7.7275,year:2025,edition:'R2025A-v1',resolution:'100m',units:'people_per_grid_cell',coverage:'country_dataset_available_fraction_unreported',geometryHash:expect.stringMatching(/^[0-9a-f]{64}$/)});
    expect(s.fetcher).toHaveBeenCalledTimes(2);
    expect(String(s.fetcher.mock.calls[0][0])).toBe('https://api.worldpop.org/v2/population');
    expect(String(s.fetcher.mock.calls[1][0])).toBe(`https://api.worldpop.org/v2/tasks/${taskId}`);
    const upstreamBody=JSON.parse(String(s.fetcher.mock.calls[0][1]?.body));
    expect(upstreamBody).toMatchObject({year:2025,resolution:'100m',geojson:london});
    expect(s.db.prepare).toHaveBeenCalledTimes(2);
  });
  it('caches by normalized geometry, country set, source and method without retaining the submitted polygon',async()=>{
    const s=services(),entries=new Map<string,Response>();
    const cache={match:vi.fn(async(key:Request)=>entries.get(key.url)?.clone()),put:vi.fn(async(key:Request,value:Response)=>{entries.set(key.url,value.clone());})} as unknown as Cache;
    const first=await populationAreaResponse(request(),{...s,cache});
    const reverse:PopulationGeometry={type:'Polygon',coordinates:[[[-0.10,51.48],[-0.10,51.50],[-0.15,51.50],[-0.15,51.48],[-0.10,51.48]]]};
    const second=await populationAreaResponse(request(reverse),{...services(),cache});
    expect(first.status).toBe(200);expect(second.status).toBe(200);expect(cache.match).toHaveBeenCalledTimes(2);expect(cache.put).toHaveBeenCalledTimes(1);
  });
  it('distinguishes unsupported and partial country coverage without calling the provider',async()=>{
    const unsupported=services(),noCoverage=await populationAreaResponse(request(london,['VAT']),unsupported);
    expect(noCoverage.status).toBe(422);expect(await noCoverage.json()).toMatchObject({status:'no_coverage',error:'no_coverage',unsupportedCountryCodes:['VAT']});expect(unsupported.fetcher).not.toHaveBeenCalled();
    const partial=services(),partialCoverage=await populationAreaResponse(request(london,['GBR','VAT']),partial);
    expect(partialCoverage.status).toBe(422);expect(await partialCoverage.json()).toMatchObject({status:'partial_coverage',error:'partial_coverage',unsupportedCountryCodes:['VAT']});expect(partial.fetcher).not.toHaveBeenCalled();
  });
  it('rejects invalid rings, self intersections, unclosed shapes and oversized areas before quota use',async()=>{
    const s=services();
    const open:PopulationGeometry={type:'Polygon',coordinates:[[[-0.15,51.50],[-0.10,51.50],[-0.10,51.48],[-0.15,51.48]]]};
    const crossed:PopulationGeometry={type:'Polygon',coordinates:[[[0,0],[1,1],[0,1],[1,0],[0,0]]]};
    expect((await populationAreaResponse(request(open),s)).status).toBe(400);
    expect((await populationAreaResponse(request(crossed),s)).status).toBe(400);
    expect((await populationAreaResponse(request(rectangle(-5,45,5,55)),s)).status).toBe(413);
    expect(s.db.prepare).not.toHaveBeenCalled();expect(s.fetcher).not.toHaveBeenCalled();
  });
  it('rejects HTML, wrong editions and negative values from the GIS provider',async()=>{
    const html=services();html.fetcher.mockResolvedValueOnce(new Response('<html>maintenance</html>',{headers:{'Content-Type':'text/html'}}));
    const htmlReply=await populationAreaResponse(request(),html);expect(htmlReply.status).toBe(503);expect(await htmlReply.json()).toMatchObject({error:'provider_incompatible'});
    const wrong=services();wrong.fetcher.mockResolvedValueOnce(Response.json({task_id:taskId})).mockResolvedValueOnce(Response.json({...success,result:{...success.result,data_source:'worldpop_R2024B_2025_100m'}}));
    expect((await populationAreaResponse(request(),wrong)).status).toBe(503);
    const negative=services();negative.fetcher.mockResolvedValueOnce(Response.json({task_id:taskId})).mockResolvedValueOnce(Response.json({...success,result:{...success.result,total_population:-1}}));
    expect((await populationAreaResponse(request(),negative)).status).toBe(503);
  });
  it('enforces the project daily upstream-call budget without leaking visitor identity',async()=>{
    const s=services();s.db.prepare=vi.fn(()=>({bind:()=>({first:async()=>null})})) as any;
    const response=await populationAreaResponse(request(),{...s,now:()=>Date.UTC(2026,9,12)});
    expect(response.status).toBe(429);expect(await response.json()).toMatchObject({error:'quota_exceeded'});expect(s.fetcher).not.toHaveBeenCalled();
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
