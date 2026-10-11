export const languages=[
{id:'es',name:'Español',searchName:'Spanish español',dir:'ltr'},
{id:'en',name:'English',searchName:'English inglés',dir:'ltr'},
{id:'zh-Hans',name:'简体中文',searchName:'Chinese chino mandarín',dir:'ltr'},
{id:'hi',name:'हिन्दी',searchName:'Hindi hindi',dir:'ltr'},
{id:'ar',name:'العربية',searchName:'Arabic árabe',dir:'rtl'},
{id:'fr',name:'Français',searchName:'French francés',dir:'ltr'},
{id:'bn',name:'বাংলা',searchName:'Bengali bengalí',dir:'ltr'},
{id:'pt',name:'Português',searchName:'Portuguese portugués',dir:'ltr'},
{id:'ru',name:'Русский',searchName:'Russian ruso',dir:'ltr'},
{id:'id',name:'Bahasa Indonesia',searchName:'Indonesian indonesio',dir:'ltr'},
{id:'ur',name:'اردو',searchName:'Urdu urdu',dir:'rtl'},
{id:'de',name:'Deutsch',searchName:'German alemán',dir:'ltr'},
{id:'ja',name:'日本語',searchName:'Japanese japonés',dir:'ltr'},
{id:'mr',name:'मराठी',searchName:'Marathi maratí',dir:'ltr'},
{id:'vi',name:'Tiếng Việt',searchName:'Vietnamese vietnamita',dir:'ltr'},
{id:'te',name:'తెలుగు',searchName:'Telugu telugu',dir:'ltr'},
{id:'sw',name:'Kiswahili',searchName:'Swahili suajili',dir:'ltr'},
{id:'ha-Latn',name:'Hausa',searchName:'Hausa hausa',dir:'ltr'},
{id:'tr',name:'Türkçe',searchName:'Turkish turco',dir:'ltr'},
{id:'pnb-Arab',name:'پنجابی',searchName:'Western Punjabi punyabí occidental shahmukhi',dir:'rtl'}
] as const;
export type Language=(typeof languages)[number]['id'];
export const LANGUAGE_KEY='mapa-tactico.language.v1';
export function isLanguage(value:unknown):value is Language{return languages.some(l=>l.id===value);}
export function matchLanguage(tag:string):Language|null{
 const norm=tag.replaceAll('_','-').toLowerCase();
 const exact=languages.find(l=>l.id.toLowerCase()===norm);if(exact)return exact.id;
 const parts=norm.split('-'),base=parts[0];
 if(base==='zh')return parts.some(v=>['hant','tw','hk','mo'].includes(v))?null:'zh-Hans';
 if(base==='pnb'||base==='pa'&&parts.some(v=>['arab','pk'].includes(v)))return 'pnb-Arab';
 return languages.find(l=>l.id.split('-')[0]===base)?.id??null;
}
export function initialLanguage(saved:unknown,preferences:readonly string[]):Language{
 if(isLanguage(saved))return saved;
 for(const p of preferences){const matched=matchLanguage(p);if(matched)return matched;}
 return 'es';
}
export function readLanguage(storage:Pick<Storage,'getItem'>|null,preferences:readonly string[]):Language{
 let saved:unknown=null;try{saved=storage?.getItem(LANGUAGE_KEY);}catch{}
 return initialLanguage(saved,preferences);
}
export function rememberLanguage(storage:Pick<Storage,'setItem'>|null,language:Language){try{storage?.setItem(LANGUAGE_KEY,language);}catch{}}
