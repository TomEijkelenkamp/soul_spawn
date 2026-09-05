import { useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Context, relativeValue } from './useMultiControl'
import type { Control, Group } from './useMultiControl'
export function MultiSelect({children}:{children:ReactNode}){
 const [selected,setSelected]=useState(new Set<string>()),selection=useRef(selected),controls=useRef(new Map<string,Control>()),baseline=useRef<Map<string,Control>|null>(null)
 const clear=()=>{selection.current=new Set();setSelected(selection.current);baseline.current=null}
 useEffect(()=>{const end=()=>{baseline.current=null},escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){selection.current=new Set();setSelected(selection.current);baseline.current=null}};window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);window.addEventListener('keydown',escape);window.addEventListener('blur',end);return()=>{window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);window.removeEventListener('keydown',escape);window.removeEventListener('blur',end)}},[])
 const group:Group={selected,clear,
  register(id,control){controls.current.set(id,control);return()=>{controls.current.delete(id)}},
  toggle(id){const next=new Set(selection.current);if(next.has(id))next.delete(id);else next.add(id);selection.current=next;setSelected(next);baseline.current=null},
  begin(){baseline.current=new Map(controls.current)},
  slider(id,value){const active=controls.current.get(id);if(active?.kind!=='slider')return
   if(!selection.current.has(id)){clear();active.change(value);return}
   const start=baseline.current??controls.current,source=start.get(id);if(source?.kind!=='slider')return
   const delta=(value-source.value)/(source.max-source.min)
   for(const target of selection.current){const current=controls.current.get(target),base=start.get(target);if(current?.kind==='slider'&&base?.kind==='slider')current.change(target===id?value:relativeValue(base.value,delta,current.min,current.max,current.step))}
  },
  color(id,value){const active=controls.current.get(id);if(active?.kind!=='color')return;if(!selection.current.has(id)){clear();active.change(value);return}for(const target of selection.current){const control=controls.current.get(target);if(control?.kind==='color')control.change(value)}}
 }
 return <Context.Provider value={group}>{children}</Context.Provider>
}
export function SelectionBar(){const group=useContext(Context)!;return <div className="selection-bar"><span>{group.selected.size?`${group.selected.size} geselecteerd · samen aanpassen`:'Ctrl + klik: meerdere velden selecteren'}</span>{group.selected.size>0&&<button type="button" onClick={group.clear}>Selectie wissen</button>}</div>}
