import {describe,it,expect} from 'vitest';
import {GET} from '../../app/api/search/route';
describe('Search boundary before provider configuration',()=>{
 it('rejects absent, long and control-containing queries',async()=>{for(const q of ['', 'a','a'.repeat(161),'ab\u0001']){const r=await GET(new Request('https://atlas.test/api/search?q='+encodeURIComponent(q)));expect(r.status).toBe(400);expect(r.headers.get('Cache-Control')).toBe('no-store');}});
 it('reports missing configuration without fabricated results',async()=>{const r=await GET(new Request('https://atlas.test/api/search?q=Madrid'));expect(r.status).toBe(503);const data=await r.json();expect(data).toEqual(expect.objectContaining({error:'provider_not_configured'}));expect(data).not.toHaveProperty('results');});
});
