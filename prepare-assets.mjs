import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.join(import.meta.dirname,'dist','assets');
await mkdir(root,{recursive:true});
const assets=[['d3.min.js','https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js'],['topojson.min.js','https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js'],['world.json','https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'],['D3-LICENSE.txt','https://cdn.jsdelivr.net/npm/d3@7.9.0/LICENSE'],['TOPOJSON-LICENSE.txt','https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/LICENSE']];
for(const [name,url] of assets){const r=await fetch(url);if(!r.ok)throw Error(`Asset failed: ${name}`);await writeFile(path.join(root,name),Buffer.from(await r.arrayBuffer()));console.log(`Ready: ${name}`);}
