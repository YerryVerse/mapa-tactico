import {env} from 'cloudflare:workers';
import {populationAdminResponse} from '../../../../lib/population-boundary-service';

export async function POST(request:Request){
  if(!env.DB)return Response.json({status:'error',error:'provider_unavailable'},{status:503,headers:{'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'}});
  return populationAdminResponse(request,{db:env.DB,cache:await caches.open('atlas-population-boundaries')});
}
