import type { Point } from './projectFile.ts'
import type { Cut } from './cuts.ts'
import { cutBoundary, cutPointFits, inside } from './cuts.ts'

export type CutSpace={outline:Point[];corners:Point[];cuts:Cut[];w:number;h:number}
const lerp=(a:Point,b:Point,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)
function pointSegment(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return distance(p,{x:a.x+t*dx,y:a.y+t*dy})}
function cross(a:Point,b:Point,c:Point){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function segmentDistance(a:Point,b:Point,c:Point,d:Point){
 if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0
 return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b))
}
function clean(p:Point[]){return p.filter((q,i)=>i===0||distance(q,p[i-1])>1e-6)}
export function validCut(cut:Cut,space:CutSpace){
 const {w,h,outline,corners,cuts}=space,toPx=(p:Point)=>({x:p.x*w,y:p.y*h}),path=cut.path.map(toPx)
 if(path.length<2)return false
 for(let i=1;i<path.length;i++){
  if(distance(path[i-1],path[i])<3||!cutPointFits(cut.path[i],outline,cut.width,w,h))return false
  // Check the entire segment, not just its endpoint, against the outer silhouette.
  const n=Math.ceil(distance(path[i-1],path[i])/3)
  for(let j=1;j<n;j++){const p=lerp(cut.path[i-1],cut.path[i],j/n);if(!inside(p,outline))return false}
  for(let j=1;j<i-1;j++){
   const a=Math.atan2(path[i].y-path[i-1].y,path[i].x-path[i-1].x),b=Math.atan2(path[i-1].y-path[Math.max(0,i-2)].y,path[i-1].x-path[Math.max(0,i-2)].x),angle=Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))
   const allowance=angle<Math.PI/3?cut.width*.35:cut.width
   if(segmentDistance(path[i-1],path[i],path[j-1],path[j])<allowance+2)return false
  }
 }
 const polygon=clean(cutBoundary(cut,w,h,corners))
 // Test the actual rounded sides, including the closing mouth and cap.
 for(let i=0;i<polygon.length;i++)for(let j=i+2;j<polygon.length;j++){
  if(i===0&&j===polygon.length-1)continue
  if(segmentDistance(polygon[i],polygon[(i+1)%polygon.length],polygon[j],polygon[(j+1)%polygon.length])<1e-5)return false
 }
 for(let i=1;i<polygon.length-1;i++)if(!inside({x:polygon[i].x/w,y:polygon[i].y/h},outline))return false
 for(const other of cuts){
  if(other.id===cut.id||other.path.length<2)continue
  const otherPath=other.path.map(toPx),gap=(cut.width+other.width)/2+2
  for(let i=1;i<path.length;i++)for(let j=1;j<otherPath.length;j++)if(segmentDistance(path[i-1],path[i],otherPath[j-1],otherPath[j])<gap)return false
  const boundary=clean(cutBoundary(other,w,h,corners))
  if(inside(polygon[0],boundary)||inside(boundary[0],polygon))return false
  for(let i=0;i<polygon.length;i++)for(let j=0;j<boundary.length;j++)if(segmentDistance(polygon[i],polygon[(i+1)%polygon.length],boundary[j],boundary[(j+1)%boundary.length])<2)return false
 }
 return true
}

// Walk outwards and stop at the FIRST obstruction; never jump through a narrow obstacle.
export function extendCut(cut:Cut,target:Point,space:CutSpace):Point|null{
 const start=cut.path[cut.path.length-1],length=Math.hypot((target.x-start.x)*space.w,(target.y-start.y)*space.h)
 if(length<3)return null
 const steps=Math.ceil(length/2);let last:Point|null=null,lastT=0
 for(let i=1;i<=steps;i++){
  const t=i/steps,p=lerp(start,target,t),travel=length*t
  if(travel<8)continue
  if(validCut({...cut,path:[...cut.path,p]},space)){last=p;lastT=t;continue}
  if(!last)continue
  let low=lastT,high=t
  for(let j=0;j<12;j++){const mid=(low+high)/2;if(validCut({...cut,path:[...cut.path,lerp(start,target,mid)]},space))low=mid;else high=mid}
  return lerp(start,target,low)
 }
 return last
}

export function limitCutChange(from:Cut,to:Cut,space:CutSpace):Cut{
 const travel=Math.max(...from.path.map((p,i)=>Math.hypot((to.path[i].x-p.x)*space.w,(to.path[i].y-p.y)*space.h)),Math.abs(to.width-from.width),Math.abs(to.rounding-from.rounding)*200)
 const interpolate=(t:number):Cut=>({...to,width:from.width+(to.width-from.width)*t,rounding:from.rounding+(to.rounding-from.rounding)*t,path:from.path.map((p,i)=>lerp(p,to.path[i],t))})
 const steps=Math.max(1,Math.ceil(travel/2));let previous=0
 for(let i=1;i<=steps;i++){
  const t=i/steps;if(validCut(interpolate(t),space)){previous=t;continue}
  let low=previous,high=t
  for(let j=0;j<12;j++){const mid=(low+high)/2;if(validCut(interpolate(mid),space))low=mid;else high=mid}
  return low>0?interpolate(low):from
 }
 return to
}
