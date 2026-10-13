import {z} from 'zod';

export const POPULATION_YEAR=2025;
export const POPULATION_RELEASE='R2025A';
export const POPULATION_RESOLUTION='100m';
export const POPULATION_MAX_BODY_BYTES=65_536;
export const POPULATION_MAX_VERTICES=5_000;
export const POPULATION_MAX_POLYGONS=12;
export const POPULATION_ADMIN_MAX_VERTICES=500_000;
export const POPULATION_ADMIN_MAX_POLYGONS=100_000;
export const POPULATION_ADMIN_DISPLAY_MAX_VERTICES=20_000;
export const POPULATION_ADMIN_DISPLAY_MAX_POLYGONS=12;
export const POPULATION_MAX_AREA_KM2=50_000;
export const POPULATION_DAILY_CALL_BUDGET=600;
export const POPULATION_TIMEOUT_MS=20_000;
export const POPULATION_CACHE_TTL_SECONDS=21_600;
export const POPULATION_METHOD='cell_center_inside_polygon';
export const POPULATION_SOURCE='WorldPop Global 2';

const longitude=z.number().finite().min(-180).max(180);
const latitude=z.number().finite().min(-90).max(90);
const position=z.tuple([longitude,latitude]);
const ring=z.array(position).min(4).max(POPULATION_MAX_VERTICES+1).superRefine((points,ctx)=>{
  const first=points[0],last=points.at(-1);
  if(!first||!last||first[0]!==last[0]||first[1]!==last[1])ctx.addIssue({code:'custom',message:'Ring is not closed'});
  for(let index=1;index<points.length;index++){
    const previous=points[index-1],current=points[index];
    if(previous[0]===current[0]&&previous[1]===current[1])ctx.addIssue({code:'custom',message:'Ring contains a zero-length edge',path:[index]});
  }
});
const adminRing=z.array(position).min(4).max(POPULATION_ADMIN_MAX_VERTICES+1).superRefine((points,ctx)=>{
  const first=points[0],last=points.at(-1);
  if(!first||!last||first[0]!==last[0]||first[1]!==last[1])ctx.addIssue({code:'custom',message:'Ring is not closed'});
  for(let index=1;index<points.length;index++){
    const previous=points[index-1],current=points[index];
    if(previous[0]===current[0]&&previous[1]===current[1])ctx.addIssue({code:'custom',message:'Ring contains a zero-length edge',path:[index]});
  }
});
const polygonCoordinates=z.array(ring).min(1).max(100);
const polygonGeometry=z.object({type:z.literal('Polygon'),coordinates:polygonCoordinates}).strict();
const multiPolygonGeometry=z.object({type:z.literal('MultiPolygon'),coordinates:z.array(polygonCoordinates).min(1).max(POPULATION_MAX_POLYGONS)}).strict();
export const populationGeometrySchema=z.union([polygonGeometry,multiPolygonGeometry]).superRefine((geometry,ctx)=>{
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  const vertices=polygons.reduce((sum,poly)=>sum+poly.reduce((subtotal,line)=>subtotal+line.length,0),0);
  if(vertices>POPULATION_MAX_VERTICES)ctx.addIssue({code:'custom',message:`Geometry exceeds ${POPULATION_MAX_VERTICES} vertices`});
  if(polygons.length>POPULATION_MAX_POLYGONS)ctx.addIssue({code:'custom',message:`Geometry exceeds ${POPULATION_MAX_POLYGONS} polygons`});
});
const adminPolygonCoordinates=z.array(adminRing).min(1).max(POPULATION_ADMIN_MAX_VERTICES);
const adminPolygonGeometry=z.object({type:z.literal('Polygon'),coordinates:adminPolygonCoordinates}).strict();
const adminMultiPolygonGeometry=z.object({type:z.literal('MultiPolygon'),coordinates:z.array(adminPolygonCoordinates).min(1).max(POPULATION_ADMIN_MAX_POLYGONS)}).strict();
export const populationAdminBoundaryGeometrySchema=z.union([adminPolygonGeometry,adminMultiPolygonGeometry]).superRefine((geometry,ctx)=>{
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  const vertices=polygons.reduce((sum,poly)=>sum+poly.reduce((subtotal,line)=>subtotal+line.length,0),0);
  if(vertices>POPULATION_ADMIN_MAX_VERTICES)ctx.addIssue({code:'custom',message:`Administrative boundary exceeds ${POPULATION_ADMIN_MAX_VERTICES} vertices`});
  if(polygons.length>POPULATION_ADMIN_MAX_POLYGONS)ctx.addIssue({code:'custom',message:`Administrative boundary exceeds ${POPULATION_ADMIN_MAX_POLYGONS} polygons`});
});
export const populationAreaQuerySchema=z.object({
  geometry:populationGeometrySchema,
  countryCodes:z.array(z.string().regex(/^[A-Z]{3}$/)).max(8).refine(codes=>new Set(codes).size===codes.length,'Country codes must be unique').optional()
}).strict();
export type PopulationGeometry=z.infer<typeof populationGeometrySchema>;
export type PopulationAreaQuery=z.infer<typeof populationAreaQuerySchema>;
type PopulationPosition=z.infer<typeof position>;
type PopulationRing=PopulationPosition[];

