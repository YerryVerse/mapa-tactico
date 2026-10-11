import type {ContextEntry} from '../lib/scenario-contract';
export default function ContextCard({entry,onLocate}:{entry:ContextEntry;onLocate?:()=>void}){return <article className="context-card" data-entry-id={entry.id}>
 <p>{entry.description}</p>
 {entry.location&&<>{onLocate&&<button type="button" className="text-button" onClick={onLocate}>Ver ubicación del registro</button>}<details><summary>Ubicación de referencia</summary><p>{entry.location.label}</p><a href={entry.location.source.url} target="_blank" rel="noopener noreferrer">{entry.location.source.title} ↗</a></details></>}
 <h2>Fuentes</h2><ul>{entry.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a></li>)}</ul>
 </article>;}
