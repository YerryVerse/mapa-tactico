import {searchQuerySchema} from '../../../lib/search-contract';
export async function GET(request:Request){
 const url=new URL(request.url);const parsed=searchQuerySchema.safeParse({q:url.searchParams.get('q'),lang:url.searchParams.get('lang')??undefined,limit:url.searchParams.get('limit')??undefined});
 const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
 if(!parsed.success)return Response.json({error:'invalid_query',message:'Escribe un país o ciudad entre 2 y 160 caracteres, sin caracteres de control.'},{status:400,headers});
 // No upstream calls until a production provider and its quota policy are approved/configured.
 return Response.json({error:'provider_not_configured',message:'El buscador está pendiente de configurar su proveedor. Puedes elegir una ubicación en el mapa o introducir coordenadas.'},{status:503,headers});
}
