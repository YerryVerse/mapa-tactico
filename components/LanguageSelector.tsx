'use client';
import {useState} from 'react';
import {languages} from '../lib/languages';
import {useLanguage} from './LanguageProvider';
export default function LanguageSelector(){
 const {language,setLanguage,t}=useLanguage(),[filter,setFilter]=useState('');
 const norm=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
 const found=languages.filter(l=>norm(l.name+' '+l.searchName).includes(norm(filter.trim())));
 return <div className="language-selector"><label htmlFor="language-filter">{t('findLanguage')}</label><input id="language-filter" type="search" value={filter} onChange={e=>setFilter(e.target.value)} autoComplete="off"/><div className="language-options" role="group" aria-label={t('language')}>{found.map(l=><button key={l.id} type="button" data-language={l.id} aria-pressed={language===l.id} onClick={()=>setLanguage(l.id)}><span lang={l.id} dir={l.dir}>{l.name}</span>{language===l.id&&<span aria-hidden="true">✓</span>}</button>)}</div>{!found.length&&<p role="status">{t('noLanguages')}</p>}</div>;
}
