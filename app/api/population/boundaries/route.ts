import {searchAdministrativeBoundaries} from '../../../../lib/population-boundary-service';

export async function GET(request:Request){
  return searchAdministrativeBoundaries(request,{cache:await caches.open('atlas-population-boundaries')});
}
