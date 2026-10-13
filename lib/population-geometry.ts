import {area as geodesicArea} from '@turf/area';
import {booleanValid} from '@turf/boolean-valid';
import polygonClipping,{type MultiPolygon,type Polygon} from 'polygon-clipping';
import type {PopulationGeometry} from './population-contract';

export type ClippingGeometry=Polygon|MultiPolygon;
export function canonicalLongitude(longitude:number){const wrapped=((longitude+180)%360+360)%360-180;return wrapped===-180&&longitude>0?180:wrapped;}
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

function unwrapRing(ring:Polygon[number],reference?:number):Polygon[number]{
  const open=ring.slice(0,-1);
  if(!open.length)return ring;
  const unwrapped:Polygon[number]=[];
  let previous=open[0][0];
  unwrapped.push([previous,open[0][1]]);
  for(const [longitude,latitude] of open.slice(1)){
    let next=longitude;
    while(next-previous>180)next-=360;
    while(next-previous< -180)next+=360;
    unwrapped.push([next,latitude]);previous=next;
  }
  const start=unwrapped[0][0],previousLongitude=unwrapped.at(-1)![0];
  let closing=start;
  while(closing-previousLongitude>180)closing-=360;
  while(closing-previousLongitude< -180)closing+=360;
  if(Math.abs(start-closing)>1e-7)throw new Error('population_geometry_wrap_ambiguous');
  unwrapped.push([closing,unwrapped[0][1]]);
  if(reference!==undefined){
    const center=unwrapped.reduce((sum,point)=>sum+point[0],0)/unwrapped.length;
    const shift=360*Math.round((reference-center)/360);
    return unwrapped.map(([longitude,latitude])=>[longitude+shift,latitude]);
  }
  return unwrapped;
}

function splitAtAntimeridian(polygon:Polygon):MultiPolygon{
  const outer=unwrapRing(polygon[0]);
  const center=outer.reduce((sum,point)=>sum+point[0],0)/outer.length;
  const holes=polygon.slice(1).map(hole=>unwrapRing(hole,center));
  const unwrapped=[outer,...holes] as Polygon;
  const longitudes=outer.map(point=>point[0]),west=Math.min(...longitudes),east=Math.max(...longitudes);
  const rawLongitudes=polygon[0].map(point=>point[0]),rawSpan=Math.max(...rawLongitudes)-Math.min(...rawLongitudes);
  const crossed=polygon[0].some((point,index)=>index>0&&Math.abs(point[0]-polygon[0][index-1][0])>180);
  if(rawSpan>180&&!crossed)throw new Error('population_geometry_wrap_ambiguous');
  const firstStrip=Math.floor((west+180)/360),lastStrip=Math.floor((east+180-1e-10)/360);
  const pieces:MultiPolygon=[];
  for(let strip=firstStrip;strip<=lastStrip;strip++){
    const left=-180+strip*360,right=180+strip*360;
    const clip:Polygon=[[[left,-90],[right,-90],[right,90],[left,90],[left,-90]]];
    const intersections=polygonClipping.intersection(unwrapped,clip);
    for(const piece of intersections){
      const shifted=piece.map(ring=>ring.map(([longitude,latitude])=>{
        let value=longitude-strip*360;
        if(Math.abs(value-180)<1e-8)value=180;
        if(Math.abs(value+180)<1e-8)value=-180;
        return [value,latitude] as [number,number];
      })) as Polygon;
      if(shifted[0]?.length>=4)pieces.push(shifted);
    }
  }
  return pieces;
}

/** Split date-line crossings into valid WGS84 pieces and union overlaps before raster summation. */
export function normalizePopulationGeometry(geometry:PopulationGeometry):PopulationGeometry{
  const polygons=geometry.type==='Polygon'?[geometry.coordinates as Polygon]:geometry.coordinates as MultiPolygon;
  let merged:MultiPolygon=[];
  for(const polygon of polygons){
    const pieces=splitAtAntimeridian(polygon);
    if(!pieces.length)throw new Error('population_geometry_empty');
    merged=merged.length?polygonClipping.union(merged,pieces):pieces;
  }
  if(!merged.length)throw new Error('population_geometry_empty');
  return merged.length===1?{type:'Polygon',coordinates:merged[0]}:{type:'MultiPolygon',coordinates:merged};
}

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
