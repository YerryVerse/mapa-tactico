import {z} from 'zod';

const boundaryCandidateSchema=z.object({
  boundaryLayerId:z.string().regex(/^[A-Z]{3}-ADM[012]-[A-Za-z0-9-]{3,80}$/),
  featureId:z.string().min(1).max(160),name:z.string().min(1).max(240),countryCode:z.string().regex(/^[A-Z]{3}$/),
  level:z.enum(['ADM0','ADM2']),boundaryYear:z.string().min(1).max(20),license:z.string().min(1).max(240),source:z.string().min(1).max(240),
  aliases:z.array(z.string().max(240)).max(10),geometryType:z.enum(['Polygon','MultiPolygon']),areaKm2:z.number().finite().positive().optional(),geometrySimplified:z.boolean().optional()
}).strict();

export const populationBoundarySearchReplySchema=z.union([
  z.object({status:z.enum(['available','no_match']),provider:z.literal('geoBoundaries'),releaseType:z.literal('gbOpen'),results:z.array(boundaryCandidateSchema).max(8)}).strict(),
  z.object({status:z.enum(['error','no_coverage']),error:z.string().min(1).max(80)}).strict()
]);

export type PopulationBoundaryCandidate=z.infer<typeof boundaryCandidateSchema>;
