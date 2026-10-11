import entities from '../content/geography/entities.json';
import names from '../content/geography/names.json';
import manifest from '../content/geography/manifest.json';
import {matchLanguage,type Language} from './languages';
import type {SearchPlace} from './search-contract';
export const COUNTRY_EDITION=manifest.version;
const catalog=names as Record<Language,Record<string,string>>;
export const countryId=(code:string)=>'country-'+code.trim().toUpperCase();
export function countryLabel(id:string,language:string){const lang=matchLanguage(language)??'es';return catalog[lang][id]??id.replace(/^country-/, '');}
export function originalCountryName(id:string,language:Language){return (manifest.fallbacks[language] as string[]).includes(id);}
export function localizePlace(place:SearchPlace,language:Language):SearchPlace{const id=countryId(place.countryCode),name=countryLabel(id,language);return {...place,countryName:name,...(place.kind==='country'?{name}:{})};}
export function countryAliases(code:string){const id=countryId(code);return Object.values(catalog).map(c=>c[id]).filter(Boolean);}
// Geometry, identity and classification are fixed across languages. Only text-field changes.
export function countryLabelData(){return {type:'FeatureCollection' as const,features:entities.map(e=>({type:'Feature' as const,id:e.id,geometry:{type:'Point' as const,coordinates:[e.lng,e.lat]},properties:{id:e.id,countryCode:e.countryCode,classification:e.classification,rank:e.rank,...Object.fromEntries(Object.entries(catalog).map(([lang,values])=>['name_'+lang,values[e.id]]))}}))};}
