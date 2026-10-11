import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const input=process.argv[2];
if(!input)throw new Error('Indicar carpeta de descargas GeoNames y Natural Earth');
const normalize=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const digest=s=>createHash('sha256').update(s).digest('hex');
const names=['cities1000.txt','admin1CodesASCII.txt','countryInfo.txt','country-labels.geojson'];
const files=Object.fromEntries(await Promise.all(names.map(async n=>[n,await fs.readFile(path.join(input,n),'utf8')])));
const countries=files['countryInfo.txt'].split(/\r?\n/).filter(s=>s&&!s.startsWith('#')).map(s=>s.split('\t'));
const regions=new Map(files['admin1CodesASCII.txt'].split(/\r?\n/).map(s=>s.split('\t')).map(s=>[s[0],s[1]]));
const labels=JSON.parse(files['country-labels.geojson']).features;
const allowed=new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLCD','PPLG']);
const shards=new Map();let cities=0,rejected=0;
for(const line of files['cities1000.txt'].split(/\r?\n/)){
 if(!line)continue;const s=line.split('\t');if(s[6]!=='P'||!allowed.has(s[7])||!countries.some(c=>c[0]===s[8])){rejected++;continue;}
 const keys=[...new Set([s[1],s[2],...s[3].split(',')].map(normalize).filter(s=>s.length>=2&&s.length<=200))];
 const row=[s[0],s[1],s[8],regions.get(s[8]+'.'+s[10])??s[8],Number(s[5]),Number(s[4]),Number(s[14]),s[7],keys];
 if(!Number.isFinite(row[4])||!Number.isFinite(row[5]))throw new Error('Coordenadas inválidas');
 for(const prefix of new Set(keys.map(k=>[...k].slice(0,2).join('')))){
  const id=digest(prefix).slice(0,2);let rows=shards.get(id);if(!rows)shards.set(id,rows=[]);
  rows.push([...row.slice(0,8),keys.filter(k=>[...k].slice(0,2).join('')===prefix)]);
 }cities++;
}
const countryRows=countries.flatMap(c=>{
 const label=labels.find(f=>f.properties.ISO_A2_EH===c[0])??labels.find(f=>f.properties.ADM0_A3===c[1]);
 if(!label||!Number.isFinite(label.properties.LABEL_X)||!Number.isFinite(label.properties.LABEL_Y))return [];return [{id:'country-'+c[0],kind:'country',name:c[4],countryCode:c[0],countryName:c[4],lng:label.properties.LABEL_X,lat:label.properties.LABEL_Y}];
});
const version='geonames-20261011';const out='public/gazetteer/'+version;await fs.mkdir(out,{recursive:true});let total=0,max=0;
async function writeChanged(file,body){if(await fs.readFile(file,'utf8').catch(()=>null)!==body)await fs.writeFile(file,body);}
for(const [id,rows]of shards){rows.sort((a,b)=>b[6]-a[6]);const body=JSON.stringify(rows);const size=Buffer.byteLength(body);if(size>2_500_000||rows.length>30000)throw new Error('Fragmento supera presupuesto');max=Math.max(max,size);total+=size;await writeChanged(out+'/'+id+'.json',body);}
await fs.mkdir('content/search',{recursive:true});await fs.writeFile('content/search/countries.json',JSON.stringify(countryRows));
const manifest={version,cities,rejected,countries:countryRows.length,shards:shards.size,bytes:total,maxShardBytes:max,allowedFeatures:[...allowed],sourceHashes:Object.fromEntries(names.map(n=>[n,digest(files[n])])),naturalEarthCommit:'ca96624a56bd078437bca8184e78163e5039ad19',licenses:{GeoNames:'CC BY 4.0',NaturalEarth:'Public domain'},generatedAt:new Date().toISOString()};
await fs.writeFile('content/search/manifest.json',JSON.stringify(manifest,null,2));console.log(manifest);
