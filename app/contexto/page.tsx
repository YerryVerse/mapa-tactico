import {entries} from '../../lib/catalogue';
import ContextCard from '../../components/ContextCard';
export default function Page(){return <main className="reading-page"><a href="/">← Volver al mapa</a><h1>Escenarios</h1>{entries.map(entry=><section key={entry.id}><p className="category">{entry.category}</p><h2>{entry.title}</h2><ContextCard entry={entry}/></section>)}</main>;}
