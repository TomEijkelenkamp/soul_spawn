import { useEffect, useRef, useState } from 'react'
import { designFilename } from './saveFile'
export default function SaveDialog({name,busy,error,onCancel,onSave}:{name:string;busy:boolean;error:string;onCancel:()=>void;onSave:(name:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[filename,setFilename]=useState(name)
 useEffect(()=>{dialog.current?.showModal()},[])
 return <dialog className="save-dialog" ref={dialog} aria-labelledby="save-title" onCancel={e=>{if(busy)e.preventDefault();else onCancel()}}><form onSubmit={event=>{event.preventDefault();onSave(designFilename(filename))}}><h2 id="save-title">Ontwerp opslaan</h2><p>Je ontwerp wordt bewaard in <strong>public/saves</strong> van dit project.</p><label>Bestandsnaam<input value={filename} onChange={e=>setFilename(e.target.value)} required maxLength={150} disabled={busy}/></label><p>Bestaat de naam al? Dan voegen we een volgnummer toe.</p>{error&&<p role="alert">{error}</p>}<div><button type="button" disabled={busy} onClick={onCancel}>Annuleren</button><button type="submit" disabled={busy}>{busy?'Opslaan…':'Opslaan'}</button></div></form></dialog>
}
