export type PatternType = 'zebra' | 'giraffe' | 'cow'
export type PatternRegion = { id:number; x:number; y:number; w:number; h:number; polygon:Point[]; type:PatternType; color:string; scale:number; variation:number; coverage:number; seed:number; opacity:number }
type Point = {x:number;y:number}
export const defaults = (type:PatternType) => ({type,scale:type==='zebra'?12:type==='giraffe'?7:5,variation:type==='zebra'?.55:.65,coverage:type==='giraffe'?.78:.5})
export const initialRegion = ():PatternRegion => ({id:1,x:0,y:0,w:1,h:1,polygon:[],color:'#D8FF73FF',opacity:1,seed:7,...defaults('zebra')})
const SIZE=192
function random(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function noise(x:number,y:number,seed:number){const hash=(a:number,b:number)=>{const n=Math.sin(a*127.1+b*311.7+seed*71.3)*43758.5453;return n-Math.floor(n)};const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);return (hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx)*(1-fy)+(hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx)*fy}
function organic(x:number,y:number,seed:number){return noise(x*5,y*5,seed)*.7+noise(x*17,y*17,seed+1)*.23+noise(x*43,y*43,seed+2)*.07-.5}

// An anisotropic activator/inhibitor system. Faster diffusion along the material
// vertical axis encourages stripes; the deforming body mesh transports that field.
function zebra(r:PatternRegion){const n=SIZE*SIZE;let a=new Float32Array(n),b=new Float32Array(n),nextA=new Float32Array(n),nextB=new Float32Array(n);const rng=random(r.seed)
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const u=x/(SIZE-1),v=y/(SIZE-1),phase=u*r.scale+organic(u,v,r.seed)*r.variation*3;a[y*SIZE+x]=Math.sin(phase*Math.PI*2)*.55+(rng()-.5)*.15;b[y*SIZE+x]=a[y*SIZE+x]*.3}
 for(let step=0;step<100;step++){for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const i=y*SIZE+x,l=y*SIZE+Math.max(0,x-1),rr=y*SIZE+Math.min(SIZE-1,x+1),up=Math.max(0,y-1)*SIZE+x,dn=Math.min(SIZE-1,y+1)*SIZE+x,aa=a[i],bb=b[i];const la=(a[l]+a[rr]-2*aa)*.18+(a[up]+a[dn]-2*aa)*.95,lb=(b[l]+b[rr]-2*bb)*1.6+(b[up]+b[dn]-2*bb)*2.2;nextA[i]=aa+.12*(aa-aa*aa*aa-bb+la);nextB[i]=bb+.12*(.16*(aa-.85*bb)+lb)}[a,nextA]=[nextA,a];[b,nextB]=[nextB,b]}
 return a
}
export function scalarField(r:PatternRegion){const values=new Float32Array(SIZE*SIZE),rng=random(r.seed),field=r.type==='zebra'?zebra(r):null
 const seeds:Array<Point&{radius:number}>=[];const count=r.type==='giraffe'?Math.round(r.scale*r.scale):Math.round(r.scale*3)
 for(let i=0;i<count;i++){const side=Math.ceil(Math.sqrt(count));seeds.push({x:r.type==='giraffe'?((i%side)+.15+rng()*.7)/side:rng(),y:r.type==='giraffe'?(Math.floor(i/side)+.15+rng()*.7)/side:rng(),radius:.7+rng()*.6})}
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const u=x/(SIZE-1),v=y/(SIZE-1),edge=organic(u,v,r.seed),wx=u+organic(u+.7,v,r.seed+3)*r.variation*.1,wy=v+organic(u,v+.4,r.seed+4)*r.variation*.1;let value=0
  if(field)value=field[y*SIZE+x]+(r.coverage-.5)*1.8
  else if(r.type==='giraffe'){let first=Infinity,second=Infinity;for(const s of seeds){const d=Math.hypot(wx-s.x,wy-s.y)/Math.pow(s.radius,r.variation*.35);if(d<first){second=first;first=d}else if(d<second)second=d}const gap=(1-r.coverage)/r.scale*(.65+(edge+.5)*.9);value=(second-first-gap)*r.scale}
  else {let sum=0;const radius=.23/Math.sqrt(r.scale);for(const s of seeds){const dx=wx-s.x,dy=wy-s.y;sum+=Math.exp(-(dx*dx+dy*dy)/(2*radius*radius*s.radius*s.radius))}value=sum-(1.25-r.coverage*.95)+edge*r.variation*.55}
  values[y*SIZE+x]=value
 }return values
}

