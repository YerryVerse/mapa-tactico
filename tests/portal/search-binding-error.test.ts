import {expect,it,vi} from 'vitest';
vi.mock('cloudflare:workers',()=>({env:{}}));
import {GET} from '../../app/api/search/route';
import {languages} from '../../lib/languages';
import {message} from '../../lib/messages';

it('mantiene el idioma del error cuando faltan los servicios de búsqueda',async()=>{
 for(const {id} of languages){
  const r=await GET(new Request('https://mapa.example/api/search?q=Germany&lang='+id));
  expect(r.status).toBe(503);
  expect(r.headers.get('Cache-Control')).toBe('no-store');
  expect(await r.json()).toEqual({error:'provider_unavailable',message:message(id,'searchUnavailable')});
 }
});
