'use client';
import {useLanguage} from './LanguageProvider';
import type {ContextEntry} from '../lib/scenario-contract';
export default function ContextCard({entry,onLocate}:{entry:ContextEntry;onLocate?:()=>void}){const {t}=useLanguage();return <article className="context-card" data-entry-id={entry.id} data-country-id={entry.id==='beirut-2020-context'?'country-LB':undefined}>
 <p>{entry.description}</p>
 {entry.location&&<>{onLocate&&<button type="button" className="text-button" onClick={onLocate}>{t('viewReference')}</button>}<details><summary>{t('referenceLocation')}</summary><p>{entry.location.label}</p><a href={entry.location.source.url} target="_blank" rel="noopener noreferrer">{entry.location.source.title} ↗</a></details></>}
 <h2>{t('sources')}</h2><ul>{entry.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a></li>)}</ul>
 </article>;}
