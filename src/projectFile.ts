import type { Cut } from './cuts.ts'
import type { PatternRegion } from './naturalPatterns.ts'
export type Point={x:number;y:number}
export type SavedParticle=Point&{ox:number;oy:number}
export type VisualStyle={lineWidth:number;outlineColor:string;fillColor:string;backgroundColor:string;eyeOutline:string;eyeFill:string;pupilColor:string;eyeLineWidth:number;pupilSize:number}
export type SavedView={zoom:number;centerX:number;centerY:number}
export type Design={cuts?:Cut[];points:Point[];eyes:Point[];regions:PatternRegion[];selectedRegion:number;patternEdgeMargin:number;patternEyeMargin:number;pressure:number;stiffness:number;smoothing:number;contourLength:number;visual:VisualStyle;paused:boolean;structure:number;body:SavedParticle[];view:SavedView}
export function serializeDesign(design:Design){return JSON.stringify({app:'Soulspawn',version:3,design},null,2)}
const invalid=()=>new Error('Dit bestand bevat geen geldig Soulspawn-ontwerp.')
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw invalid();return value as Record<string,unknown>}
function number(value:unknown,min:number,max:number){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw invalid();return value}
function integer(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER){const n=number(value,min,max);if(!Number.isSafeInteger(n))throw invalid();return n}
function color(value:unknown){if(typeof value!=='string'||!/^#[\da-f]{6}([\da-f]{2})?$/i.test(value))throw invalid();return value}
function points(value:unknown,count:number){if(!Array.isArray(value)||value.length!==count)throw invalid();return value.map(v=>{const p=object(v);return{x:number(p.x,0,1),y:number(p.y,0,1)}})}
export function parseDesign(text:string):Design{
 let parsed:unknown;try{parsed=JSON.parse(text)}catch{throw invalid()}
 const file=object(parsed);if(file.app!=='Soulspawn')throw invalid();if(file.version!==1&&file.version!==2&&file.version!==3)throw new Error('Deze bestandsversie wordt nog niet ondersteund.')
 const d=object(file.design),v=object(d.visual),view=object(d.view),p=points(d.points,4),eyes=points(d.eyes,2)
 if(Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)+Math.hypot(p[2].x-p[1].x,p[2].y-p[1].y)<.001)throw invalid()
 if(!Array.isArray(d.regions)||d.regions.length>256)throw invalid()
 const regions:PatternRegion[]=d.regions.map(value=>{const r=object(value);if(r.type!=='zebra'&&r.type!=='giraffe'&&r.type!=='cow')throw invalid();const polygon=r.polygon===undefined?[]:points(r.polygon,Array.isArray(r.polygon)?r.polygon.length:0);if(polygon.length>128)throw invalid();const region={id:integer(r.id,1),x:number(r.x,0,1),y:number(r.y,0,1),w:number(r.w,.001,1),h:number(r.h,.001,1),polygon,type:r.type,color:color(r.color),scale:number(r.scale,3,r.type==='zebra'?22:12),variation:number(r.variation,0,1),coverage:number(r.coverage,.2,.95),seed:integer(r.seed),opacity:number(r.opacity,0,1)};if(region.x+region.w>1.000001||region.y+region.h>1.000001)throw invalid();return region as PatternRegion})
 if(new Set(regions.map(r=>r.id)).size!==regions.length)throw invalid();const selectedRegion=integer(d.selectedRegion,regions.length?1:0);if(regions.length? !regions.some(r=>r.id===selectedRegion):selectedRegion!==0)throw invalid()
 const cuts:Cut[]=[]
 if(d.cuts!==undefined){if(!Array.isArray(d.cuts)||d.cuts.length>16)throw invalid();for(const value of d.cuts){const c=object(value);if(!Array.isArray(c.path)||c.path.length<2||c.path.length>16)throw invalid();cuts.push({id:integer(c.id,1),side:integer(c.side,0,3),t:number(c.t,0,1),path:points(c.path,c.path.length),width:number(c.width,2,80),rounding:number(c.rounding,0,1)})}if(new Set(cuts.map(c=>c.id)).size!==cuts.length)throw invalid()}
 if(typeof d.paused!=='boolean'||!Array.isArray(d.body)||(d.body.length<4||d.body.length>65536))throw invalid()
 const body=d.body.map(value=>{const p=object(value);return{x:number(p.x,-100,100),y:number(p.y,-100,100),ox:number(p.ox,-100,100),oy:number(p.oy,-100,100)}})
 return{points:p,cuts,eyes,regions,selectedRegion,body,view:{zoom:number(view.zoom,.25,4),centerX:number(view.centerX,0,10000),centerY:number(view.centerY,0,10000)},paused:d.paused,patternEdgeMargin:number(d.patternEdgeMargin,0,50),patternEyeMargin:number(d.patternEyeMargin,0,50),pressure:number(d.pressure,-6,10),stiffness:number(d.stiffness,1,30),smoothing:number(d.smoothing,0,1),contourLength:number(d.contourLength,.5,1.5),structure:number(d.structure,0,1),visual:{lineWidth:number(v.lineWidth,.5,15),eyeLineWidth:number(v.eyeLineWidth,.5,15),pupilSize:number(v.pupilSize,2,24),outlineColor:color(v.outlineColor),fillColor:color(v.fillColor),backgroundColor:v.backgroundColor===undefined?'#071014FF':color(v.backgroundColor),eyeOutline:color(v.eyeOutline),eyeFill:color(v.eyeFill),pupilColor:color(v.pupilColor)}}
}
