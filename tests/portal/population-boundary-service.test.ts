import {describe,it,expect,vi} from 'vitest';
import {populationAdminResponse,searchAdministrativeBoundaries} from '../../lib/population-boundary-service';
import {populationDatabase,populationMemoryCache,populationRasterFixture} from './population-raster-fixture';

const geometry={type:'Polygon',coordinates:[[[-0.15,51.50],[-0.10,51.50],[-0.10,51.48],[-0.15,51.48],[-0.15,51.50]]]};
const layerId='GBR-ADM2-9080712',featureId='9080712B54935279696040';
const boundaryCollection={type:'FeatureCollection',features:[{type:'Feature',properties:{shapeID:featureId,shapeName:'Westminster',shapeGroup:'GBR',shapeType:'ADM2',shapeNameAlt:['City of Westminster']},geometry}]};
async function services(options:{indexedBoundary?:boolean}={}){
  const fetcher=vi.fn(async(input:string|URL)=>{void input;return Response.json(boundaryCollection);});
  const database=populationDatabase(),memory=populationMemoryCache(),raster=await populationRasterFixture(options);
  return {...database,db:database.db,bucket:raster.bucket,fetcher,cache:memory.cache,raster};
}

describe('geoBoundaries administrative identifiers',()=>{
  it('searches only the pinned country and level dataset and returns stable feature IDs',async()=>{
    const s=await services(),request=new Request('https://atlas.test/api/population/boundaries?countryCode=GBR&level=ADM2&q=Westminster');
    const response=await searchAdministrativeBoundaries(request,s);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({status:'available',provider:'geoBoundaries',releaseType:'gbOpen',results:[{boundaryLayerId:layerId,featureId,name:'Westminster',countryCode:'GBR',level:'ADM2',boundaryYear:'2019',license:'Open Government Licence v3.0'}]});
    expect(String(s.fetcher.mock.calls[0][0])).toMatch(/^https:\/\/github\.com\/wmgeolab\/geoBoundaries\/raw\/9469f09\/releaseData\/gbOpen\/GBR\/ADM2\//);
  });
  it('computes population from the server-fetched feature geometry, not a visitor-supplied polygon',async()=>{
    const s=await services(),request=new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:layerId,featureId})});
    const response=await populationAdminResponse(request,s),body=await response.json() as Record<string,any>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({status:'available',year:2025,edition:'R2025A-v1',coverage:{status:'partial',noDataGridCells:1},boundary:{boundaryLayerId:layerId,featureId,name:'Westminster',countryCode:'GBR',level:'ADM2',boundaryYear:'2019',geometry}});
    expect(body.population).toBe(body.coverage.validGridCells-1);
    expect(s.fetcher).toHaveBeenCalledTimes(1);
    expect(String(s.fetcher.mock.calls[0][0])).toMatch(/geoBoundaries-GBR-ADM2\.geojson$/);
  });
  it('rejects invalid country, level, query, layer ID and feature ID before external reads',async()=>{
    const s=await services();
    expect((await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=XXX&level=ADM2&q=Westminster'),s)).status).toBe(404);
    expect((await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=GBR&level=ADM5&q=Westminster'),s)).status).toBe(400);
    const address=await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=GBR&level=ADM2&q=1%20Main%20Street'),s);
    expect(address.status).toBe(200);expect(await address.json()).toMatchObject({status:'no_match',results:[]});
    expect((await populationAdminResponse(new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:'USA-ADM2-1234567',featureId})}),s)).status).toBe(404);
    expect((await populationAdminResponse(new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:layerId,featureId:'https://attacker.example'})}),s)).status).toBe(400);
    expect(s.fetcher).toHaveBeenCalledTimes(1);
  });
  it('distinguishes a no-match from missing country data',async()=>{
    const s=await services();
    const noMatch=await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=GBR&level=ADM2&q=Nonexistent'),s);
    expect(await noMatch.json()).toMatchObject({status:'no_match',results:[]});
    const noCoverage=await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=XXX&level=ADM0&q=Vatican'),s);
    expect(noCoverage.status).toBe(404);expect(await noCoverage.json()).toMatchObject({status:'no_coverage',error:'boundary_not_available'});
  });
  it('reports missing administrative layers as no coverage without fetching a substitute',async()=>{
    const fetcher=vi.fn();
    const response=await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=ALA&level=ADM0&q=capital'),{fetcher});
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({status:'no_coverage',error:'boundary_not_available'});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('searches an oversized R2 index and reads only the selected display geometry range',async()=>{
    const s=await services({indexedBoundary:true});
    const search=await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=GBR&level=ADM2&q=Westminster'),s);
    expect(search.status).toBe(200);
    expect(await search.json()).toMatchObject({status:'available',results:[{featureId,name:'Westminster',areaKm2:19.8,geometrySimplified:false}]});
    expect(s.fetcher).not.toHaveBeenCalled();

    const response=await populationAdminResponse(new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:layerId,featureId})}),s);
    const body=await response.json() as Record<string,any>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({status:'available',areaKm2:19.8,boundary:{geometryRole:'display_only',geometrySimplified:false,geometry}});
    const boundaryData=s.raster.manifest.administrativeAggregates[0].boundaryData;
    if(!boundaryData)throw new Error('Indexed boundary fixture must contain its versioned R2 objects');
    expect(s.raster.rangeReads).toContainEqual({key:boundaryData.display.key,offset:0,length:boundaryData.display.bytes});
    expect(s.fetcher).not.toHaveBeenCalled();
  });
});
