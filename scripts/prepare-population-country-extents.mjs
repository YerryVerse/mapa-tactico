import {readFile,writeFile} from 'node:fs/promises';

const root='data/population';
const catalog=JSON.parse(await readFile(`${root}/catalog.json`,'utf8'));
const service=JSON.parse(await readFile(`${root}/service-catalog.json`,'utf8'));
const sourceDirectory='.sites-runtime/population-work/boundaries';
const cellSize=0.5;
const unavailableFallbackBounds={
  ATF:[[50.3,-49.9,52.8,-45.0],[68.0,-50.2,71.0,-47.5],[77.0,-39.5,78.1,-37.2],[136,-90,142,-66]],
  BVT:[[3.0,-55,4.0,-54]],
  HMD:[[72,-54,74,-52]],
  IOT:[[70,-8,74,-4]],
  SGS:[[-39,-61,-25,-52]],
  UMI:[[-177,0,-175,1],[-176,0,-175,2],[-161,-1,-159,1],[-170,16,-168,18],[-178,27,-176,29],[-163,5,-161,7],[166,18,168,20]]
};
const levels=['ADM0','ADM1','ADM2'];
const layersByCountry=new Map();
for(const layer of service.boundaries.adminLayers){
  const current=layersByCountry.get(layer.countryCode);
  if(!current||levels.indexOf(layer.level)<levels.indexOf(current.level))layersByCountry.set(layer.countryCode,layer);
}

function longitudeIntervals(points){
  const values=points.filter((point)=>Array.isArray(point)&&Number.isFinite(point[0])&&Number.isFinite(point[1]));
  if(values.length<4)throw new Error('A country polygon has too few outer-ring points');
  const unwrapped=[];let previous=values[0][0];unwrapped.push(previous);
  for(const [longitude] of values.slice(1)){
    let next=longitude;
    while(next-previous>180)next-=360;
    while(next-previous< -180)next+=360;
    unwrapped.push(next);previous=next;
  }
  if(Math.abs(unwrapped[0]-unwrapped.at(-1))>1e-5)throw new Error('A country polygon winds ambiguously around the world');
  const west=unwrapped.reduce((minimum,value)=>Math.min(minimum,value),Infinity),east=unwrapped.reduce((maximum,value)=>Math.max(maximum,value),-Infinity);
  const south=values.reduce((minimum,point)=>Math.min(minimum,point[1]),Infinity),north=values.reduce((maximum,point)=>Math.max(maximum,point[1]),-Infinity);
  if(south< -90.000001||north>90.000001)throw new Error('A boundary latitude is outside WGS84');
  const boxes=[];
  const first=Math.floor((west+180)/360),last=Math.floor((east+180-1e-10)/360);
  for(let strip=first;strip<=last;strip++){
    const left=Math.max(-180,west-strip*360),right=Math.min(180,east-strip*360);
    if(right>=left)boxes.push([left,south,right,north].map((value)=>Number(value.toFixed(6))));
  }
  return boxes;
}

function polygonBounds(geometry){
  if(!geometry||typeof geometry!=='object')throw new Error('A boundary feature has no geometry');
  if(geometry.type==='Polygon')return longitudeIntervals(geometry.coordinates[0]);
  if(geometry.type==='MultiPolygon')return geometry.coordinates.flatMap((polygon)=>longitudeIntervals(polygon[0]));
  if(geometry.type==='GeometryCollection')return geometry.geometries.flatMap(polygonBounds);
  throw new Error(`Unsupported boundary geometry ${geometry.type}`);
}

function splitRasterBounds(bounds){
  return [bounds];
}

function overallBounds(bounds){
  if(!bounds.length)return [];
  return [[
    bounds.reduce((value,box)=>Math.min(value,box[0]),Infinity),
    bounds.reduce((value,box)=>Math.min(value,box[1]),Infinity),
    bounds.reduce((value,box)=>Math.max(value,box[2]),-Infinity),
    bounds.reduce((value,box)=>Math.max(value,box[3]),-Infinity)
  ]];
}

const rasterByCode=new Map(catalog.population.datasets.map((dataset)=>[dataset.countryCode,dataset]));
const codes=[...new Set([
  ...catalog.population.datasets.map((dataset)=>dataset.countryCode),
  ...catalog.population.unavailableCountryCodes
])].sort();
const entries=[];
for(const countryCode of codes){
  const layer=layersByCountry.get(countryCode),dataset=rasterByCode.get(countryCode);
  let bounds=[],source='';
  if(layer){
    const path=`${sourceDirectory}/${layer.boundaryId}.geojson`;
    const raw=JSON.parse(await readFile(path,'utf8'));
    if(raw.type!=='FeatureCollection'||!Array.isArray(raw.features)||raw.features.length===0)throw new Error(`Invalid country boundary ${layer.boundaryId}`);
    bounds=raw.features.flatMap((feature)=>polygonBounds(feature.geometry));
    source=layer.boundaryId;
  }else if(dataset){
    bounds=splitRasterBounds(dataset.bounds).map((box)=>box.map((value)=>Number(value.toFixed(6))));
    source=`raster:${dataset.datasetId}`;
  }else if(unavailableFallbackBounds[countryCode]){
    bounds=unavailableFallbackBounds[countryCode];
    source='unavailable:conservative-no-coverage-envelope';
  }else{
    source='unavailable:no-pinned-boundary';
  }
  bounds=[...new Map(bounds.map((box)=>[JSON.stringify(box),box])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]||a[3]-b[3]);
  entries.push({countryCode,populationAvailable:Boolean(dataset),source,bounds});
}
const cells=new Map();
for(const entry of entries){
  for(const [west,south,east,north] of entry.bounds){
    const minX=Math.max(0,Math.floor((west+180)/cellSize)),maxX=Math.min(360/cellSize-1,Math.floor((east+180-1e-9)/cellSize));
    const minY=Math.max(0,Math.floor((south+90)/cellSize)),maxY=Math.min(180/cellSize-1,Math.floor((north+90-1e-9)/cellSize));
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
      const key=`${x},${y}`,codes=cells.get(key)??[];
      if(!codes.includes(entry.countryCode))codes.push(entry.countryCode);
      cells.set(key,codes);
    }
  }
}
const output={schemaVersion:1,cellSizeDegrees:cellSize,sourceRelease:service.release??service.schemaVersion,generatedFrom:'data/population/catalog.json + data/population/service-catalog.json + .sites-runtime/population-work/boundaries',countries:entries.map(({countryCode,populationAvailable,source,bounds})=>({countryCode,populationAvailable,source,bounds:overallBounds(bounds)})),cells:Object.fromEntries([...cells.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,codes])=>[key,codes.sort()]))};
await writeFile(`${root}/country-extents.json`,JSON.stringify(output)+'\n',{encoding:'utf8'});
console.log(`Índice territorial generado para ${entries.length} códigos (${entries.filter((entry)=>entry.populationAvailable).length} con raster); ${cells.size} celdas de ${cellSize}°.`);
