import type { Point } from './projectFile.ts'
export type Cut={id:number;side:number;t:number;path:Point[];width:number;rounding:number}
export type Geometry={frame:Point[];counts:number[];anchors:number[];signature:string;sideCounts:number[];outer?:boolean[]}
export function baseLayout(points:Point[],w:number,h:number){
 const N=64
 const frame=points.map(p=>({x:p.x*w,y:p.y*h})),width=Math.hypot(frame[1].x-frame[0].x,frame[1].y-frame[0].y),height=Math.hypot(frame[2].x-frame[1].x,frame[2].y-frame[1].y)
 const horizontal=Math.max(4,Math.min(N/2-4,Math.round(N*width/(2*(width+height))))),vertical=(N-2*horizontal)/2,counts=[horizontal,vertical,horizontal,vertical]
 const anchors=[0,counts[0],counts[0]+counts[1],counts[0]+counts[1]+counts[2]]
 return{frame,counts,anchors,sideCounts:counts,signature:counts.join(':')}
}

const mix=(a:Point,b:Point,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})
export function cutBoundary(cut:Cut,w:number,h:number,corners:Point[]){
 const path=cut.path.map(p=>({x:p.x*w,y:p.y*h})),center:Point[]=[path[0]]
 for(let i=1;i<path.length-1;i++){
  const a=mix(path[i],path[i-1],cut.rounding*.4),b=mix(path[i],path[i+1],cut.rounding*.4)
  center.push(a)
  for(let j=1;j<=4;j++){const t=j/4;center.push(mix(mix(a,path[i],t),mix(path[i],b,t),t))}
 }
 center.push(path[path.length-1])
 const half=cut.width/2,left:Point[]=[],right:Point[]=[]
 center.forEach((p,i)=>{const a=center[Math.max(0,i-1)],b=center[Math.min(center.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;left.push({x:p.x-dy/d*half,y:p.y+dx/d*half});right.push({x:p.x+dy/d*half,y:p.y-dx/d*half})})
 const a=corners[cut.side],b=corners[(cut.side+1)%4],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1
 left[0]={x:path[0].x-dx/d*half,y:path[0].y-dy/d*half};right[0]={x:path[0].x+dx/d*half,y:path[0].y+dy/d*half}
 return [...left,...right.reverse()]
}
export function withCuts(base:Geometry,cuts:Cut[],w:number,h:number):Geometry{
 if(!cuts.length)return base
 const frame:Point[]=[],counts:number[]=[],sideCounts:number[]=[],outer:boolean[]=[]
 for(let side=0;side<4;side++){
  const start=counts.length;frame.push(base.frame[side])
  const onSide=cuts.filter(c=>c.side===side).sort((a,b)=>a.t-b.t)
  let previous=0
  for(const cut of onSide){
   counts.push(Math.max(2,Math.round(base.counts[side]*(cut.t-previous))));outer.push(true)
   const boundary=cutBoundary(cut,w,h,base.frame)
   boundary.forEach((p,i)=>{frame.push(p);if(i<boundary.length-1){counts.push(3);outer.push(false)}})
   previous=cut.t
  }
  counts.push(Math.max(2,Math.round(base.counts[side]*(1-previous))));outer.push(true)
  sideCounts.push(counts.slice(start).reduce((a,b)=>a+b,0))
 }
 let offset=0;const anchors=counts.map(n=>{const i=offset;offset+=n;return i})
 return{frame,counts,anchors,sideCounts,outer,signature:cuts.map(c=>c.id).join(',')+':'+counts.join(':')}
}
export function sampleGeometry(g:Geometry){return g.counts.flatMap((count,side)=>Array.from({length:count},(_,i)=>{const p=mix(g.frame[side],g.frame[(side+1)%g.frame.length],i/count);return{...p,ox:p.x,oy:p.y}}))}
export function inside(point:Point,polygon:Point[]){let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)result=!result}return result}


// Bridge each cut mouth for the material map. The real contour still clips pigment.
export function patternEnvelope(body:Point[],g:Geometry){
 if(!g.outer)return {body,counts:g.sideCounts}
 const result:Point[]=[],counts:number[]=[];let index=0,side=0,total=0
 g.counts.forEach((count,segment)=>{
  if(g.outer![segment])for(let j=0;j<count;j++)result.push(body[index+j])
  index+=count
  if(index===g.sideCounts.slice(0,side+1).reduce((a,b)=>a+b,0)){counts.push(result.length-total);total=result.length;side++}
 })
 // Equal arc-length samples prevent changes in cut subdivision from compressing stripes.
 const sampled:Point[]=[],sampleCounts:number[]=[];let offset=0
 counts.forEach(count=>{
  const chain=Array.from({length:count+1},(_,i)=>result[(offset+i)%result.length]),lengths=[0]
  for(let i=1;i<chain.length;i++)lengths.push(lengths[i-1]+Math.hypot(chain[i].x-chain[i-1].x,chain[i].y-chain[i-1].y))
  for(let i=0;i<32;i++){const distance=lengths[lengths.length-1]*i/32;let j=1;while(j<lengths.length-1&&lengths[j]<distance)j++;sampled.push(mix(chain[j-1],chain[j],(distance-lengths[j-1])/(lengths[j]-lengths[j-1]||1)))}
  sampleCounts.push(32);offset+=count
 })
 return {body:sampled,counts:sampleCounts}
}

// The centre of a cut must leave room for both sides of its stroke.
export function cutPointFits(point:Point,outline:Point[],width:number,w:number,h:number){
 if(!inside(point,outline))return false
 const clearance=width/2+2
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length],dx=(b.x-a.x)*w,dy=(b.y-a.y)*h,px=(point.x-a.x)*w,py=(point.y-a.y)*h
  const t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)))
  if(Math.hypot(px-t*dx,py-t*dy)<clearance)return false
 }
 return true
}
