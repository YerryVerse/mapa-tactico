import {env} from 'cloudflare:workers';
import {populationAreaResponse} from '../../../../lib/population-service';

export async function POST(request:Request){
  if(!env.DB)return Response.json({status:'error',error:'provider_unavailable'},{status:503,headers:{'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'}});
  return populationAreaResponse(request,{db:env.DB,cache:await caches.open('atlas-population')});
}
