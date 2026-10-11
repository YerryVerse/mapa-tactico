import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=JSON.parse(await readFile('content/i18n/es.json','utf8')),keys=Object.keys(base).sort();
const expected=['es','en','zh-Hans','hi','ar','fr','bn','pt','ru','id','ur','de','ja','mr','vi','te','sw','ha-Latn','tr','pnb-Arab'];
const files=await readdir('content/i18n');let failed=false;
for(const lang of expected){
 if(!files.includes(lang+'.json')){console.error('Falta catálogo',lang);failed=true;continue;}
 const data=JSON.parse(await readFile('content/i18n/'+lang+'.json','utf8'));
 if(JSON.stringify(Object.keys(data).sort())!==JSON.stringify(keys)||Object.values(data).some(v=>typeof v!=='string'||!v.trim()||/\uFFFD|TODO|PLACEHOLDER/.test(v))){console.error('Catálogo inválido',lang);failed=true;}
 for(const key of ['countOne','countOther'])if(!data[key]?.includes('{count}')){console.error('Variable faltante',lang,key);failed=true;}
}
const namesText=await readFile('content/geography/names.json','utf8'),names=JSON.parse(namesText),manifest=JSON.parse(await readFile('content/geography/manifest.json','utf8'));
const entities=JSON.parse(await readFile('content/geography/entities.json','utf8')),ids=Object.keys(names.es).sort();
if(createHash('sha256').update(namesText).digest('hex')!==manifest.namesHash){console.error('Hash de nombres inválido');failed=true;}
for(const lang of expected){if(JSON.stringify(Object.keys(names[lang]??{}).sort())!==JSON.stringify(ids)||Object.values(names[lang]??{}).some(v=>typeof v!=='string'||!v.trim()||/\uFFFD/.test(v))){console.error('Nombres inválidos',lang);failed=true;}for(const id of manifest.fallbacks[lang]??[])if(!names[lang]?.[id]){console.error('Excepción inválida',lang,id);failed=true;}}
if(entities.length!==258||new Set(entities.map(e=>e.id)).size!==258||entities.some(e=>!ids.includes(e.id)||!Number.isFinite(e.lng)||!Number.isFinite(e.lat))){console.error('Entidades geográficas inválidas');failed=true;}
if(failed)process.exit(1);console.log(`${expected.length} catálogos completos, ${keys.length} claves cada uno; ${ids.length} nombres por idioma y 258 entidades verificadas.`);
