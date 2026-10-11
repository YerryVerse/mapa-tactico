'use client';
import {useLanguage} from './LanguageProvider';
import InformationContent from './InformationContent';
import DisclaimerContent from './DisclaimerContent';
import ContextCard from './ContextCard';
import {entries} from '../lib/catalogue';
export default function LocalizedReading({kind}:{kind:'information'|'disclaimer'|'scenarios'}){
 const {t}=useLanguage();
 return <main className="reading-page"><a href="/">← {t('backMap')}</a><h1>{t(kind)}</h1>{kind==='information'?<InformationContent/>:kind==='disclaimer'?<DisclaimerContent/>:entries.map(entry=><section key={entry.id}><p className="category">{t(entry.category==='Accidente'?'accident':'military')}</p><h2>{t(entry.id==='beirut-2020-context'?'beirutTitle':'nuclearTitle')}</h2><ContextCard entry={{...entry,description:t(entry.id==='beirut-2020-context'?'beirutDescription':'nuclearDescription'),sources:entry.sources.map(s=>({...s,title:t(entry.id==='beirut-2020-context'?'beirutSource':'nuclearSource')})),...(entry.location?{location:{...entry.location,label:t('beirutLocation'),source:{...entry.location.source,title:t('beirutLocationSource')}}}:{})}}/></section>)}</main>;
}
