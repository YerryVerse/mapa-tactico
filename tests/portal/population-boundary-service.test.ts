import {describe,it,expect,vi} from 'vitest';
import {populationAdminResponse,searchAdministrativeBoundaries} from '../../lib/population-boundary-service';

const geometry={type:'Polygon',coordinates:[[[-0.15,51.50],[-0.10,51.50],[-0.10,51.48],[-0.15,51.48],[-0.15,51.50]]]};
const layerId='GBR-ADM2-9080712',featureId='9080712B54935279696040';
const boundaryCollection={type:'FeatureCollection',features:[{type:'Feature',properties:{shapeID:featureId,shapeName:'Westminster',shapeGroup:'GBR',shapeType:'ADM2',shapeNameAlt:['City of Westminster']},geometry}]};
const taskId='0d4cb0c6-c442-43f6-a2e1-7db2a3788aad';
const populationTask={status:'success',progress:100,result:{total_population:217985.36,area_km2:22.9463,data_year:2025,data_source:'worldpop_R2025A_2025_100m',processing_time_ms:75},error:null};
function cache(){const data=new Map<string,Response>();return {match:vi.fn(async(key:Request)=>data.get(key.url)?.clone()),put:vi.fn(async(key:Request,value:Response)=>{data.set(key.url,value.clone());})} as unknown as Cache;}
function services(){
  const fetcher=vi.fn(async(input:string|URL,_init?:RequestInit)=>{
    const url=String(input);
    if(url.includes('github.com/wmgeolab/geoBoundaries/raw/'))return Response.json(boundaryCollection);
    if(url.endsWith('/population'))return Response.json({task_id:taskId,status:'pending'});
    return Response.json(populationTask);
  });
  const db={prepare:vi.fn(()=>({bind:()=>({first:async()=>({hits:1})})}))} as unknown as D1Database;
  return {db,fetcher,cache:cache()};
}

describe('geoBoundaries administrative identifiers',()=>{
  it('searches only the pinned country and level dataset and returns stable feature IDs',async()=>{
    const s=services(),request=new Request('https://atlas.test/api/population/boundaries?countryCode=GBR&level=ADM2&q=Westminster');
    const response=await searchAdministrativeBoundaries(request,s);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({status:'available',provider:'geoBoundaries',releaseType:'gbOpen',results:[{boundaryLayerId:layerId,featureId,name:'Westminster',countryCode:'GBR',level:'ADM2',boundaryYear:'2019',license:'Open Government Licence v3.0'}]});
    expect(String(s.fetcher.mock.calls[0][0])).toMatch(/^https:\/\/github\.com\/wmgeolab\/geoBoundaries\/raw\/9469f09\/releaseData\/gbOpen\/GBR\/ADM2\//);
  });
  it('computes population from the server-fetched feature geometry, not a visitor-supplied polygon',async()=>{
    const s=services(),request=new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:layerId,featureId})});
    const response=await populationAdminResponse(request,s),body=await response.json() as Record<string,any>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({status:'available',population:217985.36,areaKm2:22.9463,year:2025,edition:'R2025A-v1',coverage:'country_dataset_available_fraction_unreported',boundary:{boundaryLayerId:layerId,featureId,name:'Westminster',countryCode:'GBR',level:'ADM2',boundaryYear:'2019',geometry}});
    expect(s.fetcher).toHaveBeenCalledTimes(3);
    expect(String(s.fetcher.mock.calls[0][0])).toMatch(/geoBoundaries-GBR-ADM2\.geojson$/);
    expect(String(s.fetcher.mock.calls[1][0])).toBe('https://api.worldpop.org/v2/population');
    const populationBody=JSON.parse(String(s.fetcher.mock.calls[1][1]?.body));
    expect(populationBody).toMatchObject({year:2025,resolution:'100m',geojson:geometry});
  });
  it('rejects invalid country, level, query, layer ID and feature ID before external reads',async()=>{
    const s=services();
    expect((await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=XXX&level=ADM2&q=Westminster'),s)).status).toBe(404);
    expect((await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=GBR&level=ADM5&q=Westminster'),s)).status).toBe(400);
    const address=await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=GBR&level=ADM2&q=1%20Main%20Street'),s);
    expect(address.status).toBe(200);expect(await address.json()).toMatchObject({status:'no_match',results:[]});
    expect((await populationAdminResponse(new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:'USA-ADM2-1234567',featureId})}),s)).status).toBe(404);
    expect((await populationAdminResponse(new Request('https://atlas.test/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:layerId,featureId:'https://attacker.example'})}),s)).status).toBe(400);
    expect(s.fetcher).toHaveBeenCalledTimes(1);
  });
  it('distinguishes a no-match from missing country data',async()=>{
    const s=services();
    const noMatch=await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=GBR&level=ADM2&q=Nonexistent'),s);
    expect(await noMatch.json()).toMatchObject({status:'no_match',results:[]});
    const noCoverage=await searchAdministrativeBoundaries(new Request('https://atlas.test/api/population/boundaries?countryCode=XXX&level=ADM0&q=Vatican'),s);
    expect(noCoverage.status).toBe(404);expect(await noCoverage.json()).toMatchObject({status:'no_coverage',error:'boundary_not_available'});
  });
});
