import { useEffect, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Point, SavedParticle } from './projectFile'
import type { Cut } from './cuts'
import { cutBoundary, baseLayout, withCuts, patternEnvelope } from './cuts'

import { extendCut, limitCutChange } from './cutConstraints'

export type CutEditorState={drawing:boolean;draft:Cut|null;selected:number|null}
type Props={cuts:Cut[];setCuts:Dispatch<SetStateAction<Cut[]>>;editor:CutEditorState;setEditor:Dispatch<SetStateAction<CutEditorState>>}
type GeometryProps={points:Point[];bodyCapture:MutableRefObject<(()=>SavedParticle[])|null>}
function spaceFor(cuts:Cut[],points:Point[],bodyCapture:GeometryProps['bodyCapture']){
 const w=1100,h=900,body=bodyCapture.current?.(),g=withCuts(baseLayout(points,w,h),cuts,w,h)
 const outline=body&&body.length===g.counts.reduce((a,b)=>a+b,0)?patternEnvelope(body,g).body:points
 return{cuts,outline,corners:points.map(p=>({x:p.x*w,y:p.y*h})),w,h}
}
export function CutSettings({cuts,setCuts,editor,setEditor,points,bodyCapture}:Props&GeometryProps){
 const active=cuts.find(c=>c.id===editor.selected)
 const finish=()=>{if(!editor.draft||editor.draft.path.length<2)return;setCuts(all=>[...all,editor.draft!]);setEditor({drawing:false,draft:null,selected:editor.draft.id})}
 return <div className="cut-settings">
  <button className="randomize" type="button" disabled={cuts.length>=16} aria-pressed={editor.drawing} onClick={()=>setEditor({drawing:!editor.drawing,draft:null,selected:null})}>{editor.drawing?'Cancel drawing':'＋ Draw cut'}</button>
  {editor.drawing&&<><p className="cut-help" role="status">{editor.draft?'Aim for depth or a bend. The preview stops at obstacles. Click to place; Enter to finish.':'Click the outline to start your cut.'}</p><button className="randomize" type="button" disabled={!editor.draft||editor.draft.path.length<2} onClick={finish}>Done</button></>}
  {cuts.length>0&&<label className="cut-field">Cut<select aria-label="Selected cut" value={editor.selected??''} onChange={e=>setEditor({drawing:false,draft:null,selected:e.target.value?+e.target.value:null})}><option value="">Select a cut</option>{cuts.map((c,i)=><option key={c.id} value={c.id}>Cut {i+1}</option>)}</select></label>}
  {active&&<><label className="cut-field">Width <output>{Number(active.width.toFixed(1))}px</output><input aria-label="Cut width" type="range" min="2" max="80" value={active.width} onChange={e=>{const width=+e.target.value;setCuts(all=>all.map(c=>c.id===active.id?limitCutChange(c,{...c,width},spaceFor(all,points,bodyCapture)):c))}}/></label><label className="cut-field">Rounding <output>{Math.round(active.rounding*100)}%</output><input aria-label="Cut rounding" type="range" min="0" max="1" step=".05" value={active.rounding} onChange={e=>{const rounding=+e.target.value;setCuts(all=>all.map(c=>c.id===active.id?limitCutChange(c,{...c,rounding},spaceFor(all,points,bodyCapture)):c))}}/></label><p className="cut-help">Drag the start along the edge. Drag the other points to change depth and bends.</p><button type="button" className="randomize" onClick={()=>{setCuts(all=>all.filter(c=>c.id!==active.id));setEditor({drawing:false,draft:null,selected:null})}}>Remove cut</button></>}
 </div>
}

