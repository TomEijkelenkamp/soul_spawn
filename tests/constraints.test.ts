import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validCut, extendCut, limitCutChange } from '../src/cutConstraints.ts'
import type { CutSpace } from '../src/cutConstraints.ts'
import type { Cut } from '../src/cuts.ts'

const outline=[{x:.2,y:.2},{x:.8,y:.2},{x:.8,y:.8},{x:.2,y:.8}]
const space:CutSpace={outline,corners:outline.map(p=>({x:p.x*1000,y:p.y*1000})),cuts:[],w:1000,h:1000}
const cut:Cut={id:1,side:0,t:.5,path:[{x:.5,y:.2},{x:.5,y:.5}],width:20,rounding:.5}
test('Outside target places the furthest valid point on the pointer ray',()=>{
 const draft={...cut,path:[cut.path[0]]},target={x:.5,y:1.2},end=extendCut(draft,target,space)!
 assert.ok(end);assert.equal(end.x,.5);assert.ok(Math.abs(end.y-.788)<.00001)
 assert.ok(validCut({...draft,path:[...draft.path,end]},space))
 assert.equal(validCut({...draft,path:[...draft.path,{x:end.x,y:end.y+.001}]},space),false)
})
test('Obstacles stop the preview before crossing another cut, even with an outside target',()=>{
 const other:Cut={id:2,side:3,t:.5,width:30,rounding:.5,path:[{x:.2,y:.55},{x:.7,y:.55}]}
 const end=extendCut({...cut,path:[cut.path[0]]},{x:.5,y:1.2},{...space,cuts:[other]})!
 assert.ok(end.y>.51&&end.y<=.52301)
})
test('A cut cannot cross or retrace itself',()=>{
 assert.equal(validCut({...cut,path:[cut.path[0],{x:.5,y:.6},{x:.7,y:.6},{x:.3,y:.4}]},space),false)
 assert.equal(validCut({...cut,path:[cut.path[0],{x:.5,y:.6},{x:.5,y:.4}]},space),false)
})
test('Self-crossing extensions stop at the first obstruction',()=>{
 const draft={...cut,path:[cut.path[0],{x:.5,y:.6},{x:.7,y:.6},{x:.7,y:.4}]}
 assert.ok(validCut(draft,space))
 const end=extendCut(draft,{x:.3,y:.4},space)!
 assert.ok(end);assert.ok(end.x>.52)
 assert.ok(validCut({...draft,path:[...draft.path,end]},space))
})
test('Dragging cannot tunnel through a neighbouring cut',()=>{
 const other:Cut={id:2,side:1,t:.5,width:20,rounding:0,path:[{x:.8,y:.6},{x:.55,y:.6}]}
 const moved=limitCutChange(cut,{...cut,path:[cut.path[0],{x:.7,y:.75}]},{...space,cuts:[other]})
 assert.notDeepEqual(moved.path[1],{x:.7,y:.75})
 assert.ok(validCut(moved,{...space,cuts:[other]}))
})
test('Increasing width stops before touching another cut',()=>{
 const other={...cut,id:2,t:.6,path:cut.path.map(p=>({x:p.x+.06,y:p.y}))}
 const result=limitCutChange(cut,{...cut,width:80},{...space,cuts:[other]})
 assert.ok(result.width<=80);assert.ok(validCut(result,{...space,cuts:[other]}))
 const closer={...other,path:cut.path.map(p=>({x:p.x+.04,y:p.y}))}
 const limited=limitCutChange(cut,{...cut,width:80},{...space,cuts:[closer]})
 assert.ok(limited.width<60);assert.ok(validCut(limited,{...space,cuts:[closer]}))
})
test('Valid bends remain editable; an outward first segment creates no cut',()=>{
 assert.ok(validCut({...cut,path:[...cut.path,{x:.65,y:.6}]},space))
 assert.equal(extendCut({...cut,path:[cut.path[0]]},{x:.5,y:0},space),null)
})
