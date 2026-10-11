import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [cldrDir,neDir]=process.argv.slice(2);if(!cldrDir||!neDir)throw new Error('Indicar descargas CLDR48 y Natural Earth fijado');
const hash=t=>createHash('sha256').update(t).digest('hex');
const raw=await fs.readFile(path.join(neDir,'country-labels.geojson'),'utf8');
const searchManifest=JSON.parse(await fs.readFile('content/search/manifest.json','utf8'));
if(hash(raw)!==searchManifest.sourceHashes['country-labels.geojson'])throw new Error('Natural Earth no coincide con anclajes aprobados');
const features=JSON.parse(raw).features,entities=JSON.parse(await fs.readFile('content/geography/entities.json','utf8'));
const locales=['es','en','zh-Hans','hi','ar','fr','bn','pt','ru','id','ur','de','ja','mr','vi','te','sw','ha-Latn','tr'];
const codes=JSON.parse(await fs.readFile('content/search/countries.json','utf8')).map(c=>c.countryCode);
const extra=['BQ','BV','CC','CX','GF','GP','MQ','RE','SJ','TK','YT','CS','AN'];
const names={},fallbacks={},hashes={};
const rejected={ 'zh-Hans':['ne-SPI','ne-IOA'],ar:['ne-SPI'],ur:['ne-USG','ne-BRI','ne-IOA'],bn:['ne-USG','ne-CLP'],tr:['ne-USG','ne-IOA','ne-SPI','ne-BJN','ne-SER','ne-SCR'],de:['ne-USG'],id:['ne-CNM','ne-ESB','ne-BRI','ne-KAS'],vi:['ne-BJN','ne-SER']};
for(const lang of locales){const cldr=lang==='ha-Latn'?'ha':lang;const text=await fs.readFile(path.join(cldrDir,cldr+'.json'),'utf8');hashes[cldr]=hash(text);const territories=JSON.parse(text).main[cldr].localeDisplayNames.territories;names[lang]={};fallbacks[lang]=[];
 for(const e of entities){let label;
  if(e.countryCode)label=territories[e.countryCode];
  else {const f=features.find(f=>'ne-'+f.properties.ADM0_A3===e.id);const key=lang==='zh-Hans'?'ZH':lang.toUpperCase();label=f?.properties['NAME_'+key];}
  if(e.id==='ne-PGA')label=undefined; // NE translations refer to Wake, not this entity.
  if(rejected[lang]?.includes(e.id))label=undefined; // Identified source defects, documented in docs/i18n.
  if(typeof label!=='string'||!label.trim()){label=e.name;if(lang!=='en')fallbacks[lang].push(e.id);}
  names[lang][e.id]=label;
 }
 for(const code of extra){const label=territories[code];names[lang]['country-'+code]=label||({CS:'Serbia and Montenegro',AN:'Netherlands Antilles'}[code])||code;if(!label&&lang!=='en')fallbacks[lang].push('country-'+code);}
 for(const code of codes)if(!names[lang]['country-'+code])throw new Error('Falta país '+lang+code);
}
names['pnb-Arab']=JSON.parse(await fs.readFile('content/geography/pnb-Arab.json','utf8'));fallbacks['pnb-Arab']=[];
for(const id of Object.keys(names.es))for(const lang of [...locales,'pnb-Arab'])if(!names[lang][id]||/\uFFFD/.test(names[lang][id]))throw new Error('Nombre ausente '+lang+id);
const body=JSON.stringify(names);const version='countries-cldr48-ne20261011-'+hash(body).slice(0,12);
async function write(file,body){if(await fs.readFile(file,'utf8').catch(()=>null)!==body)await fs.writeFile(file,body);}
await write('content/geography/names.json',body);await write('content/geography/manifest.json',JSON.stringify({version,namesHash:hash(body),entitiesHash:hash(JSON.stringify(entities)),cldr:'48.0.0',cldrHashes:hashes,naturalEarthCommit:searchManifest.naturalEarthCommit,naturalEarthHash:hash(raw),entityCount:entities.length,ordinaryCodes:codes.length,additionalComponents:extra,fallbacks,licenses:{CLDR:'Unicode-3.0',NaturalEarth:'Public domain',OwnCatalog:'Project-authored, AI reviewed'}},null,2));
await fs.mkdir('public/licenses',{recursive:true});await write('public/licenses/CLDR-48.txt',await fs.readFile(path.join(cldrDir,'UNICODE-LICENSE.txt'),'utf8'));
console.log(version,entities.length+' entidades, 271 nombres por idioma');console.log(Object.fromEntries(Object.entries(fallbacks).map(([k,v])=>[k,v.length])));
