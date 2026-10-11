import {env} from 'cloudflare:workers';
import {searchResponse} from '../../../lib/search-service';
import {matchLanguage} from '../../../lib/languages';
import {message} from '../../../lib/messages';
export async function GET(request:Request){
 if(!env.DB||!env.ASSETS)return Response.json({error:'provider_unavailable',message:message(matchLanguage(new URL(request.url).searchParams.get('lang')??'es')??'es','searchUnavailable')},{status:503,headers:{'Cache-Control':'no-store'}});
 return searchResponse(request,{db:env.DB,assetFetch:r=>env.ASSETS.fetch(r),cache:await caches.open('atlas-search')});
}