export function CutOverlay({cuts,setCuts,editor,setEditor,points,bodyCapture,structure}:Props&{structure:number;points:Point[];bodyCapture:MutableRefObject<(()=>SavedParticle[])|null>}){
 const [hover,setHover]=useState<Point|null>(null),[drag,setDrag]=useState<number|null>(null)
 const w=1100,h=900,corners=points.map(p=>({x:p.x*w,y:p.y*h})),active=cuts.find(c=>c.id===editor.selected)
 const position=(e:React.PointerEvent<SVGElement>)=>{const r=e.currentTarget.ownerSVGElement?.getBoundingClientRect()??e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
 const previewRef=useRef<{key:string;target:Point;point:Point|null}|null>(null)
 const boundedPreview=(p:Point)=>{
  const draft=editor.draft;if(!draft||draft.path.length>=16)return null
  const key=JSON.stringify(draft),cached=previewRef.current
  if(cached?.key===key&&Math.hypot((p.x-cached.target.x)*w,(p.y-cached.target.y)*h)<.01)return cached.point
  const point=extendCut(draft,p,spaceFor(cuts,points,bodyCapture));previewRef.current={key,target:p,point};return point
 }
 const movePoint=(cut:Cut,index:number,p:Point)=>{
  const hit=index===0?snap(p,true):null,next={...cut,side:hit?.side??cut.side,t:hit?.t??cut.t,path:cut.path.map((q,i)=>i===index?hit?.point??p:q)}
  const bounded=limitCutChange(cut,next,spaceFor(cuts,points,bodyCapture));setCuts(all=>all.map(c=>c.id===cut.id?bounded:c))
 }
 const snap=(p:Point,moving=false)=>{
  const body=bodyCapture.current?.()??points,g=withCuts(baseLayout(points,w,h),cuts,w,h),eligible=g.counts.flatMap((n,i)=>Array(n).fill(g.outer?.[i]??true));let best={point:points[0],distance:Infinity,side:0,t:0}
  for(let i=0;i<body.length;i++){
   if(!eligible[i])continue
   const a=body[i],b=body[(i+1)%body.length],dx=(b.x-a.x)*w,dy=(b.y-a.y)*h,t=Math.max(0,Math.min(1,((p.x-a.x)*w*dx+(p.y-a.y)*h*dy)/(dx*dx+dy*dy||1))),point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},distance=Math.hypot((p.x-point.x)*w,(p.y-point.y)*h)
   // Existing cuts are edited through their handles, rather than starting another cut on their walls.
   if(!moving&&cuts.some(c=>Math.hypot((c.path[0].x-point.x)*w,(c.path[0].y-point.y)*h)<c.width/2+16))continue
   if(distance<best.distance){let side=0,projection=0,nearest=Infinity;for(let j=0;j<4;j++){const a=points[j],b=points[(j+1)%4],dx=(b.x-a.x)*w,dy=(b.y-a.y)*h,u=Math.max(.02,Math.min(.98,((point.x-a.x)*w*dx+(point.y-a.y)*h*dy)/(dx*dx+dy*dy||1))),d=Math.hypot((point.x-a.x)*w-dx*u,(point.y-a.y)*h-dy*u);if(d<nearest){nearest=d;side=j;projection=u}}best={point,distance,side,t:projection}}
  }
  return best
 }
 useEffect(()=>{
  if(!editor.drawing)return
  const key=(event:KeyboardEvent)=>{
   if(event.target instanceof HTMLElement&&event.target.matches('input,select,textarea'))return
   if(event.key==='Escape'){event.preventDefault();setEditor({drawing:false,draft:null,selected:null});setHover(null)}
   if(event.key==='Backspace'){event.preventDefault();setEditor(s=>({...s,draft:s.draft&&s.draft.path.length>1?{...s.draft,path:s.draft.path.slice(0,-1)}:null}));setHover(null)}
   if(event.key==='Enter'&&editor.draft&&editor.draft.path.length>=2){event.preventDefault();setCuts(all=>[...all,editor.draft!]);setEditor({drawing:false,draft:null,selected:editor.draft.id});setHover(null)}
  }
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
 },[editor,setCuts,setEditor])
 const draft=editor.draft,preview=draft?{...draft,path:hover?[...draft.path,hover]:draft.path}:null
 const outline=preview&&preview.path.length>1?cutBoundary(preview,w,h,corners):[]
 return <><svg className="cut-overlay" viewBox="0 0 1100 900" aria-label="Cut editor" style={{pointerEvents:editor.drawing?'auto':'none'}} onPointerMove={e=>{
  const p=position(e)
  if(drag!==null&&active){movePoint(active,drag,p);return}
  if(editor.drawing){if(draft)setHover(boundedPreview(p));else{const hit=snap(p);setHover(hit.distance<24?hit.point:null)}}
 }} onPointerLeave={()=>{if(drag===null)setHover(null)}} onPointerDown={e=>{
  if(!editor.drawing)return;e.preventDefault();e.stopPropagation();const p=position(e)
  if(!draft){const hit=snap(p);if(hit.distance>24)return;setEditor(s=>({...s,draft:{id:Math.max(0,...cuts.map(c=>c.id))+1,side:hit.side,t:hit.t,path:[hit.point],width:12,rounding:.5}}));setHover(null)}
  else {const bounded=boundedPreview(p);if(bounded){setEditor(s=>({...s,draft:s.draft?{...s.draft,path:[...s.draft.path,bounded]}:null}));setHover(null);previewRef.current=null}}
 }} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)} onLostPointerCapture={()=>setDrag(null)}>
  {outline.length>0&&<polygon aria-label="Cut preview" points={outline.map(p=>p.x+','+p.y).join(' ')} fill="#b5ffda22" stroke="#b5ffda" strokeWidth="1.5" strokeDasharray="5 4"/>}
  {draft&&hover&&<circle aria-label="Preview endpoint" cx={hover.x*w} cy={hover.y*h} r="5" fill="#b5ffda"/>}
  {!draft&&editor.drawing&&hover&&<circle cx={hover.x*w} cy={hover.y*h} r="7" fill="#b5ffda"/>}
  {(draft?[draft]:active&&structure>.005?[active]:[]).map(c=><g key={c.id} opacity={structure}><polyline points={c.path.map(p=>p.x*w+','+p.y*h).join(' ')} fill="none" stroke="#b5ffda" strokeWidth="1.5" strokeDasharray="4 4"/>{c.path.map((p,i)=><circle key={i} cx={p.x*w} cy={p.y*h} r="7" fill={i===0?'#b5ffda':'#0b1518'} stroke="#b5ffda" strokeWidth="2" style={{pointerEvents:editor.drawing?'none':'auto',cursor:'move'}} tabIndex={editor.drawing?undefined:0} role="button" aria-label={i===0?'Cut start':i===c.path.length-1?'Cut end':'Cut bend '+i} onPointerDown={e=>{if(editor.drawing)return;e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);setDrag(i)}} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const next={x:Math.max(0,Math.min(1,p.x+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)*.003)),y:Math.max(0,Math.min(1,p.y+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)*.003))};movePoint(c,i,next)}}/>)}</g>)}
 </svg></>
}
