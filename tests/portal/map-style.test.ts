import {describe,it,expect} from 'vitest';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {atlasStyle,TILE_EDITION} from '../../lib/map-style';
import {scriptSamples,mapFonts} from '../../lib/map-fonts';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
describe('Mapa publicable',()=>{
 it('produce estilo válido del motor elegido',()=>{expect(validateStyleMin(atlasStyle()).map(e=>e.message)).toEqual([]);});
 it('conserva calles y países sin capas ni iconos POI',()=>{const s=atlasStyle();expect(s.layers.some(l=>l.id==='street-names')).toBe(true);expect(s.layers.filter(l=>l.id==='countries')).toHaveLength(1);expect(s.layers.some(l=>['poi','aerodrome_label','mountain_peak'].includes((l as any)['source-layer']))).toBe(false);expect(JSON.stringify(s)).not.toContain('icon-image');expect(s.sources.world.type).toBe('vector');expect(s.sources['country-labels'].type).toBe('geojson');expect((s.layers.find(l=>l.id==='countries') as any).source).toBe('country-labels');});
 it('fija edición y mantiene distinción entre zoom y cobertura',()=>{const s=atlasStyle();expect((s.sources.world as any).maxzoom).toBe(14);expect((s.sources.world as any).tiles[0]).toContain(TILE_EDITION);expect(JSON.stringify(s)).not.toMatch(/latest|demo/);});
 it('prepara las20muestras con fuentes índicas y árabes licenciadas',()=>{expect(scriptSamples).toHaveLength(20);expect(Object.values(mapFonts).flat()).toHaveLength(4);for(const face of Object.values(mapFonts).flat()){expect(readFileSync('public'+face.url).length).toBeGreaterThan(100000);}expect(readFileSync('public/fonts/OFL.txt','utf8')).toContain('SIL OPEN FONT LICENSE');});
 it('sirve exactamente el worker del paquete fijado',()=>{const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');expect(hash('public/map-worker/maplibre-gl-worker-6.13.0.mjs')).toBe(hash('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'));expect(JSON.parse(readFileSync('node_modules/maplibre-gl/package.json','utf8')).version).toBe('6.13.0');});
});
