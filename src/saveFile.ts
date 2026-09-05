export function designFilename(name:string){const clean=Array.from(name.trim(),c=>c.charCodeAt(0)<32?'-':c).join('').replace(/[<>:"/\\|?*]/g,'-').replace(/[. ]+$/g,'')||'Soulspawn';return /\.json$/i.test(clean)?clean:clean+'.json'}
export async function saveToProject(content:string,name:string){
 const response=await fetch('/api/soulspawn/save',{method:'POST',headers:{'Content-Type':'application/json','X-Soulspawn-Save':'1'},body:JSON.stringify({name:designFilename(name),content})})
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Start de lokale Soulspawn-server om in public/saves op te slaan.')
 const result=await response.json() as {name?:string;path?:string;error?:string}
 if(!response.ok)throw new Error(result.error||'Opslaan is niet gelukt.')
 if(!result.name||!result.path)throw new Error('De server heeft het opslaan niet bevestigd.')
 return{name:result.name,path:result.path}
}
