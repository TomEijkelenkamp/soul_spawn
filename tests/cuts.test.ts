import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baseLayout, withCuts, sampleGeometry, inside, cutBoundary, patternEnvelope, cutPointFits } from '../src/cuts.ts'
import type { Cut } from '../src/cuts.ts'
import { parseDesign, serializeDesign } from '../src/projectFile.ts'
import type { Design } from '../src/projectFile.ts'

const points=[{x:.2,y:.2},{x:.8,y:.2},{x:.8,y:.8},{x:.2,y:.8}],base=baseLayout(points,1000,1000)
const cut:Cut={id:1,side:0,t:.5,path:[{x:.5,y:.2},{x:.5,y:.5}],width:20,rounding:.5}
test('No cuts preserves the original 64-particle contour',()=>{
 assert.equal(withCuts(base,[],1000,1000),base)
 assert.equal(sampleGeometry(base).length,64)
})
test('A straight cut inserts four control points and excludes its interior',()=>{
 const geometry=withCuts(base,[cut],1000,1000),body=sampleGeometry(geometry)
 assert.equal(geometry.frame.length,8)
 assert.equal(body.length,geometry.sideCounts.reduce((a,b)=>a+b,0))
 assert.equal(inside({x:500,y:350},body),false)
 assert.equal(inside({x:450,y:350},body),true)
 assert.equal(inside({x:500,y:550},body),true)
 for(const [i,index] of geometry.anchors.entries()){assert.equal(body[index].x,geometry.frame[i].x);assert.equal(body[index].y,geometry.frame[i].y)}
})
test('Cuts on all four sides retain consistent contour order',()=>{
 const paths=[[{x:.5,y:.2},{x:.5,y:.4}],[{x:.8,y:.5},{x:.6,y:.5}],[{x:.5,y:.8},{x:.5,y:.6}],[{x:.2,y:.5},{x:.4,y:.5}]]
 for(let side=0;side<4;side++){
  const c={...cut,side,path:paths[side]},body=sampleGeometry(withCuts(base,[c],1000,1000)),middle={x:(c.path[0].x+c.path[1].x)*500,y:(c.path[0].y+c.path[1].y)*500}
  assert.equal(inside(middle,body),false)
  assert.equal(inside({x:500,y:500},body),true)
 }
})
test('Curves, width changes, multiple cuts and removal produce finite geometry',()=>{
 const curved={...cut,path:[...cut.path,{x:.65,y:.6}]}
 const g=withCuts(base,[curved,{...cut,id:2,side:2,path:[{x:.5,y:.8},{x:.5,y:.65}]}],1000,1000)
 assert.ok(sampleGeometry(g).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))
 assert.equal(g.frame.length,g.counts.length)
 assert.equal(g.outer?.filter(Boolean).length,6)
 assert.notDeepEqual(cutBoundary(curved,1000,1000,base.frame),cutBoundary({...curved,rounding:0},1000,1000,base.frame))
 assert.equal(sampleGeometry(withCuts(base,[],1000,1000)).length,64)
})
const design:Design={points,eyes:[{x:.4,y:.4},{x:.6,y:.4}],cuts:[cut],regions:[{id:1,x:0,y:0,w:1,h:1,type:'zebra',color:'#FFFFFFFF',scale:12,variation:.5,coverage:.5,seed:1,opacity:1}],selectedRegion:1,patternEdgeMargin:12,patternEyeMargin:10,pressure:2,stiffness:14,smoothing:.42,contourLength:1,visual:{lineWidth:3,eyeLineWidth:4,pupilSize:9,outlineColor:'#FFFFFFFF',fillColor:'#FFFFFFFF',eyeOutline:'#FFFFFFFF',eyeFill:'#FFFFFFFF',pupilColor:'#FFFFFFFF'},paused:false,structure:.7,body:sampleGeometry(withCuts(base,[cut],1000,1000)).map(p=>({x:p.x/1000,y:p.y/1000,ox:p.ox/1000,oy:p.oy/1000})),view:{zoom:1,centerX:550,centerY:450}}
test('Save/load retains cut controls and the expanded simulation body',()=>{
 const text=serializeDesign(design)
 assert.equal(JSON.parse(text).version,2)
 assert.deepEqual(parseDesign(text),design)
})
test('Legacy files remain readable and malformed cuts are rejected',()=>{
 const legacy={...design,cuts:undefined,body:design.body.slice(0,64)}
 assert.deepEqual(parseDesign(serializeDesign(legacy)).cuts,[])
 assert.throws(()=>parseDesign(serializeDesign({...design,cuts:[{...cut,path:[]}]})))
 assert.throws(()=>parseDesign(serializeDesign({...design,cuts:[cut,cut]})))
})

test('Deep bends do not fold the material map through the cut',()=>{
 const shallow=withCuts(base,[cut],1000,1000)
 const deep=withCuts(base,[{...cut,path:[cut.path[0],{x:.4,y:.65},{x:.7,y:.45}]}],1000,1000)
 const a=patternEnvelope(sampleGeometry(shallow),shallow),b=patternEnvelope(sampleGeometry(deep),deep)
 assert.deepEqual(a,b)
 assert.equal(inside({x:500,y:350},a.body),true)
 assert.equal(a.body.length,a.counts.reduce((x,y)=>x+y,0))
 assert.ok(a.body.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))
})
test('Material mapping remains unchanged without cuts',()=>{
 const body=sampleGeometry(base),envelope=patternEnvelope(body,base)
 assert.equal(envelope.body,body)
 assert.deepEqual(envelope.counts,base.sideCounts)
})

test('Cut handles cannot cross any outside edge, including their half-width',()=>{
 const outline=[{x:.2,y:.2},{x:.8,y:.2},{x:.8,y:.8},{x:.2,y:.8}]
 assert.equal(cutPointFits({x:.5,y:.5},outline,20,1000,900),true)
 for(const p of [{x:.1,y:.5},{x:.9,y:.5},{x:.5,y:.1},{x:.5,y:.9},{x:.205,y:.5}])assert.equal(cutPointFits(p,outline,20,1000,900),false)
 assert.equal(cutPointFits({x:.22,y:.5},outline,20,1000,900),true)
 assert.equal(cutPointFits({x:.22,y:.5},outline,80,1000,900),false)
})
test('The existing cut void does not trap its own editable points',()=>{
 const g=withCuts(base,[cut],1000,1000),outline=patternEnvelope(sampleGeometry(g),g).body.map(p=>({x:p.x/1000,y:p.y/1000}))
 assert.equal(cutPointFits({x:.5,y:.35},outline,cut.width,1000,1000),true)
})
