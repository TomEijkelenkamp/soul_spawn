import { mkdir, open } from 'node:fs/promises'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { parseDesign } from './src/projectFile.ts'

export function projectSaves():Plugin {
 let root=''
 const middleware=async(req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
  if(req.url?.split('?')[0]!=='/api/soulspawn/save'){next();return}
  const reply=(status:number,data:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data))}
  if(req.method!=='POST'){reply(405,{error:'Gebruik Save om een ontwerp op te slaan.'});return}
  // Only this local app may write; reject cross-origin form submissions.
  let origin:URL;try{origin=new URL(req.headers.origin??'')}catch{reply(403,{error:'Opslaan is alleen beschikbaar vanuit de lokale app.'});return}
  if(!['localhost','127.0.0.1','[::1]'].includes(origin.hostname)||origin.host!==req.headers.host||req.headers['x-soulspawn-save']!=='1'||!req.headers['content-type']?.startsWith('application/json')){reply(403,{error:'Opslaan is alleen beschikbaar vanuit de lokale app.'});return}
  try{
   let length=0;const chunks:Buffer[]=[]
   for await(const chunk of req){const data=Buffer.from(chunk);length+=data.length;if(length>2_200_000){reply(413,{error:'Dit ontwerpbestand is te groot.'});return}chunks.push(data)}
   const payload=JSON.parse(Buffer.concat(chunks).toString('utf8')) as {name?:unknown;content?:unknown}
   if(!payload||typeof payload.name!=='string'||typeof payload.content!=='string'){reply(400,{error:'Ongeldig ontwerpbestand.'});return}
   const name=payload.name.trim()
   if(name.length>160||!name.endsWith('.json')||/[<>:"/\\|?*]/.test(name)||Array.from(name).some(c=>c.charCodeAt(0)<32)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name)||name==='.json'||name.endsWith(' .json')){reply(400,{error:'Kies een geldige bestandsnaam, zonder map of speciale tekens.'});return}
   try{parseDesign(payload.content)}catch{reply(400,{error:'Dit bestand bevat geen geldig Soulspawn-ontwerp.'});return}
   const directory=join(root,'public','saves');await mkdir(directory,{recursive:true})
   for(let index=1;index<=1000;index++){
    const filename=index===1?name:`${name.slice(0,-5)} (${index}).json`
    let file;try{file=await open(join(directory,filename),'wx')}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')continue;throw error}
    try{await file.writeFile(payload.content,'utf8')}finally{await file.close()}
    reply(201,{name:filename,path:`public/saves/${filename}`});return
   }
   reply(409,{error:'Deze naam is te vaak gebruikt. Kies een andere naam.'})
  }catch{reply(500,{error:'Opslaan is niet gelukt. Controleer de naam en schrijfrechten van public/saves.'})}
 }
 return{name:'soulspawn-project-saves',configResolved(config){root=config.root},configureServer(server){server.middlewares.use((req,res,next)=>{void middleware(req,res,next)})},configurePreviewServer(server){server.middlewares.use((req,res,next)=>{void middleware(req,res,next)})}}
}
