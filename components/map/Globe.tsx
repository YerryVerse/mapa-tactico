'use client';
import {useEffect,useRef,useState} from 'react';
import type {Map} from 'maplibre-gl';
import {atlasStyle} from '../../lib/map-style';
import {scriptSamples} from '../../lib/map-fonts';
const locations=[{name:'Santo Domingo',lng:-69.8845,lat:18.4737},{name:'Quito',lng:-78.513,lat:-.2202},{name:'Madrid',lng:-3.7038,lat:40.4168},{name:'Tokio',lng:139.767,lat:35.681},{name:'Nairobi',lng:36.8219,lat:-1.2921},{name:'Sídney',lng:151.2093,lat:-33.8688},{name:'Rural',lng:-69.81,lat:18.81},{name:'Islandia',lng:-21.9426,lat:64.1466},{name:'Polo',lng:0,lat:89},{name:'Meridiano180',lng:179.99,lat:-16.8}];
export default function Globe({diagnostics=false}:{diagnostics?:boolean}){
 const container=useRef<HTMLDivElement>(null);const mapRef=useRef<Map|null>(null);
 const [retry,setRetry]=useState(0),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [metrics,setMetrics]=useState(''),[samples,setSamples]=useState(false),[benchmark,setBenchmark]=useState('');
 useEffect(()=>{let cancelled=false;let map:Map|undefined;
  setError('');setLoading(true);
  (async()=>{try{
   const ml=await import('maplibre-gl');
   if(cancelled||!container.current)return;
   ml.setWorkerUrl('/map-worker/maplibre-gl-worker-6.13.0.mjs');
   map=new ml.Map({container:container.current,style:atlasStyle(),center:[-30,20],zoom:1.25,minZoom:0,maxZoom:22,pitch:0,maxPitch:0,dragRotate:false,touchPitch:false,zoomLevelsToOverscale:8,attributionControl:{compact:false},renderWorldCopies:false,localIdeographFontFamily:false});
   mapRef.current=map;
   map.addControl(new ml.NavigationControl({showCompass:false}),'bottom-right');
   map.addControl(new ml.ScaleControl({unit:'metric'}),'bottom-left');
   map.on('load',()=>{setLoading(false);container.current?.setAttribute('data-load-ms',String(performance.now()));});
   const record=()=>{if(!map)return;const c=map.getCenter(),z=map.getZoom(),d=5/(111319.49079327358*Math.cos(c.lat*Math.PI/180));const a=map.project(c),b=map.project([c.lng+d,c.lat]);const px=Math.hypot(b.x-a.x,b.y-a.y);const data={center:[c.lng,c.lat],zoom:z,projection:map.getProjection().type,viewport:[container.current?.clientWidth,container.current?.clientHeight],fiveMetersCssPx:px,tilesLoaded:map.areTilesLoaded()};container.current?.setAttribute('data-camera',JSON.stringify(data));setMetrics(JSON.stringify(data));};
   map.on('moveend',record);map.on('idle',record);
   map.on('error',e=>{console.error('Map load:',e.error.message);setError('No se pudo cargar una parte del mapa. Reintenta.');setLoading(false);});
   map.on('webglcontextlost',()=>setError('El mapa perdió acceso a los gráficos. Reintenta.'));
   map.getCanvas().setAttribute('aria-label','Mapa mundial. Flechas para mover y + o − para acercar.');
  }catch(e){console.error(e);if(!cancelled){setLoading(false);setError('Este dispositivo no pudo abrir el mapa. Reintenta con gráficos WebGL2 disponibles.');}}
  })();return()=>{cancelled=true;mapRef.current=null;map?.remove();};
 },[retry]);
 const measure=()=>{const m=mapRef.current;if(!m)return;let frames=0;const start=performance.now();let first=0;const onRender=()=>{frames++;if(!first)first=performance.now()-start;};m.on('render',onRender);m.once('moveend',()=>{m.off('render',onRender);const duration=performance.now()-start;setBenchmark(JSON.stringify({durationMs:duration,frames,fps:frames/(duration/1000),controlRenderMs:first}));});m.easeTo({zoom:m.getZoom()+.5,center:[m.getCenter().lng+1,m.getCenter().lat],duration:3000,essential:true});};
 const showSamples=()=>{const m=mapRef.current;if(!m)return;const on=!samples;setSamples(on);if(!on){m.removeLayer('script-samples');m.removeSource('script-samples');return;}m.jumpTo({center:[0,0],zoom:2.5});m.addSource('script-samples',{type:'geojson',data:{type:'FeatureCollection',features:scriptSamples.map((text,i)=>({type:'Feature',geometry:{type:'Point',coordinates:[-35+(i%4)*22,35-Math.floor(i/4)*16]},properties:{text}}))}});m.addLayer({id:'script-samples',type:'symbol',source:'script-samples',layout:{'text-field':['get','text'],'text-font':['Noto Sans Regular'],'text-size':18,'text-allow-overlap':true},paint:{'text-color':'#fff','text-halo-color':'#003876','text-halo-width':2}});};
 return <><div className="map" ref={container}/>{loading&&<p className="map-loading" role="status">Cargando mapa…</p>}{error&&<div className="map-error" role="alert">{error}<button onClick={()=>setRetry(v=>v+1)}>Reintentar</button></div>}{diagnostics&&<aside className="qa"><h1>Verificación del mapa</h1>{locations.map(l=><button key={l.name} onClick={()=>mapRef.current?.jumpTo({center:[l.lng,l.lat],zoom:l.name==='Polo'?2:19,pitch:0})}>{l.name}</button>)}<button onClick={()=>mapRef.current?.jumpTo({center:[-30,20],zoom:1.25})}>Global</button><button onClick={showSamples}>Muestras de escritura</button><button onClick={measure}>Medir rendimiento</button><output data-testid="camera-metrics">{metrics}</output><output data-testid="benchmark">{benchmark}</output>{samples&&<div>{scriptSamples.map(s=><p key={s} dir="auto">{s}</p>)}</div>}</aside>}</>;
}
