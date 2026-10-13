'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {Map} from 'maplibre-gl';
import type {TerraDraw} from 'terra-draw';
import {useLanguage} from '../LanguageProvider';
import LanguageSelector from '../LanguageSelector';
import {localizePlace} from '../../lib/country-names';
import {number,parseCoordinate} from '../../lib/locale-format';
import {readSearchReply,searchQuerySchema,SEARCH_TIMEOUT_MS,type SearchPlace} from '../../lib/search-contract';
import {canonicalLongitude,geodesicAreaKm2,isValidPopulationGeometry,normalizePopulationGeometry} from '../../lib/population-geometry';
import {geometryVertexCount,POPULATION_ADMIN_DISPLAY_MAX_POLYGONS,POPULATION_ADMIN_DISPLAY_MAX_VERTICES,POPULATION_MAX_AREA_KM2,POPULATION_MAX_BODY_BYTES,POPULATION_MAX_VERTICES,populationAdminReplySchema,populationGeometrySchema,populationReplySchema,type PopulationGeometry} from '../../lib/population-contract';
import {populationBoundarySearchReplySchema,type PopulationBoundaryCandidate} from '../../lib/population-boundary-contract';
import {populationAdmin2CountryCode} from '../../lib/population-country-code';

const RENDER_MODE='population-render',POLYGON_MODE='population-polygon',SELECT_MODE='population-select';
const BOUNDARY_OUTLINE_SOURCE='population-admin-boundary-outline',BOUNDARY_OUTLINE_FILL='population-admin-boundary-fill',BOUNDARY_OUTLINE_LINE='population-admin-boundary-line';
type PopulationReply=Extract<ReturnType<typeof populationReplySchema.parse>,{status:'available'}>;
type PopulationAdminReply=Extract<ReturnType<typeof populationAdminReplySchema.parse>,{status:'available'}>;
type SelectedBoundary=Pick<PopulationAdminReply['boundary'],'boundaryLayerId'|'featureId'|'name'|'countryCode'|'level'|'boundaryYear'|'source'|'license'|'areaKm2'>&{outlineDisplayed:boolean;outlineSimplified:boolean};
function stopTerraDraw(draw?:TerraDraw){
  if(!draw)return;
  try{draw.stop();}catch{/* The parent map may already have removed TerraDraw's style layers during HMR teardown. */}
}
function clearBoundaryOutline(map?:Map|null){
  if(!map)return;
  try{if(map.getLayer(BOUNDARY_OUTLINE_LINE))map.removeLayer(BOUNDARY_OUTLINE_LINE);}catch{}
  try{if(map.getLayer(BOUNDARY_OUTLINE_FILL))map.removeLayer(BOUNDARY_OUTLINE_FILL);}catch{}
  try{if(map.getSource(BOUNDARY_OUTLINE_SOURCE))map.removeSource(BOUNDARY_OUTLINE_SOURCE);}catch{}
}

