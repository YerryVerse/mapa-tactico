import type {Map} from 'maplibre-gl';
import type {ContextEntry} from './scenario-contract';
export function mountContextLayer(map:Map,entry:ContextEntry){
 const source='context-source',point='context-point',label='context-label';
 const remove=()=>{try{for(const id of [label,point])if(map.getLayer(id))map.removeLayer(id);if(map.getSource(source))map.removeSource(source);}catch{/* A disposed map has no live layers. */}};
 const add=()=>{remove();if(!entry.location)return;map.addSource(source,{type:'geojson',data:{type:'Feature',properties:{label:entry.location.label},geometry:{type:'Point',coordinates:[entry.location.lng,entry.location.lat]}}});map.addLayer({id:point,type:'circle',source,paint:{'circle-radius':8,'circle-color':'#fff','circle-stroke-color':'#003876','circle-stroke-width':3}});map.addLayer({id:label,type:'symbol',source,layout:{'text-field':['get','label'],'text-font':['Noto Sans Regular'],'text-size':14,'text-offset':[0,1.7],'text-anchor':'top'},paint:{'text-color':'#fff','text-halo-color':'#003876','text-halo-width':2}});};
 if(map.isStyleLoaded())add();else map.once('load',add);
 return()=>{map.off('load',add);remove();};
}
