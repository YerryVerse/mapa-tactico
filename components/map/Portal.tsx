'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Map,MapMouseEvent} from 'maplibre-gl';
import Globe from './Globe';
import Starfield from './Starfield';
import {useLanguage} from '../LanguageProvider';
import LanguageDialog from '../LanguageDialog';
import {message,type MessageKey} from '../../lib/messages';
import {parseCoordinate,resultCount} from '../../lib/locale-format';
import {countryId,countryLabel,localizePlace,originalCountryName} from '../../lib/country-names';
import ContextCard from '../ContextCard';
import InformationContent from '../InformationContent';
import DisclaimerContent from '../DisclaimerContent';
import {entries,availableCategories,loadContext} from '../../lib/catalogue';
import {resultSignature,type ContextEntry,type PortalState} from '../../lib/scenario-contract';
import {mountContextLayer} from '../../lib/context-layer';
import {mountBlastLayer, mountTargetMarker} from '../../lib/blast-layer';
import {calculateBlastRadii, calculateOptimalZoom} from '../../lib/blast-physics';
import {number} from '../../lib/locale-format';
import {readSearchReply,searchQuerySchema,SEARCH_TIMEOUT_MS,type SearchPlace} from '../../lib/search-contract';
import PopulationAreaTool from './PopulationAreaTool';
type Point={lng:number;lat:number};
type Panel=Exclude<PortalState,'exploration'>|null;
type Result={entry:ContextEntry;signature:string};
function Icon({name}:{name:string}){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{name==='search'?<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>:name==='global'?<><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>:name==='location'?<><circle cx="12" cy="12" r="5"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/></>:name==='scenarios'?<><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></>:name==='population'?<><path d="M4 19V5m0 14h16"/><path d="m7 15 4-4 3 2 5-7"/><circle cx="7" cy="15" r="1"/><circle cx="11" cy="11" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="19" cy="6" r="1"/></>:name==='menu'?<><path d="M4 6h16M4 12h16M4 18h16"/></>:<path d={name==='plus'?'M5 12h14M12 5v14':name==='minus'?'M5 12h14':'m6 6 12 12M18 6 6 18'}/>}</svg>}
const hashFor=(panel:Panel,id?:string)=>panel==='configuration'?'#escenarios':panel==='result'?'#ficha/'+id:panel==='information'?'#informacion':panel==='disclaimer'?'#disclaimer':panel?'#'+panel:'';
function panelFromHash(hash:string):{panel:Panel;id?:string}{if(hash==='#escenarios')return {panel:'configuration'};if(hash==='#informacion')return {panel:'information'};if(hash==='#disclaimer')return {panel:'disclaimer'};if(hash.startsWith('#ficha/')){const id=hash.slice(7);return entries.some(e=>e.id===id)?{panel:'result',id}:{panel:'configuration'};}if(['#search','#location','#menu','#population'].includes(hash))return {panel:hash.slice(1) as Panel};return {panel:null};}
function historyPanel(panel:Panel,id?:string){const url=location.pathname+location.search+hashFor(panel,id);if(history.state?.atlasOverlay)history.replaceState({...history.state,atlasOverlay:true},'',url);else history.pushState({...history.state,atlasOverlay:true},'',url);}
export default function Portal(){
 const {language,t}=useLanguage();
 const [languageOpen,setLanguageOpen]=useState(false);
 const closeLanguage=useCallback(()=>setLanguageOpen(false),[]);
 const [map,setMap]=useState<Map|null>(null),[panel,setPanel]=useState<Panel>(null),[point,setPoint]=useState<Point|null>(null),[lng,setLng]=useState(''),[lat,setLat]=useState(''),[error,setError]=useState<MessageKey|''>(''),[query,setQuery]=useState('');
 const [searching,setSearching]=useState(false),[results,setResults]=useState<SearchPlace[]>([]),[searched,setSearched]=useState(false);
 const [selectedCountry,setSelectedCountry]=useState<string|null>(null);
 const localizedResults=results.map(place=>localizePlace(place,language));
 const [selectedId,setSelectedId]=useState(entries[0]?.id??''),[result,setResult]=useState<Result|null>(null);
 const [placementMode,setPlacementMode]=useState(false);
 const [detonationPoint,setDetonationPoint]=useState<Point|null>(null);
 const [detonated,setDetonated]=useState(false);
 const opener=useRef<HTMLElement|null>(null),panelRef=useRef<HTMLElement>(null),pointRef=useRef(point),panelStateRef=useRef(panel),requestRef=useRef<{id:number,controller?:AbortController}>({id:0});
 useEffect(()=>{pointRef.current=point;panelStateRef.current=panel;},[point,panel]);
 useEffect(()=>{if(panelStateRef.current==='search'){requestRef.current.controller?.abort();requestRef.current.id++;setSearching(false);}},[language]);
 const selected=entries.find(e=>e.id===selectedId);
 const activeResult=panel==='result'&&result&&selected&&result.signature===resultSignature(selected)?result.entry:null;
 const hasPanel=panel!==null;
 const zoomIntent=useRef({at:0,zoom:0});
 const ready=useCallback((m:Map|null)=>setMap(m),[]);
 const stopRequest=useCallback(()=>{requestRef.current.controller?.abort();requestRef.current.id++;setSearching(false);setResults([]);setSearched(false);setError('');},[]);
 const restoreFocus=useCallback(()=>requestAnimationFrame(()=>{if(opener.current?.isConnected)opener.current.focus();else document.querySelector<HTMLElement>('.scenarios-tool')?.focus();}),[]);
 const close=useCallback(()=>{stopRequest();setPanel(null);if(history.state?.atlasOverlay)history.back();else history.replaceState({...history.state,atlasOverlay:false},'',location.pathname+location.search);restoreFocus();},[stopRequest,restoreFocus]);
 const open=useCallback((next:Panel,target?:HTMLElement)=>{if(target?.closest('.tools')&&(panelStateRef.current===next||(next==='configuration'&&['execution','result'].includes(panelStateRef.current??'')))){close();return;}stopRequest();if(target&&(!panelStateRef.current||target.closest('.tools')))opener.current=target;setPanel(next);historyPanel(next);if(next==='location'){const p=pointRef.current??map?.getCenter();setLng(p?String(p.lng.toFixed(6)):'');setLat(p?String(p.lat.toFixed(6)):'');}},[map,stopRequest,close]);
 const execute=useCallback(async(id:string,navigate=true)=>{stopRequest();const requestId=requestRef.current.id;setSelectedId(id);setResult(null);setPanel('execution');try{const entry=await loadContext(id);if(requestId!==requestRef.current.id)return;setResult({entry,signature:resultSignature(entry)});setPanel('result');if(navigate)historyPanel('result',id);}catch{if(requestId!==requestRef.current.id)return;setPanel('configuration');setError('cardFailed');if(navigate)historyPanel('configuration');}},[stopRequest]);
 useEffect(()=>{const sync=(initial=false)=>{stopRequest();const view=panelFromHash(location.hash);if(view.panel==='result'&&view.id){void execute(view.id,false);}else{setPanel(view.panel);if(!view.panel&&!initial)restoreFocus();}};sync(true);const onPop=()=>sync();window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[execute,stopRequest,restoreFocus]);
 useEffect(()=>{if(!panel)return;const p=panelRef.current;p?.querySelector<HTMLElement>('input,button,a')?.focus();const key=(e:KeyboardEvent)=>{if(e.target instanceof Element&&e.target.closest('dialog'))return;if(e.key==='Escape'&&panel!=='population'){e.preventDefault();close();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[panel,close]);
 useEffect(()=>{
  if(panel!=='search'&&panel!=='menu')return;
  let press:{x:number;y:number;moved:boolean}|null=null;
  const down=(e:PointerEvent)=>{press={x:e.clientX,y:e.clientY,moved:false};};
  const move=(e:PointerEvent)=>{if(press&&e.buttons&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>6)press.moved=true;};
  const outside=(e:MouseEvent)=>{
   if(press?.moved&&e.detail!==0)return;
   const target=e.target;
   if(!(target instanceof Element)||panelRef.current?.contains(target)||target.closest('dialog, .tools button[aria-expanded]'))return;
   close();
   // Dismissal on the map must not also replace the chosen location.
   if(target.closest('.map'))e.stopPropagation();
  };
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,true);document.addEventListener('click',outside,true);
  return()=>{document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointermove',move,true);document.removeEventListener('click',outside,true);};
 },[panel,close]);
 // Geographic references belong to location/search, never to an explosion.
 // Explore clicks and drags do not select a location or create a marker.
 useEffect(()=>{if(!map)return;let dragged=false;const down=()=>{dragged=false;},drag=()=>{dragged=true;},click=(e:MapMouseEvent)=>{
  if(dragged||panelStateRef.current!=='location')return;
  const label=map.queryRenderedFeatures(e.point,{layers:['countries']})[0];
  if(typeof label?.properties?.id!=='string'||label.geometry.type!=='Point')return;
  const [x,y]=label.geometry.coordinates;setPoint({lng:x,lat:y});setSelectedCountry(label.properties.id);setLng(String(x.toFixed(6)));setLat(String(y.toFixed(6)));
 };map.on('mousedown',down);map.on('touchstart',down);map.on('dragstart',drag);map.on('click',click);return()=>{map.off('mousedown',down);map.off('touchstart',down);map.off('dragstart',drag);map.off('click',click);};},[map]);
 useEffect(()=>{if(!map)return;const frame=()=>{const small=window.matchMedia('(max-width:600px)').matches;const padding=hasPanel?(small?{top:0,bottom:Math.min(window.innerHeight*.48,380)+38,left:0,right:0}:{top:0,bottom:0,left:0,right:444}):{top:0,bottom:0,left:0,right:0};map.easeTo({padding,duration:250,essential:true});};frame();window.addEventListener('resize',frame);return()=>window.removeEventListener('resize',frame);},[map,hasPanel]);
 useEffect(()=>{
  if(!map)return;
  const canvas=map.getCanvas();
  const onContextMenu=(e:MapMouseEvent)=>{
    e.preventDefault();
    const newPoint={lng:Number(e.lngLat.lng.toFixed(6)),lat:Number(e.lngLat.lat.toFixed(6))};
    setDetonationPoint(newPoint);
    setPlacementMode(false);
    setDetonated(false);
  };
  const preventBrowserMenu=(e:MouseEvent)=>e.preventDefault();
  canvas.addEventListener('contextmenu',preventBrowserMenu);
  map.on('contextmenu',onContextMenu);
  return()=>{
    canvas.removeEventListener('contextmenu',preventBrowserMenu);
    map.off('contextmenu',onContextMenu);
  };
 },[map]);
 useEffect(()=>{
  if(!map)return;
  map.getCanvas().style.cursor=placementMode?'crosshair':'';
 },[map,placementMode]);
 useEffect(()=>{
  if(!map)return;
  return mountTargetMarker(map, detonated ? null : detonationPoint);
 },[map, detonationPoint, detonated]);
 useEffect(()=>{
  if(!map)return;
  const target = detonated ? detonationPoint : point;
  const active = detonated && selected ? selected : activeResult;
  if(!active) return;
  const cleanupBlast=detonated && detonationPoint && selected ? mountBlastLayer(map,selected,detonationPoint) : undefined;
  return()=>{
    cleanupBlast?.();
  };
 },[map,activeResult,language,point,detonated,selected,detonationPoint]);
 useEffect(()=>()=>requestRef.current.controller?.abort(),[]);
 const changeZoom=(delta:number)=>{if(!map)return;const now=performance.now(),previous=now-zoomIntent.current.at<500?zoomIntent.current.zoom:map.getZoom(),zoom=Math.max(0,Math.min(22,previous+delta));zoomIntent.current={at:now,zoom};map.zoomTo(zoom,{duration:200});};
 const search=async(e:React.FormEvent)=>{e.preventDefault();stopRequest();const id=requestRef.current.id;const parsed=searchQuerySchema.safeParse({q:query,lang:language});if(!parsed.success){setError('invalidQuery');return;}const controller=new AbortController();requestRef.current.controller=controller;setSearching(true);const timer=setTimeout(()=>controller.abort(),SEARCH_TIMEOUT_MS);try{const response=await fetch('/api/search?'+new URLSearchParams({q:parsed.data.q,lang:parsed.data.lang,limit:String(parsed.data.limit)}),{signal:controller.signal,cache:'no-store'});const data=await readSearchReply(response);if(id!==requestRef.current.id)return;if('results'in data){setResults(data.results);setSearched(true);}else setError(data.error==='quota_exceeded'?'searchQuota':data.error==='invalid_query'?'invalidQuery':data.error==='provider_timeout'?'searchTimeout':'searchUnavailable');}catch{if(id===requestRef.current.id)setError(controller.signal.aborted?'searchTimeout':'searchFailed');}finally{clearTimeout(timer);if(id===requestRef.current.id)setSearching(false);}};
 const choosePlace=(place:SearchPlace)=>{setPoint({lng:place.lng,lat:place.lat});setSelectedCountry(countryId(place.countryCode));map?.jumpTo({center:[place.lng,place.lat],zoom:place.kind==='country'?3:12});};
 const edit=(e:React.FormEvent)=>{e.preventDefault();if(!lng.trim()||!lat.trim()){setError('enterCoordinates');return;}const x=parseCoordinate(lng),y=parseCoordinate(lat);if(!Number.isFinite(x)||!Number.isFinite(y)||x< -180||x>180||y< -90||y>90){setError('invalidCoordinates');return;}setPoint({lng:x,lat:y});setSelectedCountry(null);if(Math.abs(y)>85.05112878){map?.jumpTo({center:[x,Math.sign(y)*75],zoom:1.25});setError('latitudeCoverage');return;}map?.jumpTo({center:[x,y],zoom:Math.max(map.getZoom(),15)});close();};
 const changeEntry=(id:string)=>{stopRequest();setSelectedId(id);setResult(null);};
 const title=panel==='search'?t('searchPlace'):panel==='location'?t('location'):panel==='menu'?t('menu'):panel==='configuration'?t('scenarios'):panel==='execution'?t('query'):panel==='result'?activeResult?activeResult.title:t('card'):panel==='information'?t('information'):t('disclaimer');
 return <main className="portal" data-ui-state={panel??'exploration'} data-result-signature={activeResult?result?.signature:''} data-selected-point={point?JSON.stringify(point):''} data-selected-country={selectedCountry??''}>
  <Starfield/><Globe onReady={ready}/>
  <nav className="tools" aria-label={t('mapTools')}>
   <button title={t('zoomIn')} aria-label={t('zoomIn')} disabled={!map} onClick={()=>changeZoom(1)}><Icon name="plus"/></button><button title={t('zoomOut')} aria-label={t('zoomOut')} disabled={!map} onClick={()=>changeZoom(-1)}><Icon name="minus"/></button><button title={t('globalView')} aria-label={t('globalView')} disabled={!map} onClick={()=>map?.easeTo({center:[-30,20],zoom:1.25,pitch:0,duration:650})}><Icon name="global"/></button>
   <button title={t('searchPlace')} aria-label={t('searchPlace')} aria-expanded={panel==='search'} onClick={e=>open('search',e.currentTarget)}><Icon name="search"/></button><button title={t('chooseLocation')} aria-label={t('chooseLocation')} aria-expanded={panel==='location'} onClick={e=>open('location',e.currentTarget)}><Icon name="location"/></button><button className="scenarios-tool" title={t('scenarios')} aria-label={t('scenarios')} aria-expanded={['configuration','execution','result'].includes(panel??'')} onClick={e=>open('configuration',e.currentTarget)}><Icon name="scenarios"/></button><button title={t('populationArea')} aria-label={t('populationArea')} aria-expanded={panel==='population'} onClick={e=>open('population',e.currentTarget)}><Icon name="population"/></button>
   <button className="language-tool" title={t('language')} aria-label={t('language')} aria-haspopup="dialog" aria-expanded={languageOpen} onClick={()=>setLanguageOpen(value=>!value)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M8 5v3M5 8c0 4 4 7 7 8M12 8c0 3-3 6-7 7M13 20l4-10 4 10m-6-4h4"/></svg></button>
   <button title={t('menu')} aria-label={t('menu')} aria-expanded={panel==='menu'} onClick={e=>open('menu',e.currentTarget)}><Icon name="menu"/></button>
  </nav>
  <LanguageDialog open={languageOpen} onClose={closeLanguage}/>
  <PopulationAreaTool map={map} open={panel==='population'} onClose={close}/>
  {panel&&panel!=='population'&&<section className="map-panel" ref={panelRef} aria-label={title} aria-busy={panel==='execution'}><div className="panel-top"><h1>{title}</h1><button className="icon-button" aria-label={t('close')} onClick={close}><Icon name="close"/></button></div>
   {panel==='search'?<form onSubmit={search}><label htmlFor="query">{t('countryOrCity')}</label><input id="query" value={query} maxLength={160} onChange={e=>{stopRequest();setQuery(e.target.value);}} autoComplete="off"/><button className="primary" type="submit" disabled={searching}>{searching?t('searching'):t('search')}</button>{searched&&results.length===0&&<p role="status">{t('noPlaces')}</p>}{results.length>0&&<p role="status">{resultCount(language,results.length)}</p>}{results.length>0&&<ul className="search-results" aria-label={t('foundPlaces')}>{localizedResults.map(place=><li key={place.id} data-country-id={countryId(place.countryCode)}><button type="button" onClick={()=>choosePlace(place)}><strong dir="auto">{place.name}</strong><small dir="auto">{place.kind==='country'?t('country'):[t('city'),place.region,place.countryName].filter(Boolean).join(' · ')}</small>{originalCountryName(countryId(place.countryCode),language)&&<small>{t('countryOriginal')}</small>}</button></li>)}</ul>}</form>
   :panel==='location'?<form onSubmit={edit}>{selectedCountry&&<p className="location-country" data-country-id={selectedCountry}><strong dir="auto">{countryLabel(selectedCountry,language)}</strong>{originalCountryName(selectedCountry,language)&&<small>{t('countryOriginal')}</small>}</p>}<label htmlFor="lng">{t('longitude')}</label><input id="lng" dir="ltr" inputMode="decimal" value={lng} onChange={e=>setLng(e.target.value)}/><label htmlFor="lat">{t('latitude')}</label><input id="lat" dir="ltr" inputMode="decimal" value={lat} onChange={e=>setLat(e.target.value)}/><button className="primary" type="submit">{t('useLocation')}</button>{map&&<button className="text-button" type="button" onClick={()=>{const c=map.getCenter();setLng(String(c.lng.toFixed(6)));setLat(String(c.lat.toFixed(6)));}}>{t('useMapCenter')}</button>}{point&&<button className="text-button" type="button" onClick={()=>{setPoint(null);setSelectedCountry(null);close();}}>{t('removeLocation')}</button>}</form>
   :panel==='configuration'?<><div className="category-options" role="group" aria-label={t('categories')}>{availableCategories.map(c=><button type="button" key={c} aria-pressed={selected?.category===c} onClick={()=>changeEntry(entries.find(e=>e.category===c)!.id)}>{c==='Accidente'?t('accident'):c==='Militar'?t('military'):(language==='es'?'Desastre':t('natural'))}</button>)}</div><fieldset className="entry-options"><legend className="sr-only">{t('scenario')}</legend>{entries.filter(e=>e.category===selected?.category).map(e=><label key={e.id}><input type="radio" name="entry" checked={selectedId===e.id} onChange={()=>changeEntry(e.id)}/><span className="scenario-item-title"><strong>{e.title}</strong>{e.yieldTonnesTNT!==undefined&&<small style={{display:'block',color:'#64748b',fontSize:'0.75rem'}}>{number(language,e.yieldTonnesTNT)} t TNT</small>}</span></label>)}</fieldset><button className="primary" type="button" disabled={!selected} onClick={()=>{stopRequest();close();setPlacementMode(true);setDetonationPoint(null);setDetonated(false);}}>SET</button></>
   :panel==='execution'?<p role="status">{t('loadingCard')}</p>
   :panel==='result'&&activeResult?<><ContextCard entry={activeResult} targetPoint={point} onLocate={map?()=>{
       const target=activeResult.location?{lng:activeResult.location.lng,lat:activeResult.location.lat}:(point||map.getCenter());
       if(!activeResult.location)setPoint(target);
       const radii=activeResult.yieldTonnesTNT?calculateBlastRadii(activeResult.yieldTonnesTNT):null;
       const maxRadius = radii ? Math.max(radii.thermalRadiusKm, radii.radius1psiKm, radii.radius20psiKm) : 10;
       const zoom = calculateOptimalZoom(maxRadius);
       map.easeTo({center:[target.lng,target.lat],zoom,duration:700});
     }:undefined}/><button type="button" className="text-button" onClick={()=>open('configuration')}>{t('anotherScenario')}</button></>
   :panel==='information'?<InformationContent/>
   :panel==='disclaimer'?<DisclaimerContent/>
   :panel==='menu'?<div className="menu-items"><a href="#informacion" onClick={e=>{e.preventDefault();open('information');}}>{t('information')}</a><a href="#disclaimer" onClick={e=>{e.preventDefault();open('disclaimer');}}>{t('disclaimer')}</a></div>:null}
   {error&&<p role="alert" className="inline-error">{t(error as MessageKey)}</p>}
  </section>}
  {placementMode && selected && (
   <div className="placement-banner" role="status">
    <div className="placement-banner-content">
     <span className="placement-pulse">🎯</span>
     <div>
      <strong>{language==='es' ? 'Fijar detonación:' : 'Set ground zero:'}</strong>
      <p>{language==='es' ? `Haz click derecho en el globo para situar ${selected.title}` : `Right-click on the globe to place ${selected.title}`}</p>
     </div>
    </div>
    <button type="button" className="text-button placement-cancel-btn" onClick={()=>{setPlacementMode(false);open('configuration');}}>{language==='es'?'Cancelar':'Cancel'}</button>
   </div>
  )}
  {detonationPoint && !detonated && selected && (
   <div className="detonate-hud" role="region" aria-label="Detonate controls">
    <div className="detonate-hud-info">
     <span className="detonate-badge">🎯 {language==='es' ? 'Objetivo fijado' : 'Target set'}</span>
     <strong>{selected.title}</strong>
     <small>{detonationPoint.lat.toFixed(4)}°, {detonationPoint.lng.toFixed(4)}° · {number(language, selected.yieldTonnesTNT || 0)} t TNT</small>
    </div>
    <div className="detonate-hud-actions">
     <button type="button" className="detonate-button" onClick={()=>{
       setDetonated(true);
       const radii = selected.yieldTonnesTNT ? calculateBlastRadii(selected.yieldTonnesTNT) : null;
        const maxRadius = radii ? Math.max(radii.thermalRadiusKm, radii.radius1psiKm, radii.radius20psiKm) : 10;
        const zoom = calculateOptimalZoom(maxRadius);
       map?.easeTo({center:[detonationPoint.lng, detonationPoint.lat], zoom, duration: 800});
     }}>💥 DETONATE</button>
     <button type="button" className="text-button detonate-change-btn" onClick={()=>{setDetonationPoint(null);setPlacementMode(true);}}>{language==='es'?'Cambiar punto':'Change point'}</button>
    </div>
   </div>
  )}
  {detonated && detonationPoint && selected && (
   <section className="floating-blast-card" aria-label="Blast results">
    <div className="panel-top">
     <h1>{selected.title}</h1>
     <button className="icon-button" aria-label={t('close')} onClick={()=>{setDetonated(false);setDetonationPoint(null);}}><Icon name="close"/></button>
    </div>
    <ContextCard entry={selected} targetPoint={detonationPoint} onLocate={map?()=>{
      const radii = selected.yieldTonnesTNT ? calculateBlastRadii(selected.yieldTonnesTNT) : null;
       const maxRadius = radii ? Math.max(radii.thermalRadiusKm, radii.radius1psiKm, radii.radius20psiKm) : 10;
       const zoom = calculateOptimalZoom(maxRadius);
      map.easeTo({center:[detonationPoint.lng, detonationPoint.lat], zoom, duration: 700});
    }:undefined}/>
    <div className="floating-card-actions">
     <button type="button" className="text-button" onClick={()=>{setDetonated(false);setDetonationPoint(null);open('configuration');}}>{t('anotherScenario')}</button>
    </div>
   </section>
  )}
 </main>;
}
