import {z} from 'zod';

export const SEARCH_LIMIT = 8;
export const SEARCH_TIMEOUT_MS = 8000;
export const SEARCH_RESPONSE_BYTES = 65536;
const text = (max:number) => z.string().min(1).max(max).refine(s => !/[\u0000-\u001f\u007f]/.test(s));
export const searchQuerySchema = z.object({
  q: text(160).transform(s => s.trim()).pipe(z.string().min(2)),
  lang: z.string().max(35).regex(/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/).default('es'),
  limit: z.coerce.number().int().min(1).max(SEARCH_LIMIT).default(SEARCH_LIMIT)
}).strict();

// Adapters must map only positively identified countries and cities to this contract.
// The same schema must validate records read from a cache before returning them.
export const placeSchema = z.object({
  id: text(160),
  kind: z.enum(['country','city']),
  name: text(200),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  countryName: text(160),
  region: text(160).optional(),
  lng: z.number().finite().min(-180).max(180),
  lat: z.number().finite().min(-90).max(90)
}).strict();
export type SearchPlace = z.infer<typeof placeSchema>;
export const searchReplySchema = z.union([
  z.object({results:z.array(placeSchema).max(SEARCH_LIMIT)}).strict(),
  z.object({
    error:z.enum(['invalid_query','provider_not_configured','quota_exceeded','provider_unavailable','provider_timeout','access_denied']),
    message:text(500),retryAfter:z.number().int().min(1).max(3600).optional()
  }).strict()
]);

export function validatedPlaces(input:unknown, limit=SEARCH_LIMIT):SearchPlace[] {
  if (!Array.isArray(input) || input.length > 100) throw new Error('Invalid provider response');
  const seen = new Set<string>(), results:SearchPlace[] = [];
  for (const candidate of input) {
    const parsed=placeSchema.safeParse(candidate);
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);results.push(parsed.data);
    if (results.length >= Math.max(1,Math.min(SEARCH_LIMIT,limit))) break;
  }
  return results;
}

export async function readSearchReply(response:Response) {
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type') ?? '')) throw new Error('Unexpected response type');
  const declared=Number(response.headers.get('Content-Length'));
  if (declared > SEARCH_RESPONSE_BYTES) throw new Error('Oversized response');
  const reader=response.body?.getReader();
  if (!reader) throw new Error('Missing response body');
  const chunks:Uint8Array[]=[];let length=0;
  try {
    for (;;) {
      const {done,value}=await reader.read();if(done)break;
      length+=value.byteLength;
      if(length>SEARCH_RESPONSE_BYTES){await reader.cancel();throw new Error('Oversized response');}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const reply=searchReplySchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  if(response.ok && !('results' in reply) || !response.ok && !('error' in reply)) throw new Error('Inconsistent response');
  return reply;
}
