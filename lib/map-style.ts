import type {StyleSpecification} from 'maplibre-gl';
import {mapFonts} from './map-fonts';
export const TILE_EDITION='20261004_113936_pt';
const source='world';
const names=['coalesce',['get','name:es'],['get','name'],['get','name:latin']] as const;
// Whitelist only land, boundaries, roads and geographical labels; no POI source is rendered.
export function atlasStyle():StyleSpecification{return {
 version:8,name:'ATLAS azul',projection:{type:'globe'},'font-faces':mapFonts,sky:{'sky-color':'#000000','horizon-color':'#000000','fog-color':'#003876','atmosphere-blend':0},
 glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
 sources:{world:{type:'vector',tiles:[`https://tiles.openfreemap.org/planet/${TILE_EDITION}/{z}/{x}/{y}.pbf`],minzoom:0,maxzoom:14,attribution:'<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>'}},
 layers:[
 {id:'land-base',type:'background',paint:{'background-color':'#164a82'}},
 {id:'land',type:'fill',source,'source-layer':'landcover',paint:{'fill-color':'#164a82','fill-opacity':.65}},
 {id:'landuse',type:'fill',source,'source-layer':'landuse',minzoom:7,paint:{'fill-color':'#215489','fill-opacity':.65}},
 {id:'water',type:'fill',source,'source-layer':'water',paint:{'fill-color':'#003876'}},
 {id:'border',type:'line',source,'source-layer':'boundary',filter:['all',['==',['get','admin_level'],2],['!=',['get','maritime'],1]],paint:{'line-color':'#dceafa','line-width':['interpolate',['linear'],['zoom'],0,.7,6,1.2],'line-opacity':.7}},
 {id:'streets',type:'line',source,'source-layer':'transportation',minzoom:6,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service','track','path']]],paint:{'line-color':'#e5effa','line-opacity':['interpolate',['linear'],['zoom'],6,.3,13,.85],'line-width':['interpolate',['exponential',1.4],['zoom'],6,.3,14,2.5,20,18]}},
 {id:'countries',type:'symbol',source,'source-layer':'place',filter:['==',['get','class'],'country'],maxzoom:8,layout:{'text-field':names as any,'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],0,10,4,16],'text-max-width':7},paint:{'text-color':'#ffffff','text-halo-color':'#003876','text-halo-width':1}},
 {id:'cities',type:'symbol',source,'source-layer':'place',filter:['in',['get','class'],['literal',['city','town','village']]],minzoom:4,maxzoom:15,layout:{'text-field':names as any,'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],4,11,12,16]},paint:{'text-color':'#ffffff','text-halo-color':'#003876','text-halo-width':1.5}},
 {id:'street-names',type:'symbol',source,'source-layer':'transportation_name',minzoom:12,layout:{'symbol-placement':'line','text-field':['coalesce',['get','name'],['get','name:latin']],'text-font':['Noto Sans Regular'],'text-size':13,'text-max-angle':35,'symbol-spacing':240},paint:{'text-color':'#ffffff','text-halo-color':'#003876','text-halo-width':2}}
 ]};}
