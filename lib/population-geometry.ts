import {area as geodesicArea} from '@turf/area';
import {booleanValid} from '@turf/boolean-valid';
import polygonClipping,{type MultiPolygon,type Polygon} from 'polygon-clipping';
import type {PopulationGeometry} from './population-contract';

export type ClippingGeometry=Polygon|MultiPolygon;
export function toClippingGeometry(geometry:PopulationGeometry):ClippingGeometry{
  return geometry.type==='Polygon'?geometry.coordinates as Polygon:geometry.coordinates as MultiPolygon;
}
export function isValidPopulationGeometry(geometry:PopulationGeometry){return booleanValid(geometry);}
export function geodesicAreaKm2(geometry:PopulationGeometry|ClippingGeometry){
  let geojson:PopulationGeometry;
  if('type'in geometry&&geometry.type==='Polygon'||'type'in geometry&&geometry.type==='MultiPolygon')geojson=geometry as PopulationGeometry;
  else{
    const coordinates=geometry as ClippingGeometry;
    const isPolygon=typeof coordinates[0]?.[0]?.[0]==='number';
    geojson=isPolygon?{type:'Polygon',coordinates:coordinates as Polygon}:{type:'MultiPolygon',coordinates:coordinates as MultiPolygon};
  }
  return geodesicArea(geojson as never)/1_000_000;
}
export function unionAreas(geometries:ClippingGeometry[]){
  if(!geometries.length)return [] as MultiPolygon;
  return geometries.length===1?(Array.isArray(geometries[0][0][0])?geometries[0]:[geometries[0]]) as MultiPolygon:polygonClipping.union(geometries[0],...geometries.slice(1));
}
export function intersectAreas(a:ClippingGeometry,b:ClippingGeometry){return polygonClipping.intersection(a,b);}
let runtimeCheck:boolean|undefined;
export function verifyPopulationGeometryRuntime(){
  if(runtimeCheck!==undefined)return runtimeCheck;
  try{
    const first:Polygon=[[[0,0],[2,0],[2,1],[0,1],[0,0]]];
    const second:Polygon=[[[1,0],[3,0],[3,1],[1,1],[1,0]]];
    const merged=unionAreas([first,second]),overlap=intersectAreas(first,second);
    const unionArea=geodesicAreaKm2(merged),overlapArea=geodesicAreaKm2(overlap);
    runtimeCheck=merged.length===1&&overlap.length===1&&Number.isFinite(unionArea)&&Number.isFinite(overlapArea)&&unionArea>overlapArea&&unionArea<geodesicAreaKm2(first)+geodesicAreaKm2(second);
  }catch{runtimeCheck=false;}
  return runtimeCheck;
}