// Marching squares with shared edge IDs: loops close exactly, including holes and
// shapes touching the material boundary. Saddle cells use the bilinear centre.
export function contours(values:Float32Array, size=SIZE):Point[][] {
 const stride=size+2, field=new Float32Array(stride*stride).fill(-1)
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)field[(y+1)*stride+x+1]=values[y*size+x]
 const nodes=new Map<string,{point:Point;links:string[]}>()
 const cases:number[][][]=[[],[[3,0]],[[0,1]],[[3,1]],[[1,2]],[],[[0,2]],[[3,2]],[[2,3]],[[2,0]],[],[[2,1]],[[1,3]],[[1,0]],[[0,3]],[]]
 for(let y=0;y<stride-1;y++)for(let x=0;x<stride-1;x++){
  const v=[field[y*stride+x],field[y*stride+x+1],field[(y+1)*stride+x+1],field[(y+1)*stride+x]],bits=v.reduce((n,a,i)=>n|(a>0?1<<i:0),0)
  let pairs=cases[bits];const inside=v.reduce((a,b)=>a+b,0)>0
  if(bits===5)pairs=inside?[[0,1],[2,3]]:[[3,0],[1,2]]
  if(bits===10)pairs=inside?[[3,0],[1,2]]:[[0,1],[2,3]]
  const edge=(e:number)=>{const keys=[`h${x},${y}`,`v${x+1},${y}`,`h${x},${y+1}`,`v${x},${y}`],corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],ends=[[0,1],[1,2],[3,2],[0,3]],key=keys[e]
   if(!nodes.has(key)){const [a,b]=ends[e],t=v[a]/(v[a]-v[b]);nodes.set(key,{point:{x:(corners[a][0]+(corners[b][0]-corners[a][0])*t-.5)/size,y:(corners[a][1]+(corners[b][1]-corners[a][1])*t-.5)/size},links:[]})}return key}
  for(const pair of pairs){const a=edge(pair[0]),b=edge(pair[1]);nodes.get(a)!.links.push(b);nodes.get(b)!.links.push(a)}
 }
 const visited=new Set<string>(),loops:Point[][]=[]
 for(const start of nodes.keys()){if(visited.has(start))continue;const loop:Point[]=[];let current=start,previous=''
  do{visited.add(current);const node=nodes.get(current)!;loop.push(node.point);const next=node.links.find(k=>k!==previous);if(!next)throw new Error('Open pigment contour');previous=current;current=next}while(current!==start&&!visited.has(current))
  if(current!==start)throw new Error('Invalid pigment contour topology')
  if(loop.length>=4){const simplified=simplifyLoop(loop,.0008);if(simplified.length>=3)loops.push(simplified)}
 }return loops
}

