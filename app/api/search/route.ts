import {z} from 'zod';
const querySchema=z.string().trim().min(2).max(160).refine(s=>!/[\u0000-\u001f\u007f]/.test(s));
export async function GET(request:Request){
 const url=new URL(request.url);const parsed=querySchema.safeParse(url.searchParams.get('q'));
 const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
 if(!parsed.success)return Response.json({error:'invalid_query',message:'Escribe entre 2 y 160 caracteres, sin caracteres de control.'},{status:400,headers});
 // No upstream calls until a production provider and its quota policy are approved/configured.
 return Response.json({error:'provider_not_configured',message:'El buscador está pendiente de configurar su proveedor. Puedes elegir una ubicación en el mapa o introducir coordenadas.'},{status:503,headers});
}
