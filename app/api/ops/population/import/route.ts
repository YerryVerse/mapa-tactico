import {env} from 'cloudflare:workers';
import {populationIngestResponse} from '../../../../../lib/population-ingest-service';

export async function POST(request:Request){
  if(!env.DB)return Response.json({status:'error',error:'ingest_storage_unavailable'},{status:503,headers:{'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'}});
  if(!env.BUCKET&&new URL(request.url).searchParams.get('action')!=='migrate')return Response.json({status:'error',error:'ingest_storage_unavailable'},{status:503,headers:{'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'}});
  return populationIngestResponse(request,{db:env.DB,bucket:env.BUCKET as R2Bucket,secret:env.POPULATION_INGEST_SECRET});
}
