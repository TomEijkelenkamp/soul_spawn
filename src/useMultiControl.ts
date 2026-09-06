import { createContext, useContext, useId, useLayoutEffect } from 'react'
type SliderControl={kind:'slider';value:number;min:number;max:number;step:number;change:(value:number)=>void}
type ColorControl={kind:'color';value:string;change:(value:string)=>void}
export type Control=SliderControl|ColorControl
export type Group={selected:Set<string>;register:(id:string,control:Control)=>()=>void;toggle:(id:string)=>void;clear:()=>void;begin:()=>void;slider:(id:string,value:number)=>void;color:(id:string,value:string)=>void}
export const Context=createContext<Group|null>(null)
export function relativeValue(base:number,delta:number,min:number,max:number,step:number){return Math.max(min,Math.min(max,Number((min+Math.round((base+delta*(max-min)-min)/step)*step).toFixed(8))))}
export function useMultiControl(control:Control){const group=useContext(Context)!,id=useId()
 useLayoutEffect(()=>group.register(id,control),[group,id,control])
 return {selected:group.selected.has(id),slider:(value:number)=>group.slider(id,value),color:(value:string)=>group.color(id,value),events:{
  'data-multi-control':id,
  onPointerDownCapture:(event:React.PointerEvent)=>{if(event.ctrlKey||event.metaKey){event.preventDefault();event.stopPropagation();group.toggle(id)}else if(control.kind==='slider')group.begin()},
  onClickCapture:(event:React.MouseEvent)=>{if(event.ctrlKey||event.metaKey){event.preventDefault();event.stopPropagation()}},
  onKeyDownCapture:(event:React.KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.code==='Space'){event.preventDefault();event.stopPropagation();group.toggle(id)}}
 }}
}