function simplifyLine(points:Point[],tolerance:number):Point[]{
 if(points.length<=2)return points
 const a=points[0],b=points[points.length-1],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;let farthest=0,index=0
 for(let i=1;i<points.length-1;i++){const p=points[i],t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0,d=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);if(d>farthest){farthest=d;index=i}}
 return farthest>tolerance?[...simplifyLine(points.slice(0,index+1),tolerance).slice(0,-1),...simplifyLine(points.slice(index),tolerance)]:[a,b]
}
function simplifyLoop(points:Point[],tolerance:number){const half=Math.floor(points.length/2);return [...simplifyLine(points.slice(0,half+1),tolerance).slice(0,-1),...simplifyLine([...points.slice(half),points[0]],tolerance).slice(0,-1)]}
const mix=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})
const num=(x:number)=>x.toFixed(2)
export function curvePath(points:Point[]){if(points.length<3)return '';const start=mix(points[points.length-1],points[0],.5);let d=`M${num(start.x)} ${num(start.y)}`;points.forEach((p,i)=>{const end=mix(p,points[(i+1)%points.length],.5);d+=`Q${num(p.x)} ${num(p.y)} ${num(end.x)} ${num(end.y)}`});return d+'Z'}

// A Coons patch extends all four elastic boundary curves through the interior.
// Every contour uses the same continuous map, so there are no triangle seams.
function bodyMap(body:Point[],counts:number[]){const offsets=[0,counts[0],counts[0]+counts[1],counts[0]+counts[1]+counts[2]],n=body.length
 const boundary=(index:number)=>{const whole=Math.floor(index),t=index-whole,i=(whole+n)%n,a=mix(body[(i+n-1)%n],body[i],.5),b=mix(body[i],body[(i+1)%n],.5);return mix(mix(a,body[i],t),mix(body[i],b,t),t)}
 const side=(s:number,t:number)=>boundary(offsets[s]+t*counts[s]),corners=offsets.map(boundary)
 return (p:Point)=>{const u=Math.max(0,Math.min(1,p.x)),v=Math.max(0,Math.min(1,p.y)),top=side(0,u),right=side(1,v),bottom=side(2,1-u),left=side(3,1-v),bilinear=mix(mix(corners[0],corners[1],u),mix(corners[3],corners[2],u),v);return{x:(1-v)*top.x+v*bottom.x+(1-u)*left.x+u*right.x-bilinear.x,y:(1-v)*top.y+v*bottom.y+(1-u)*left.y+u*right.y-bilinear.y}}
}
const NS='http://www.w3.org/2000/svg'
// Erode the pigment field before tracing it, rather than cutting finished paths.
// A noisy transition band makes stripes taper and blobs shrink into empty space.
export function edgeFalloff(value:number,distance:number,variation:number){
 const width=24, t=Math.max(0,Math.min(1,(distance-2-variation*9)/width))
 return distance<=0?-1:value-(1-t*t*(3-2*t))*Math.max(3,value+1)
}
function boundaryField(field:Float32Array,r:PatternRegion,w:number,h:number,map:(p:Point)=>Point,body:Point[],eyes:Point[],edgeMargin:number,eyeMargin:number){
 const result=new Float32Array(field.length),polygon=r.polygon.map(p=>({x:p.x*w,y:p.y*h}))
 const signedDistance=(point:Point,loop:Point[])=>{let nearest=Infinity,inside=false;for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length)):0;nearest=Math.min(nearest,(point.x-a.x-t*dx)**2+(point.y-a.y-t*dy)**2)}return(inside?1:-1)*Math.sqrt(nearest)}
 // The smoothed polygon follows the same quadratic contour as the SVG outline.
 const perimeter=body.map((p,i)=>mix(p,body[(i+1)%body.length],.5))
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const u=x/(SIZE-1),v=y/(SIZE-1),p=map({x:u,y:v});let distance=Infinity
  if(distance>0){
   distance=Math.min(signedDistance(p,polygon),signedDistance(p,perimeter)-edgeMargin)
   for(const eye of eyes)distance=Math.min(distance,Math.hypot(p.x-eye.x*w,p.y-eye.y*h)-32-eyeMargin)
  }
  result[y*SIZE+x]=edgeFalloff(field[y*SIZE+x],distance,organic(u*1.7,v*1.7,r.seed+91)+.5)
 }return result
}
function svgNode<K extends keyof SVGElementTagNameMap>(name:K,attributes:Record<string,string>={}){const node=document.createElementNS(NS,name);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,value);return node}
export function createPatternRenderer(svg:SVGSVGElement){
 const cache=new Map<number,{key:string;boundaryKey:string;lastTrace:number;field:Float32Array;loops:Point[][];path:SVGPathElement;polygon:SVGPolygonElement;clip:SVGClipPathElement}>(),defs=svgNode('defs'),mask=svgNode('mask',{id:'skin-mask',maskUnits:'userSpaceOnUse',x:'0',y:'0',width:'100%',height:'100%'}),silhouette=svgNode('path',{fill:'white',stroke:'black','stroke-linejoin':'round'}),group=svgNode('g',{mask:'url(#skin-mask)'})
 mask.append(silhouette);defs.append(mask);svg.replaceChildren(defs,group)
 let geometryKey=''
 return {
  render(regions:PatternRegion[],w:number,h:number,body:Point[],counts:number[],eyes:Point[],edgeMargin:number,eyeMargin:number,material={body,counts}){
   if(!body.length)return
   svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('width',String(w));svg.setAttribute('height',String(h))
   silhouette.setAttribute('d',curvePath(body));silhouette.setAttribute('stroke-width',String(edgeMargin*2))
   while(mask.children.length>1)mask.lastChild!.remove()
   eyes.forEach(eye=>mask.append(svgNode('circle',{cx:String(eye.x*w),cy:String(eye.y*h),r:String(32+eyeMargin),fill:'black'})))
   const nextGeometry=JSON.stringify([body.map(p=>[num(p.x),num(p.y)]),counts,material]),changed=nextGeometry!==geometryKey;geometryKey=nextGeometry;const map=bodyMap(material.body,material.counts)
   for(const [id,entry]of cache)if(!regions.some(r=>r.id===id)){entry.path.remove();entry.clip.remove();cache.delete(id)}
   for(const r of regions){if(r.polygon.length<3){const old=cache.get(r.id);old?.path.setAttribute('d','');continue}const key=JSON.stringify([r.type,r.scale,r.variation,r.coverage,r.seed]);let entry=cache.get(r.id);const regenerate=entry?.key!==key
    if(!entry){const clip=svgNode('clipPath',{id:`skin-region-${r.id}`,clipPathUnits:'userSpaceOnUse'}),polygon=svgNode('polygon'),path=svgNode('path',{'fill-rule':'evenodd','clip-path':`url(#skin-region-${r.id})`});clip.append(polygon);defs.append(clip);group.append(path);entry={key:'',boundaryKey:'',lastTrace:0,field:new Float32Array(),loops:[],path,polygon,clip};cache.set(r.id,entry)}
    if(regenerate){entry.field=scalarField(r);entry.key=key}
    const boundaryKey=JSON.stringify([body.map(p=>[Math.round(p.x),Math.round(p.y)]),counts,w,h,eyes,r.polygon,edgeMargin,eyeMargin]),now=performance.now(),retrace=regenerate||(boundaryKey!==entry.boundaryKey&&now-entry.lastTrace>90)
    if(retrace){entry.loops=contours(boundaryField(entry.field,r,w,h,map,body,eyes,edgeMargin,eyeMargin));entry.boundaryKey=boundaryKey;entry.lastTrace=now}
    if(changed||retrace)entry.path.setAttribute('d',entry.loops.map(loop=>curvePath(loop.map(map))).join(''))
    entry.path.setAttribute('fill',r.color.slice(0,7));entry.path.setAttribute('fill-opacity',String(r.opacity*(r.color.length===9?parseInt(r.color.slice(7,9),16)/255:1)))
    entry.polygon.setAttribute('points',r.polygon.map(p=>`${p.x*w},${p.y*h}`).join(' '))
   }
  },
  export(){const copy=svg.cloneNode(true) as SVGSVGElement;copy.setAttribute('xmlns',NS);copy.removeAttribute('class');copy.removeAttribute('style');const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='soulspawn-pattern.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},
  dispose(){cache.clear();svg.replaceChildren()}
 }
}
