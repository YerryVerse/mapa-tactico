import {describe,it,expect} from 'vitest';
import {searchQuerySchema,validatedPlaces,readSearchReply,SEARCH_RESPONSE_BYTES} from '../../lib/search-contract';
const city={id:'city:1',kind:'city',name:'Madrid',countryCode:'ES',countryName:'España',region:'Madrid',lng:-3.7,lat:40.4};

describe('Country and city search contract',()=>{
 it('rejects street, building, neighbourhood, POI and unknown types in mixed results',()=>{
  const forbidden=['street','address','building','neighbourhood','poi','unknown'].map(kind=>({...city,id:kind,kind}));
  expect(validatedPlaces([...forbidden,city,{...city,id:'country:ES',kind:'country',name:'España'}])).toHaveLength(2);
  expect(validatedPlaces(forbidden)).toEqual([]);
 });
 it('rejects invalid coordinates, unclassified records and unexpected fields',()=>{
  expect(validatedPlaces([{...city,lat:NaN},{...city,lng:181},{...city,kind:undefined},{...city,street:'Gran Vía'}])).toEqual([]);
 });
 it('limits and deduplicates results',()=>{
  expect(validatedPlaces(Array.from({length:10},(_,i)=>({...city,id:String(i)})))).toHaveLength(8);
  expect(validatedPlaces([city,city])).toEqual([city]);
  expect(()=>validatedPlaces(Array(101).fill(city))).toThrow();
 });
 it('validates query size, controls, locale and result limit',()=>{
  expect(searchQuerySchema.parse({q:' Madrid '}).q).toBe('Madrid');
  for(const q of ['a','a'.repeat(161),'\nMadrid','Madrid\u0001'])expect(searchQuerySchema.safeParse({q}).success).toBe(false);
  expect(searchQuerySchema.safeParse({q:'Madrid',limit:99}).success).toBe(false);
  expect(searchQuerySchema.safeParse({q:'Madrid',lang:'../../'}).success).toBe(false);
 });
 it('rejects HTML/login pages, oversized payloads and invalid success responses',async()=>{
  await expect(readSearchReply(new Response('<html>Login</html>',{headers:{'Content-Type':'text/html'}}))).rejects.toThrow();
  await expect(readSearchReply(new Response(' '.repeat(SEARCH_RESPONSE_BYTES+1),{headers:{'Content-Type':'application/json'}}))).rejects.toThrow('Oversized');
  await expect(readSearchReply(Response.json({results:[{...city,kind:'street'}]}))).rejects.toThrow();
  await expect(readSearchReply(Response.json({error:'provider_unavailable',message:'Error'}))).rejects.toThrow('Inconsistent');
 });
 it('distinguishes empty results from provider errors and quota errors',async()=>{
  expect(await readSearchReply(Response.json({results:[]}))).toEqual({results:[]});
  expect(await readSearchReply(Response.json({results:[city]}))).toEqual({results:[city]});
  const quota={error:'quota_exceeded',message:'Espera y reintenta.',retryAfter:2};
  expect(await readSearchReply(Response.json(quota,{status:429}))).toEqual(quota);
 });
});
