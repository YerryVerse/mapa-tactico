import {env} from 'cloudflare:workers';
import {searchAdministrativeBoundaries} from '../../../../lib/population-boundary-service';

export async function GET(request:Request){
  return searchAdministrativeBoundaries(request,{bucket:env.BUCKET,cache:await caches.open('atlas-population-boundaries')});
}
