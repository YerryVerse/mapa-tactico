import {env} from 'cloudflare:workers';
import {searchResponse} from '../../../lib/search-service';
export async function GET(request:Request){
 if(!env.DB||!env.ASSETS)return Response.json({error:'provider_unavailable',message:'No se pudo consultar el catálogo. Vuelve a buscar o elige una ubicación en el mapa.'},{status:503,headers:{'Cache-Control':'no-store'}});
 return searchResponse(request,{db:env.DB,assetFetch:r=>env.ASSETS.fetch(r),cache:await caches.open('atlas-search')});
}