export default function PopulationAreaTool({map,open,onClose}:{map:Map|null;open:boolean;onClose:()=>void}){
  const {language,t}=useLanguage();
  const [drawReady,setDrawReady]=useState(false),[mode,setMode]=useState(RENDER_MODE),[geometry,setGeometry]=useState<PopulationGeometry|null>(null),[result,setResult]=useState<PopulationReply|PopulationAdminReply|null>(null),[error,setError]=useState(''),[querying,setQuerying]=useState(false);
  const [coordinateLng,setCoordinateLng]=useState(''),[coordinateLat,setCoordinateLat]=useState(''),[draftVertices,setDraftVertices]=useState<Array<[number,number]>>([]);
  const [cityQuery,setCityQuery]=useState(''),[cityResults,setCityResults]=useState<SearchPlace[]>([]),[citySearching,setCitySearching]=useState(false),[citySearched,setCitySearched]=useState(false),[cityMessage,setCityMessage]=useState(''),[selectedCity,setSelectedCity]=useState<SearchPlace|null>(null);
  const [boundaryQuery,setBoundaryQuery]=useState(''),[boundaryResults,setBoundaryResults]=useState<PopulationBoundaryCandidate[]>([]),[boundarySearching,setBoundarySearching]=useState(false),[boundarySearched,setBoundarySearched]=useState(false),[boundaryMessage,setBoundaryMessage]=useState(''),[selectedBoundary,setSelectedBoundary]=useState<SelectedBoundary|null>(null);
  const drawRef=useRef<TerraDraw|null>(null),completedIds=useRef(new Set<string>()),panelRef=useRef<HTMLElement>(null),geometryKey=useRef(''),requestRef=useRef<{id:number;controller?:AbortController}>({id:0}),cityRequestRef=useRef<{id:number;controller?:AbortController}>({id:0}),boundaryRequestRef=useRef<{id:number;controller?:AbortController}>({id:0}),mapDoubleClickWasEnabled=useRef(false);

  const setGeometryIfChanged=useCallback((next:PopulationGeometry|null)=>{
    const signature=next?JSON.stringify(next):'';
    if(signature===geometryKey.current)return;
    geometryKey.current=signature;
    requestRef.current.controller?.abort();requestRef.current.controller=undefined;requestRef.current.id++;
    setQuerying(false);setResult(null);setError('');setGeometry(next);
  },[]);

  const syncCompletedFeatures=useCallback(()=>{
    const draw=drawRef.current;if(!draw)return;
    const snapshot=draw.getSnapshot();
    const present=new Set(snapshot.map(feature=>String(feature.id)));
    for(const id of completedIds.current)if(!present.has(id))completedIds.current.delete(id);
    const polygons=snapshot.filter(feature=>completedIds.current.has(String(feature.id))&&feature.geometry.type==='Polygon').map(feature=>(feature.geometry.coordinates as [number,number][][]).map(ring=>ring.map(([longitude,latitude])=>[canonicalLongitude(longitude),latitude] as [number,number])));
    const next:PopulationGeometry|null=polygons.length===0?null:polygons.length===1?{type:'Polygon',coordinates:polygons[0]}:{type:'MultiPolygon',coordinates:polygons};
    setGeometryIfChanged(next);
  },[setGeometryIfChanged]);

  const searchCity=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();cityRequestRef.current.controller?.abort();
    const parsed=searchQuerySchema.safeParse({q:cityQuery,lang:language});
    if(!parsed.success){setCitySearched(false);setCityResults([]);return;}
    const id=++cityRequestRef.current.id,controller=new AbortController();cityRequestRef.current.controller=controller;
    const timeout=setTimeout(()=>controller.abort(),SEARCH_TIMEOUT_MS);setCitySearching(true);setCitySearched(false);setCityMessage('');setCityResults([]);
    try{
      const response=await fetch('/api/search?'+new URLSearchParams({q:parsed.data.q,lang:parsed.data.lang,limit:String(parsed.data.limit)}),{signal:controller.signal,cache:'no-store'});
      const reply=await readSearchReply(response);if(id!==cityRequestRef.current.id)return;
      if('results'in reply){setCityResults(reply.results.filter(place=>place.kind==='city'));setCitySearched(true);}
      else{setCityMessage(t('searchUnavailable'));setCitySearched(true);}
    }catch{if(id===cityRequestRef.current.id){setCityMessage(t('searchUnavailable'));setCitySearched(true);}}
    finally{clearTimeout(timeout);if(id===cityRequestRef.current.id){cityRequestRef.current.controller=undefined;setCitySearching(false);}}
  };

  const chooseCity=(place:SearchPlace)=>{
    const localized=localizePlace(place,language);cityRequestRef.current.controller?.abort();boundaryRequestRef.current.controller?.abort();boundaryRequestRef.current.id++;requestRef.current.controller?.abort();requestRef.current.controller=undefined;requestRef.current.id++;setQuerying(false);
    clearBoundaryOutline(map);
    map?.jumpTo({center:[localized.lng,localized.lat],zoom:12});
    setSelectedCity(localized);setBoundaryQuery(localized.name);setBoundaryResults([]);setBoundarySearched(false);setBoundaryMessage('');setSelectedBoundary(null);setResult(null);setCityMessage('');
    if(!populationAdmin2CountryCode(localized.countryCode)){setBoundarySearched(true);setBoundaryMessage(t('populationBoundaryUnavailable'));}
  };

  const searchBoundary=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(!selectedCity)return;
    const countryCode=populationAdmin2CountryCode(selectedCity.countryCode),query=boundaryQuery.trim();
    if(!countryCode||query.length<2){setBoundaryResults([]);setBoundarySearched(true);setBoundaryMessage(t('populationBoundaryUnavailable'));return;}
    boundaryRequestRef.current.controller?.abort();const id=++boundaryRequestRef.current.id,controller=new AbortController();boundaryRequestRef.current.controller=controller;
    const timeout=setTimeout(()=>controller.abort(),15_000);setBoundarySearching(true);setBoundarySearched(false);setBoundaryMessage('');setBoundaryResults([]);
    try{
      const params=new URLSearchParams({countryCode,level:'ADM2',q:query});
      const response=await fetch('/api/population/boundaries?'+params,{signal:controller.signal,cache:'no-store'});
      const contentType=response.headers.get('Content-Type')??'';if(!/^application\/json(?:\s*;|$)/i.test(contentType))throw new Error('unexpected_response');
      const reply=populationBoundarySearchReplySchema.safeParse(await response.json());if(id!==boundaryRequestRef.current.id)return;
      if(!reply.success)throw new Error('invalid_response');
      if(!response.ok||!('results'in reply.data)){
        const unavailable='error'in reply.data&&reply.data.status==='no_coverage'||'error'in reply.data&&reply.data.error==='boundary_not_available';
        setBoundaryMessage(unavailable?t('populationBoundaryUnavailable'):t('populationBoundarySearchFailed'));setBoundarySearched(true);return;
      }
      setBoundaryResults(reply.data.results);setBoundarySearched(true);
      if(reply.data.status==='no_match'||!reply.data.results.length)setBoundaryMessage(t('populationBoundaryNotFound'));
    }catch{if(id===boundaryRequestRef.current.id){setBoundaryMessage(t('populationBoundarySearchFailed'));setBoundarySearched(true);}}
    finally{clearTimeout(timeout);if(id===boundaryRequestRef.current.id){boundaryRequestRef.current.controller=undefined;setBoundarySearching(false);}}
  };

  const chooseBoundary=async(candidate:PopulationBoundaryCandidate)=>{
    requestRef.current.controller?.abort();const id=++requestRef.current.id,controller=new AbortController();requestRef.current.controller=controller;
    const timeout=setTimeout(()=>controller.abort(),25_000);setQuerying(true);setError('');setBoundaryMessage('');
    try{
      const response=await fetch('/api/population/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boundaryLayerId:candidate.boundaryLayerId,featureId:candidate.featureId}),signal:controller.signal,cache:'no-store'});
      const contentType=response.headers.get('Content-Type')??'';if(!/^application\/json(?:\s*;|$)/i.test(contentType))throw new Error('unexpected_response');
      const reply=populationAdminReplySchema.safeParse(await response.json());if(id!==requestRef.current.id)return;
      if(!reply.success)throw new Error('invalid_response');
      if(!response.ok||'error'in reply.data){
        const noBoundary='error'in reply.data&&(reply.data.status==='no_coverage'||reply.data.error==='boundary_not_available');
        setBoundaryMessage(noBoundary?t('populationBoundaryUnavailable'):t('populationBoundarySearchFailed'));
        return;
      }
      const boundary=reply.data.boundary;
      const draw=drawRef.current;
      try{draw?.clear();}catch{}
      clearBoundaryOutline(map);
      completedIds.current.clear();
      try{draw?.setMode(RENDER_MODE);}catch{}
      setMode(RENDER_MODE);
      restoreMapDoubleClick();
      let outlineDisplayed=false;
      if(boundary.geometry&&map){
        const polygons=boundary.geometry.type==='Polygon'?[boundary.geometry.coordinates]:boundary.geometry.coordinates;
        const vertexCount=polygons.reduce((sum,polygon)=>sum+polygon.reduce((subtotal,ring)=>subtotal+ring.length,0),0);
        if(vertexCount<=POPULATION_ADMIN_DISPLAY_MAX_VERTICES&&polygons.length<=POPULATION_ADMIN_DISPLAY_MAX_POLYGONS){
          try{
            map.addSource(BOUNDARY_OUTLINE_SOURCE,{type:'geojson',data:{type:'Feature',properties:{},geometry:boundary.geometry}});
            map.addLayer({id:BOUNDARY_OUTLINE_FILL,type:'fill',source:BOUNDARY_OUTLINE_SOURCE,paint:{'fill-color':'#1597ff','fill-opacity':0.22}});
            map.addLayer({id:BOUNDARY_OUTLINE_LINE,type:'line',source:BOUNDARY_OUTLINE_SOURCE,paint:{'line-color':'#ffffff','line-opacity':1,'line-width':2}});
            outlineDisplayed=true;
          }catch{clearBoundaryOutline(map);}
        }
      }
      setGeometryIfChanged(null);
      setSelectedBoundary({boundaryLayerId:boundary.boundaryLayerId,featureId:boundary.featureId,name:boundary.name,countryCode:boundary.countryCode,level:boundary.level,boundaryYear:boundary.boundaryYear,source:boundary.source,license:boundary.license,areaKm2:boundary.areaKm2,outlineDisplayed,outlineSimplified:boundary.geometrySimplified});
      setResult(reply.data);setBoundaryMessage('');setQuerying(false);
    }catch{if(id===requestRef.current.id)setBoundaryMessage(t('populationBoundarySearchFailed'));}
    finally{clearTimeout(timeout);if(id===requestRef.current.id){requestRef.current.controller=undefined;setQuerying(false);}}
  };

  useEffect(()=>{
    if(!map){stopTerraDraw(drawRef.current??undefined);drawRef.current=null;setDrawReady(false);return;}
    let cancelled=false,draw:TerraDraw|undefined;
    const initialize=async()=>{
      try{
        const [{TerraDraw,TerraDrawPolygonMode,TerraDrawRenderMode,TerraDrawSelectMode},{TerraDrawMapLibreGLAdapter}]=await Promise.all([import('terra-draw'),import('terra-draw-maplibre-gl-adapter')]);
        if(cancelled)return;
        const finish=(id:string|number)=>{
          completedIds.current.add(String(id));syncCompletedFeatures();
          draw?.setMode(SELECT_MODE);setMode(SELECT_MODE);
        };
        const change=()=>syncCompletedFeatures();
        draw=new TerraDraw({
          adapter:new TerraDrawMapLibreGLAdapter({map}),
          modes:[
            new TerraDrawRenderMode({modeName:RENDER_MODE,styles:{polygonFillColor:'#1597ff',polygonFillOpacity:0.22,polygonOutlineColor:'#ffffff',polygonOutlineWidth:2}}),
            new TerraDrawPolygonMode({modeName:POLYGON_MODE,keyEvents:{cancel:'Escape',finish:'Enter'},showCoordinatePoints:true,styles:{fillColor:'#1597ff',fillOpacity:0.22,outlineColor:'#ffffff',outlineOpacity:1,outlineWidth:2,closingPointColor:'#ffffff',closingPointWidth:7,coordinatePointColor:'#ffffff',coordinatePointWidth:5}}),
            new TerraDrawSelectMode({modeName:SELECT_MODE,flags:{[POLYGON_MODE]:{feature:{draggable:false,selfIntersectable:false,coordinates:{draggable:true,midpoints:{draggable:true},deletable:true}}}}})
          ]
        });
        draw.on('finish',finish);draw.on('change',change);draw.start();draw.setMode(RENDER_MODE);
        if(cancelled){stopTerraDraw(draw);return;}
        drawRef.current=draw;setDrawReady(true);setMode(RENDER_MODE);
      }catch{
        if(!cancelled)setError('populationQueryFailed');
      }
    };
    void initialize();
    return()=>{cancelled=true;if(drawRef.current===draw)drawRef.current=null;stopTerraDraw(draw);setDrawReady(false);};
  },[map,syncCompletedFeatures]);

  const restoreMapDoubleClick=useCallback(()=>{
    if(!map)return;
    if(mapDoubleClickWasEnabled.current)map.doubleClickZoom.enable();
    mapDoubleClickWasEnabled.current=false;
  },[map]);
  const enterEditMode=useCallback((next:string)=>{
    if(!map||!drawRef.current)return;
    if(mode===RENDER_MODE)mapDoubleClickWasEnabled.current=map.doubleClickZoom.isEnabled();
    map.doubleClickZoom.disable();drawRef.current.setMode(next);setMode(next);
  },[map,mode]);
  const cancelIncompleteDrawing=useCallback(()=>{
    const draw=drawRef.current;
    if(draw){
      const unfinished=draw.getSnapshot().filter(feature=>!completedIds.current.has(String(feature.id))).flatMap(feature=>feature.id===undefined?[]:[feature.id]);
      if(unfinished.length)draw.removeFeatures(unfinished);
      draw.setMode(RENDER_MODE);setMode(RENDER_MODE);
    }
    restoreMapDoubleClick();syncCompletedFeatures();setDraftVertices([]);setCoordinateLng('');setCoordinateLat('');
  },[restoreMapDoubleClick,syncCompletedFeatures]);

  useEffect(()=>{
    if(open){
      if(drawReady){drawRef.current?.setMode(RENDER_MODE);setMode(RENDER_MODE);restoreMapDoubleClick();}
      requestAnimationFrame(()=>panelRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus());
      return;
    }
    requestRef.current.controller?.abort();requestRef.current.controller=undefined;requestRef.current.id++;setQuerying(false);
    cityRequestRef.current.controller?.abort();cityRequestRef.current.controller=undefined;cityRequestRef.current.id++;setCitySearching(false);
    boundaryRequestRef.current.controller?.abort();boundaryRequestRef.current.controller=undefined;boundaryRequestRef.current.id++;setBoundarySearching(false);
    cancelIncompleteDrawing();
  },[open,drawReady,cancelIncompleteDrawing,restoreMapDoubleClick]);

  useEffect(()=>{
    if(!open)return;
    const handleEscape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape')return;
      event.preventDefault();event.stopImmediatePropagation();
      if(mode===POLYGON_MODE)cancelIncompleteDrawing();
      else if(mode===SELECT_MODE){drawRef.current?.setMode(RENDER_MODE);setMode(RENDER_MODE);restoreMapDoubleClick();}
      else onClose();
      requestAnimationFrame(()=>panelRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus());
    };
    document.addEventListener('keydown',handleEscape,true);
    return()=>document.removeEventListener('keydown',handleEscape,true);
  },[open,mode,cancelIncompleteDrawing,restoreMapDoubleClick,onClose]);

  useEffect(()=>()=>{requestRef.current.controller?.abort();cityRequestRef.current.controller?.abort();boundaryRequestRef.current.controller?.abort();clearBoundaryOutline(map);restoreMapDoubleClick();},[map,restoreMapDoubleClick]);

  const normalized=useMemo(()=>{
    if(!geometry)return null;
    try{return normalizePopulationGeometry(geometry);}catch{return null;}
  },[geometry]);
  const validGeometry=Boolean(normalized&&populationGeometrySchema.safeParse(normalized).success&&isValidPopulationGeometry(normalized));
  const areaKm2=useMemo(()=>normalized&&validGeometry?geodesicAreaKm2(normalized):null,[normalized,validGeometry]);

  const clearArea=()=>{
    requestRef.current.controller?.abort();requestRef.current.controller=undefined;requestRef.current.id++;
    clearBoundaryOutline(map);
    completedIds.current.clear();drawRef.current?.clear();drawRef.current?.setMode(RENDER_MODE);setMode(RENDER_MODE);restoreMapDoubleClick();setGeometryIfChanged(null);setResult(null);setSelectedBoundary(null);setError('');setBoundaryMessage('');setQuerying(false);setDraftVertices([]);setCoordinateLng('');setCoordinateLat('');
  };

  const beginDrawing=()=>{
    if(selectedBoundary)clearArea();
    setDraftVertices([]);setCoordinateLng('');setCoordinateLat('');enterEditMode(POLYGON_MODE);
  };

  const addCoordinateVertex=()=>{
    const lng=parseCoordinate(coordinateLng),lat=parseCoordinate(coordinateLat);
    if(!Number.isFinite(lng)||!Number.isFinite(lat)||lng< -180||lng>180||lat< -90||lat>90){setError(t('invalidCoordinates'));return;}
    if(draftVertices.length>=POPULATION_MAX_VERTICES-2){setError(t('areaTooLarge'));return;}
    setDraftVertices(current=>[...current,[lng,lat]]);setCoordinateLng('');setCoordinateLat('');setError('');
  };

  const finishCoordinateArea=()=>{
    if(draftVertices.length<3){setError(t('invalidArea'));return;}
    if(!drawRef.current){setError(t('populationQueryFailed'));return;}
    const coordinates=[...draftVertices,draftVertices[0]];
    const candidate:PopulationGeometry={type:'Polygon',coordinates:[coordinates]};
    let normalizedCandidate:PopulationGeometry;
    try{normalizedCandidate=normalizePopulationGeometry(candidate);}catch{setError(t('invalidArea'));return;}
    if(!populationGeometrySchema.safeParse(normalizedCandidate).success||!isValidPopulationGeometry(normalizedCandidate)||geometryVertexCount(normalizedCandidate)>POPULATION_MAX_VERTICES){setError(t('invalidArea'));return;}
    const draw=drawRef.current,id=crypto.randomUUID();
    const validation=draw.addFeatures([{type:'Feature',id,properties:{mode:POLYGON_MODE},geometry:{type:'Polygon',coordinates:[coordinates]}}])[0];
    if(!validation?.valid){setError(t('invalidArea'));return;}
    const previousIds=[...completedIds.current];completedIds.current.clear();completedIds.current.add(id);
    if(previousIds.length)draw.removeFeatures(previousIds);
    mapDoubleClickWasEnabled.current=map?.doubleClickZoom.isEnabled()??false;map?.doubleClickZoom.disable();
    draw.setMode(SELECT_MODE);setMode(SELECT_MODE);syncCompletedFeatures();setDraftVertices([]);setCoordinateLng('');setCoordinateLat('');setError('');
  };

  const calculate=async()=>{
    if(!normalized){setError(t('areaRequired'));return;}
    if(!validGeometry){setError(t('invalidArea'));return;}
    if(!areaKm2||!Number.isFinite(areaKm2)||areaKm2<=0){setError(t('invalidArea'));return;}
    if(areaKm2>POPULATION_MAX_AREA_KM2){setError(t('areaTooLarge'));return;}
    const body=JSON.stringify({geometry});
    if(new TextEncoder().encode(body).byteLength>POPULATION_MAX_BODY_BYTES){setError(t('areaTooLarge'));return;}
    cancelIncompleteDrawing();
    const id=++requestRef.current.id,controller=new AbortController();requestRef.current.controller=controller;
    const timeout=setTimeout(()=>controller.abort(),25_000);
    setQuerying(true);setResult(null);setError('');
    try{
      const response=await fetch('/api/population/area',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal,cache:'no-store'});
      const contentType=response.headers.get('Content-Type')??'';
      if(!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(contentType))throw new Error('unexpected_response');
      const parsed=populationReplySchema.safeParse(await response.json());
      if(id!==requestRef.current.id)return;
      if(!parsed.success)throw new Error('invalid_response');
      if(!response.ok||parsed.data.status!=='available'){
        const code=parsed.data.status==='available'?'query_failed':parsed.data.error;
        setError(code==='partial_coverage'?t('populationPartialCoverage'):code==='no_coverage'?t('populationNoCoverage'):code==='invalid_geometry'||code==='invalid_country'?t('invalidArea'):code==='area_limit'?t('areaTooLarge'):t('populationQueryFailed'));
        return;
      }
      setResult(parsed.data);
    }catch{
      if(id===requestRef.current.id)setError(controller.signal.aborted?t('populationQueryFailed'):t('populationQueryFailed'));
    }finally{
      clearTimeout(timeout);
      if(id===requestRef.current.id){requestRef.current.controller=undefined;setQuerying(false);}
    }
  };

  const localizedCityResults=cityResults.map(place=>localizePlace(place,language));
  return <>{open&&<section className="map-panel population-panel" ref={panelRef} aria-label={t('populationArea')} aria-busy={querying}>
    <div className="panel-top"><h1>{t('populationArea')}</h1><button className="icon-button" type="button" aria-label={t('close')} onClick={onClose}><span aria-hidden="true">×</span></button></div>
    <details className="locale-control"><summary>{t('language')}</summary><LanguageSelector/></details>
    <p>{t('populationDescription')}</p>
    <p className="population-draw-instructions">{t('populationCitySearchInstructions')}</p>
    <form className="population-boundary-search" onSubmit={searchCity}>
      <label htmlFor="population-city-search">{t('countryOrCity')}</label>
      <input id="population-city-search" value={cityQuery} maxLength={160} autoComplete="off" onChange={event=>{setCityQuery(event.target.value);setCitySearched(false);setCityMessage('');}} />
      <button className="primary" type="submit" disabled={citySearching||cityQuery.trim().length<2}>{citySearching?t('searching'):t('search')}</button>
      {cityMessage&&<p className="inline-error" role="alert">{cityMessage}</p>}
      {citySearched&&!cityResults.length&&!cityMessage&&<p role="status">{t('noPlaces')}</p>}
      {localizedCityResults.length>0&&<ul className="search-results" aria-label={t('foundPlaces')}>{localizedCityResults.map(place=><li key={place.id}><button type="button" aria-pressed={selectedCity?.id===place.id} onClick={()=>chooseCity(place)}><strong dir="auto">{place.name}</strong><small dir="auto">{[t('city'),place.region,place.countryName].filter(Boolean).join(' · ')}</small></button></li>)}</ul>}
      {selectedCity&&<p role="status">{t('city')}: {selectedCity.name} · {selectedCity.countryName}</p>}
    </form>
    {selectedCity&&<form className="population-boundary-search" onSubmit={searchBoundary}>
      <label htmlFor="population-boundary-search">{t('populationAdministrativeUnit')}</label>
      <input id="population-boundary-search" value={boundaryQuery} maxLength={160} autoComplete="off" onChange={event=>{setBoundaryQuery(event.target.value);setBoundarySearched(false);setBoundaryMessage('');}} />
      <button className="primary" type="submit" disabled={boundarySearching||querying||boundaryQuery.trim().length<2}>{boundarySearching?t('populationSearchingBoundary'):t('populationSearchBoundary')}</button>
      {boundaryMessage&&<p className="inline-error" role="status">{boundaryMessage}</p>}
      {boundarySearched&&!boundaryMessage&&!boundaryResults.length&&<p role="status">{t('populationBoundaryNotFound')}</p>}
      {boundaryResults.length>0&&<ul className="search-results" aria-label={t('populationAdministrativeUnit')}>{boundaryResults.map(candidate=><li key={`${candidate.boundaryLayerId}:${candidate.featureId}`}><button type="button" disabled={querying} onClick={()=>void chooseBoundary(candidate)}><strong dir="auto">{candidate.name}</strong><small dir="auto">{candidate.level} · {candidate.boundaryYear} · {candidate.source}</small></button></li>)}</ul>}
    </form>}
    <p className="population-draw-instructions" role="status">{t('drawInstructions')}</p>
    <form className="population-coordinate-form" onSubmit={e=>{e.preventDefault();addCoordinateVertex();}}>
      <p>{t('keyboardDrawingInstructions')}</p>
      <div className="population-coordinate-inputs"><label>{t('longitude')}<input aria-label={t('longitude')} dir="ltr" inputMode="decimal" value={coordinateLng} onChange={e=>setCoordinateLng(e.target.value)}/></label><label>{t('latitude')}<input aria-label={t('latitude')} dir="ltr" inputMode="decimal" value={coordinateLat} onChange={e=>setCoordinateLat(e.target.value)}/></label></div>
      <div className="population-actions"><button type="submit">{t('addVertex')}</button><button type="button" onClick={()=>setDraftVertices(current=>current.slice(0,-1))} disabled={!draftVertices.length}>{t('removeLastVertex')}</button><button type="button" onClick={finishCoordinateArea} disabled={draftVertices.length<3||!drawReady}>{t('finishCoordinateArea')}</button></div>
      {draftVertices.length>0&&<ol className="population-vertices">{draftVertices.map(([lng,lat],index)=><li key={`${index}-${lng}-${lat}`}><span dir="ltr">{number(language,lng,{maximumFractionDigits:6})}, {number(language,lat,{maximumFractionDigits:6})}</span></li>)}</ol>}
    </form>
    <div className="population-actions">
      <button type="button" onClick={beginDrawing} disabled={!drawReady}>{t('drawArea')}</button>
      <button type="button" onClick={()=>enterEditMode(SELECT_MODE)} disabled={!drawReady||!geometry||Boolean(selectedBoundary)}>{t('editArea')}</button>
      {mode===POLYGON_MODE&&<button type="button" onClick={cancelIncompleteDrawing}>{t('cancelDrawing')}</button>}
      {mode===SELECT_MODE&&<button type="button" onClick={()=>{drawRef.current?.setMode(RENDER_MODE);setMode(RENDER_MODE);restoreMapDoubleClick();}}>{t('finishEditing')}</button>}
      <button type="button" onClick={clearArea} disabled={!geometry&&!selectedBoundary&&!result}>{t('clearArea')}</button>
    </div>
    <button className="primary" type="button" onClick={()=>void calculate()} disabled={!drawReady||!geometry||!validGeometry||querying}>{querying?t('queryingPopulation'):t('queryPopulation')}</button>
    {geometry&&!validGeometry&&<p className="inline-error" role="alert">{t('invalidArea')}</p>}
    {areaKm2!==null&&validGeometry&&<p className="population-area-size">{t('populationAreaLabel')}: {number(language,areaKm2,{maximumFractionDigits:areaKm2<1?6:1})} km²</p>}
    {error&&<p className="inline-error" role="alert">{error==='populationQueryFailed'?t('populationQueryFailed'):error}</p>}
    {selectedBoundary&&<p className="population-boundary-selected" role="status"><strong>{t('populationBoundarySelected')}:</strong> {selectedBoundary.name} ({selectedBoundary.level}, {selectedBoundary.boundaryYear}) · {selectedCity?.countryName??selectedBoundary.countryCode}</p>}
    {selectedBoundary&&<p className="population-boundary-source">{selectedBoundary.source} · {selectedBoundary.license}</p>}
    {selectedBoundary&&!selectedBoundary.outlineDisplayed&&<p className="population-boundary-source">{t('populationBoundaryOutlineOmitted')}</p>}
    {selectedBoundary&&selectedBoundary.outlineDisplayed&&selectedBoundary.outlineSimplified&&<p className="population-boundary-source">{t('populationBoundaryOutlineSimplified')}</p>}
    {result&&<article className="population-result" aria-live="polite">
      <h2>{t('populationEstimate')}</h2>
      <p className="population-value"><strong>{number(language,result.population,{maximumFractionDigits:0})}</strong> {t('populationPeople')}</p>
      <p>{t('populationAreaLabel')}: {number(language,result.areaKm2,{maximumFractionDigits:result.areaKm2<1?6:1})} km²</p>
      <p>{t('populationMethod')}</p>
      {result.areaKm2<0.01&&<p role="status">{t('populationSmallAreaResolution')}</p>}
      {result.coverage.status==='partial'&&<p role="status">{t('populationDataGaps')} ({number(language,result.coverage.validGridCells)}/{number(language,result.coverage.intersectedGridCells)} {t('populationValidCells')})</p>}
    </article>}
  </section>}</>;
}
