import type {Language} from './languages';
import {message} from './messages';
export const formatLocale=(language:Language)=>language==='ha-Latn'?'ha':language==='pnb-Arab'?'ur-PK':language;
// CLDR 48 ha: latn, decimal '.', grouping ',', long date 'd MMMM, y'.
// Chromium may ship plural rules for ha without number/date locale data.
const hausaMonths=['Janairu','Faburairu','Maris','Afirilu','Mayu','Yuni','Yuli','Agusta','Satumba','Oktoba','Nuwamba','Disamba'];
// Western Punjabi has no bundled Intl locale in the target browsers. Numeric
// grouping/digits use an explicit compatible convention, never translated Urdu text.
export function number(language:Language,value:number,options:Intl.NumberFormatOptions={}){
 let locale=formatLocale(language);
 // Use a reviewed numeric convention only; dates and product text stay Hausa.
 if(language==='ha-Latn'&&!Intl.NumberFormat.supportedLocalesOf([locale]).length)locale='en-US';
 if(!Intl.NumberFormat.supportedLocalesOf([locale]).length)throw Error('Numeric locale unavailable: '+locale);
 return new Intl.NumberFormat(locale,{...options,...(language==='pnb-Arab'?{numberingSystem:'arabext'}:{})}).format(value);
}
export function date(language:Language,value:Date){
 if(language==='ha-Latn')return `${number(language,value.getUTCDate())} ${hausaMonths[value.getUTCMonth()]}, ${number(language,value.getUTCFullYear(),{useGrouping:false})}`;
 if(language==='pnb-Arab'){
  const months=['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'];
  return `${number(language,value.getUTCDate())} ${months[value.getUTCMonth()]} ${number(language,value.getUTCFullYear(),{useGrouping:false})}`;
 }
 const locale=formatLocale(language);
 if(!Intl.DateTimeFormat.supportedLocalesOf([locale]).length)throw Error('Date locale unavailable: '+locale);
 return new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',day:'numeric',timeZone:'UTC',calendar:'gregory'}).format(value);
}
export function resultCount(language:Language,value:number){
 const explicit=language==='pnb-Arab'||language==='ha-Latn'&&!Intl.PluralRules.supportedLocalesOf(['ha']).length;
 const kind=explicit?(value===1?'one':'other'):new Intl.PluralRules(formatLocale(language)).select(value);
 return message(language,kind==='one'?'countOne':'countOther').replace('{count}',number(language,value));
}
export function parseCoordinate(value:string){
 const zeroes=[0x660,0x6f0,0x966,0x9e6,0xc66,0xff10];
 const normalized=[...value.trim()].map(c=>{const n=c.codePointAt(0)!;const z=zeroes.find(z=>n>=z&&n<=z+9);return z===undefined?c:String(n-z);}).join('').replaceAll('−','-').replaceAll('٫','.').replaceAll(',','.');
 return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)?Number(normalized):NaN;
}
