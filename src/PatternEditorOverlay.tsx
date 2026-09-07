import React, { useEffect, useState } from 'react'
import type { PatternRegion } from './naturalPatterns'
type P={x:number;y:number}
type Props={regions:PatternRegion[];setRegions:React.Dispatch<React.SetStateAction<PatternRegion[]>>;selectedRegion:number;drawing:boolean;setDrawing:React.Dispatch<React.SetStateAction<boolean>>;draft:P[];setDraft:React.Dispatch<React.SetStateAction<P[]>>;structure:number}
export function PatternEditorOverlay({regions,setRegions,selectedRegion,drawing,setDrawing,draft,setDraft,structure}:Props){
 const [dragIndex,setDragIndex]=useState<number|null>(null)
 const [hover,setHover]=useState<P|null>(null)
 const region=regions.find(r=>r.id===selectedRegion)
 useEffect(()=>{if(drawing&&!region){setDraft([]);setDrawing(false)}},[drawing,region,setDraft,setDrawing])
 useEffect(()=>{if(!drawing)return;const key=(event:KeyboardEvent)=>{if(event.key==='Backspace'){event.preventDefault();setDraft(points=>points.slice(0,-1))}if(event.key==='Escape'){setRegions(all=>all.filter(r=>r.id!==selectedRegion));setDraft([]);setHover(null);setDrawing(false)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[drawing,selectedRegion,setDraft,setDrawing,setRegions])
 if(!region)return null
 const add=(e:React.PointerEvent<SVGSVGElement>)=>{if(!drawing)return;const box=e.currentTarget.getBoundingClientRect(),p={x:(e.clientX-box.left)/box.width,y:(e.clientY-box.top)/box.height};setDraft(a=>[...a,p])}
 const bounds=(polygon:P[])=>{const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}
 const savePolygon=(polygon:P[])=>setRegions(all=>all.map(r=>r.id===selectedRegion?{...r,polygon,...bounds(polygon)}:r))
 const finish=(e:React.PointerEvent)=>{e.stopPropagation();if(draft.length<3)return;savePolygon(draft);setHover(null);setDrawing(false);setDraft([])}
 const move=(e:React.PointerEvent<SVGSVGElement>)=>{const box=e.currentTarget.getBoundingClientRect(),point={x:Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))};if(drawing){setHover(point);return}if(dragIndex!==null&&region)savePolygon(region.polygon.map((p,i)=>i===dragIndex?point:p))}
 const points=drawing?draft:region.polygon
 const last=points.length>0?points[points.length-1]:null,prev=points.length>1?points[points.length-2]:null
 const check=last&&prev?{x:last.x+(prev.x-last.x)*.08,y:last.y+(prev.y-last.y)*.08}:null
 return <svg className={`pattern-editor-overlay ${drawing?"is-drawing":"is-editing"}`} style={{opacity:structure}} viewBox="0 0 1 1" preserveAspectRatio="none" onPointerDown={add} onPointerMoveCapture={move} onPointerLeave={()=>setHover(null)} onPointerUp={()=>setDragIndex(null)} onPointerCancel={()=>setDragIndex(null)} aria-label="Polygon patrooneditor">
  {points.length>1&&drawing&&<polyline className="pattern-draft-line" points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none"/>}
  {drawing&&last&&hover&&<line className="pattern-preview-line" x1={last.x} y1={last.y} x2={hover.x} y2={hover.y}/>} 
  {drawing&&hover&&<circle className="pattern-preview-point" cx={hover.x} cy={hover.y} r=".0055"/>}
  {points.length>2&&!drawing&&<polygon className="pattern-finished-area" points={points.map(p=>`${p.x},${p.y}`).join(' ')}/>} 
  {points.map((p,i)=><circle className="pattern-point" key={i} cx={p.x} cy={p.y} r=".0055" onPointerDown={e=>{if(drawing)return;e.stopPropagation();setDragIndex(i);e.currentTarget.setPointerCapture(e.pointerId)}}/>)}
  {check&&drawing&&draft.length>=3&&<g className="pattern-check" transform={`translate(${check.x} ${check.y})`} onPointerDown={finish}><circle r=".0095"/><path d="M-.0045 0l.003 .003L.005-.0045"/></g>}
 </svg>
}