export const populationErrorSchema=z.enum(['invalid_geometry','invalid_country','no_coverage','partial_coverage','area_limit','quota_exceeded','provider_timeout','provider_unavailable','provider_incompatible','query_failed']);
export type PopulationError=z.infer<typeof populationErrorSchema>;
const populationAvailableReplySchema=z.object({
    status:z.literal('available'),
    geometryHash:z.string().regex(/^[0-9a-f]{64}$/),
    dataVersion:z.string().regex(/^[0-9a-f]{64}$/),
    countryCodes:z.array(z.string().regex(/^[A-Z]{3}$/)).min(1).max(8),
    population:z.number().finite().nonnegative(),
    areaKm2:z.number().finite().positive(),
    year:z.literal(POPULATION_YEAR),
    edition:z.literal(`${POPULATION_RELEASE}-v1`),
    resolution:z.literal(POPULATION_RESOLUTION),
    units:z.literal('people_per_grid_cell'),
    method:z.literal(POPULATION_METHOD),
    source:z.literal(POPULATION_SOURCE),
    license:z.literal('CC-BY-4.0'),
    doi:z.literal('10.5258/SOTON/WP00839'),
    coverage:z.object({status:z.enum(['complete','partial']),validGridCells:z.number().int().positive(),intersectedGridCells:z.number().int().positive(),noDataGridCells:z.number().int().nonnegative()}).strict(),
    sourceDatasets:z.array(z.object({countryCode:z.string().regex(/^[A-Z]{3}$/),datasetId:z.string().min(1),sourceSha256:z.string().regex(/^[0-9a-f]{64}$/)}).strict()).min(1).max(8),
    processingTimeMs:z.number().int().nonnegative()
}).strict();
const populationErrorReplySchema=z.object({status:z.enum(['error','no_coverage','partial_coverage']),error:populationErrorSchema,retryAfter:z.number().int().min(1).max(86_400).optional(),unsupportedCountryCodes:z.array(z.string().regex(/^[A-Z]{3}$/)).max(8).optional()}).strict();
const populationAdminErrorReplySchema=z.object({status:z.enum(['error','no_coverage','partial_coverage']),error:z.string().min(1).max(80),retryAfter:z.number().int().min(1).max(86_400).optional(),unsupportedCountryCodes:z.array(z.string().regex(/^[A-Z]{3}$/)).max(8).optional()}).strict();
export const populationAdminBoundarySchema=z.object({
  boundaryLayerId:z.string().regex(/^[A-Z]{3}-ADM[012]-[A-Za-z0-9-]{3,80}$/),
  featureId:z.string().min(1).max(160),name:z.string().min(1).max(240),countryCode:z.string().regex(/^[A-Z]{3}$/),
  level:z.enum(['ADM0','ADM1','ADM2']),boundaryYear:z.string().min(1).max(20),license:z.string().min(1).max(240),source:z.string().min(1).max(240),
  aliases:z.array(z.string().max(240)).max(10),geometryType:z.enum(['Polygon','MultiPolygon']),geometry:populationAdminBoundaryGeometrySchema.optional(),
  geometryRole:z.literal('display_only'),geometrySimplified:z.boolean(),areaKm2:z.number().finite().positive().optional()
}).strict();
export const populationReplySchema=z.union([populationAvailableReplySchema,populationErrorReplySchema]);
export const populationAdminReplySchema=z.union([
  populationAvailableReplySchema.extend({boundary:populationAdminBoundarySchema}).strict(),
  populationAdminErrorReplySchema
]);

export function geometryVertexCount(geometry:PopulationGeometry){
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  return polygons.reduce((sum,poly)=>sum+poly.reduce((subtotal,line)=>subtotal+line.length,0),0);
}

function canonicalRing(points:PopulationRing){
  const open=points.slice(0,-1).map(([lng,lat])=>[Object.is(lng,-0)?0:lng,Object.is(lat,-0)?0:lat] as [number,number]);
  const compare=(a:[number,number],b:[number,number])=>a[0]===b[0]?a[1]-b[1]:a[0]-b[0];
  let start=0;
  for(let i=1;i<open.length;i++)if(compare(open[i],open[start])<0)start=i;
  const forward=[...open.slice(start),...open.slice(0,start)];
  const backward=[...open.slice().reverse()];
  const reverseStart=backward.findIndex(point=>point[0]===open[start][0]&&point[1]===open[start][1]);
  const reverse=[...backward.slice(reverseStart),...backward.slice(0,reverseStart)];
  const asText=(ring:[number,number][])=>JSON.stringify([...ring,ring[0]]);
  return asText(forward)<asText(reverse)?asText(forward):asText(reverse);
}

export function canonicalGeometryKey(geometry:PopulationGeometry){
  const polygons=(geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates).map(poly=>poly.map(canonicalRing).sort());
  polygons.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify(polygons);
}
