import {z} from 'zod';
export const categories=['Accidente','Militar','Natural'] as const;
const sourceSchema=z.object({title:z.string().min(1).max(250),url:z.string().url().refine(s=>new URL(s).protocol==='https:')}).strict();
export const contextSchema=z.object({
 id:z.string().regex(/^[a-z0-9-]+$/),eventId:z.string().regex(/^[a-z0-9-]+$/),version:z.string().min(1).max(80),category:z.enum(categories),
 title:z.string().min(1).max(200),description:z.string().min(1).max(4000),sources:z.array(sourceSchema).min(1).max(10),
 capabilities:z.array(z.literal('context')).min(1).max(1),dependencies:z.array(z.enum(['entry','area'])).min(1).max(2),
 location:z.object({label:z.string().min(1).max(200),lng:z.number().finite().min(-180).max(180),lat:z.number().finite().min(-90).max(90),source:sourceSchema}).strict().optional()
}).strict();
export type ContextEntry=z.infer<typeof contextSchema>;
export type PortalState='exploration'|'search'|'location'|'menu'|'population'|'configuration'|'execution'|'result'|'information'|'disclaimer';
export function readCatalogue(input:unknown){const entries=z.array(contextSchema).min(1).max(200).parse(input);if(new Set(entries.map(e=>e.id)).size!==entries.length)throw new Error('Duplicate entry id');return entries;}
export function resultSignature(entry:ContextEntry,inputs:{areaSignature?:string;locale?:string;point?:unknown;camera?:unknown}={}){
 if(entry.dependencies.includes('area')&&!inputs.areaSignature)throw new Error('Area required');
 return JSON.stringify({id:entry.id,version:entry.version,...(entry.dependencies.includes('area')?{area:inputs.areaSignature}:{})});
}
