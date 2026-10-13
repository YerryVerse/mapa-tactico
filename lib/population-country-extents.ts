import extents from '../data/population/country-extents.json';
import type {PopulationGeometry} from './population-contract';

const index=extents as unknown as {cellSizeDegrees:number;countries:Array<{countryCode:string;populationAvailable:boolean;bounds:[number,number,number,number][]}>;cells:Record<string,string[]>};
export const POPULATION_COUNTRY_CELL_BUDGET=256;
const countriesByCode=new Map(index.countries.map((country)=>[country.countryCode,country]));

type Bounds=[west:number,south:number,east:number,north:number];
function intersects(a:Bounds,b:Bounds){return a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}

export function populationCountryCandidates(geometry:PopulationGeometry){
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  const countryCodes=new Set<string>(),cellSize=index.cellSizeDegrees,polygonBounds:Bounds[]=[];
  let cellsVisited=0;
  for(const polygon of polygons){
    const outer=polygon[0];
    const west=outer.reduce((value,point)=>Math.min(value,point[0]),Infinity),east=outer.reduce((value,point)=>Math.max(value,point[0]),-Infinity);
    const south=outer.reduce((value,point)=>Math.min(value,point[1]),Infinity),north=outer.reduce((value,point)=>Math.max(value,point[1]),-Infinity);
    polygonBounds.push([west,south,east,north]);
    const minX=Math.max(0,Math.floor((west+180)/cellSize)),maxX=Math.min(360/cellSize-1,Math.floor((east+180)/cellSize));
    const minY=Math.max(0,Math.floor((south+90)/cellSize)),maxY=Math.min(180/cellSize-1,Math.floor((north+90)/cellSize));
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
      cellsVisited++;
      if(cellsVisited>POPULATION_COUNTRY_CELL_BUDGET)return {countryCodes:[...countryCodes].sort(),cellsVisited,overBudget:true};
      for(const countryCode of index.cells[`${x},${y}`]??[])countryCodes.add(countryCode);
    }
  }
  const refined=[...countryCodes].filter((countryCode)=>{
    const bounds=countriesByCode.get(countryCode)?.bounds as Bounds[]|undefined;
    return Boolean(bounds?.some((countryBounds)=>polygonBounds.some((areaBounds)=>intersects(countryBounds,areaBounds))));
  }).sort();
  return {countryCodes:refined,cellsVisited,overBudget:false};
}

export function populationCountryAvailability(countryCode:string){
  return countriesByCode.get(countryCode)?.populationAvailable===true;
}
