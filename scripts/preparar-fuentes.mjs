import {mkdir,writeFile} from 'node:fs/promises';
const commit='578d18e1cfce41c8cc93d0a0f514cac3a1affb2e';
await mkdir('public/fonts',{recursive:true});
for(const family of ['NotoNaskhArabic','NotoSansDevanagari','NotoSansBengali','NotoSansTelugu']){
 const response=await fetch(`https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@${commit}/fonts/${family}/hinted/ttf/${family}-Regular.ttf`);
 if(!response.ok)throw new Error(`${family}: ${response.status}`);
 const data=Buffer.from(await response.arrayBuffer());await writeFile(`public/fonts/${family}-Regular.ttf`,data);console.log(`${family}: ${data.length} bytes`);
}
const license=await fetch(`https://raw.githubusercontent.com/notofonts/notofonts.github.io/${commit}/fonts/LICENSE`);
if(!license.ok)throw new Error('Falta licencia');await writeFile('public/fonts/OFL.txt',await license.text());
