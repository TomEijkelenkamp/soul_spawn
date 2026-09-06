import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ReactNode, MutableRefObject } from 'react'
import type { SavedView } from './projectFile'

const WIDTH=1100, HEIGHT=900
export default function Viewport({children,initialView,viewCapture,instruction,structure,onStructureChange}:{children:ReactNode;structure:number;onStructureChange:(value:number)=>void;instruction?:string;initialView?:SavedView;viewCapture:MutableRefObject<(()=>SavedView)|null>}){
 const viewport=useRef<HTMLDivElement>(null),extent=useRef<HTMLDivElement>(null),scene=useRef<HTMLDivElement>(null),scale=useRef(1),[zoom,setZoom]=useState(1)
 useImperativeHandle(viewCapture,()=>()=>({zoom:scale.current,centerX:viewport.current!.scrollLeft/scale.current,centerY:viewport.current!.scrollTop/scale.current}),[])
 useEffect(()=>{
  const el=viewport.current!,space=extent.current!,content=scene.current!
  const layout=()=>{space.style.width=`${WIDTH*scale.current+el.clientWidth}px`;space.style.height=`${HEIGHT*scale.current+el.clientHeight}px`;content.style.left=`${el.clientWidth/2}px`;content.style.top=`${el.clientHeight/2}px`;content.style.transform=`scale(${scale.current})`}
  const changeZoom=(next:number,x:number,y:number)=>{const previous=scale.current,worldX=(el.scrollLeft+x-el.clientWidth/2)/previous,worldY=(el.scrollTop+y-el.clientHeight/2)/previous;scale.current=Math.max(.25,Math.min(4,next));layout();el.scrollLeft=el.clientWidth/2+worldX*scale.current-x;el.scrollTop=el.clientHeight/2+worldY*scale.current-y;setZoom(scale.current)}
  const wheel=(event:WheelEvent)=>{
   if(event.ctrlKey){event.preventDefault();const rect=el.getBoundingClientRect(),delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?el.clientHeight:1);changeZoom(scale.current*Math.exp(-delta*.002),event.clientX-rect.left,event.clientY-rect.top)}
   else if(event.shiftKey&&event.deltaX===0){event.preventDefault();el.scrollLeft+=event.deltaY*(event.deltaMode===1?16:1)}
  }
  const reset=()=>{scale.current=1;layout();el.scrollLeft=WIDTH/2;el.scrollTop=HEIGHT/2;setZoom(1)}
  const resize=new ResizeObserver(layout);resize.observe(el);reset();if(initialView){scale.current=initialView.zoom;layout();el.scrollLeft=initialView.centerX*scale.current;el.scrollTop=initialView.centerY*scale.current;setZoom(scale.current)}el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('reset-view',reset)
  return()=>{resize.disconnect();el.removeEventListener('wheel',wheel);el.removeEventListener('reset-view',reset)}
 },[initialView,viewCapture])
 return <div className="viewport-shell"><div ref={viewport} className="scene-viewport" aria-label="Creature viewport" tabIndex={0}><div ref={extent} className="scene-extent"><div ref={scene} className="scene-content" style={{width:WIDTH,height:HEIGHT}}>{children}</div></div></div>{instruction&&<div className="viewport-instruction" role="status">{instruction}</div>}<div className="view-toolbar"><label className="control-visibility">Control points<input aria-label="Control points visibility" type="range" min="0" max="1" step=".01" value={structure} onChange={e=>onStructureChange(+e.target.value)}/><output>{Math.round(structure*100)}%</output></label><span>Ctrl + scroll: zoom · Shift + scroll: pan</span><button onClick={()=>viewport.current?.dispatchEvent(new Event('reset-view'))} title="Reset zoom and position">{Math.round(zoom*100)}% · Reset view</button><button onClick={()=>viewport.current?.querySelector<HTMLButtonElement>('.export-pattern')?.click()}>↓ Export pattern SVG</button></div></div>
}
