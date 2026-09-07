import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Context, relativeValue } from './useMultiControl'
import type { Control, ControlRef, Group } from './useMultiControl'
export function MultiSelect({children}:{children:ReactNode}){
 const [selected,setSelected]=useState(new Set<string>()),selection=useRef(selected),controls=useRef(new Map<string,ControlRef>()),baseline=useRef<Map<string,Control>|null>(null)
 const clear=useCallback(()=>{selection.current=new Set();setSelected(selection.current);baseline.current=null},[])
 useEffect(() => {
  const outside = (event: PointerEvent) => {
   if (!selection.current.size) return
   const target = event.target instanceof Element ? event.target : null
   const control = target?.closest('[data-multi-control]')
   const id = control?.getAttribute('data-multi-control')
   // Preserve selected controls (including their colour picker) and additive selection.
   if (id && controls.current.has(id) && (selection.current.has(id) || event.ctrlKey || event.metaKey)) return
   if (target?.closest('[data-selection-controls]')) return
   selection.current = new Set()
   setSelected(selection.current)
   baseline.current = null
  }
  document.addEventListener('pointerdown', outside, true)
  return () => document.removeEventListener('pointerdown', outside, true)
 }, [])
 useEffect(()=>{const end=()=>{baseline.current=null},escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){selection.current=new Set();setSelected(selection.current);baseline.current=null}};window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);window.addEventListener('keydown',escape);window.addEventListener('blur',end);return()=>{window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);window.removeEventListener('keydown',escape);window.removeEventListener('blur',end)}},[])
 const register=useCallback((id:string,control:ControlRef)=>{controls.current.set(id,control);return()=>{controls.current.delete(id)}},[])
 const toggle=useCallback((id:string)=>{const next=new Set(selection.current);if(next.has(id))next.delete(id);else next.add(id);selection.current=next;setSelected(next);baseline.current=null},[])
 const begin=useCallback(()=>{baseline.current=new Map(Array.from(controls.current,([id,control])=>[id,control.current]))},[])
 const slider=useCallback((id:string,value:number)=>{const active=controls.current.get(id)?.current;if(active?.kind!=='slider')return
   if(!selection.current.has(id)){clear();active.change(value);return}
   const start=baseline.current??new Map(Array.from(controls.current,([key,control])=>[key,control.current])),source=start.get(id);if(source?.kind!=='slider')return
   const delta=(value-source.value)/(source.max-source.min)
   for(const target of selection.current){const current=controls.current.get(target)?.current,base=start.get(target);if(current?.kind==='slider'&&base?.kind==='slider')current.change(target===id?value:relativeValue(base.value,delta,current.min,current.max,current.step))}
  },[clear])
 const color=useCallback((id:string,value:string)=>{const active=controls.current.get(id)?.current;if(active?.kind!=='color')return;if(!selection.current.has(id)){clear();active.change(value);return}for(const target of selection.current){const control=controls.current.get(target)?.current;if(control?.kind==='color')control.change(value)}},[clear])
 const group:Group=useMemo(()=>({selected,clear,register,toggle,begin,slider,color}),[selected,clear,register,toggle,begin,slider,color])
 return <Context.Provider value={group}>{children}</Context.Provider>
}
export function SelectionBar(){const group=useContext(Context)!;return <div className="selection-bar" data-selection-controls><span role="status">{group.selected.size?`${group.selected.size} geselecteerd · samen aanpassen`:'Ctrl + klik: meerdere velden selecteren'}</span>{group.selected.size>0&&<button type="button" onClick={group.clear}>Selectie wissen</button>}</div>}
