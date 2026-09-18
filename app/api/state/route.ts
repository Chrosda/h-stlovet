import {state} from '@/lib/server';
export async function GET(req:Request){try{return Response.json(await state(req,new URL(req.url).searchParams.get('child')==='1'),{headers:{'Cache-Control':'no-store'}})}catch(e){return Response.json({error:e instanceof Error?e.message:'Kunde inte läsa data'},{status:401,headers:{'Cache-Control':'no-store'}})}}
