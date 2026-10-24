import test from 'node:test';
import assert from 'node:assert/strict';
import {fitCamera} from '../src/camera-fit.ts';
import type {Bounds3,CameraFrame} from '../src/camera-fit.ts';

const angle=1.05,elevation=.70;
function verifyFrame(bounds:Bounds3|Bounds3[],frame:CameraFrame){
 const plan=fitCamera(bounds,angle,elevation,frame);
 const boxes=Array.isArray(bounds)?bounds:[bounds];
 for(const box of boxes)for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const dx=x-plan.target.x,dy=y-plan.target.y,dz=z-plan.target.z;
  const px=frame.width/2+(dx*Math.cos(angle)-dz*Math.sin(angle))*frame.height/plan.height;
  const py=frame.height/2-(-dx*Math.sin(elevation)*Math.sin(angle)+dy*Math.cos(elevation)-dz*Math.sin(elevation)*Math.cos(angle))*frame.height/plan.height;
  assert.ok(px>=frame.left&&px<=frame.right,'Geometry fits horizontally without the inspector covering it');
  assert.ok(py>=frame.top&&py<=frame.bottom,'Geometry fits between the schematic and view controls');
 }
 return plan;
}
test('whole circuit fits desktop and phone viewports',()=>{
 const circuit=[{min:{x:-42,y:-2,z:-26},max:{x:-14,y:10,z:26}},{min:{x:3,y:-1,z:-24},max:{x:46,y:2,z:26}},{min:{x:22,y:1,z:-2},max:{x:34,y:10,z:2}}];
 verifyFrame(circuit,{width:840,height:532,left:24,top:156,right:816,bottom:470});
 verifyFrame(circuit,{width:366,height:364,left:24,top:130,right:342,bottom:302});
});
test('small component receives a closer view and fits beside its inspector',()=>{
 const frame={width:840,height:532,left:24,top:156,right:568,bottom:470};
 const wide=verifyFrame({min:{x:-42,y:-2,z:-26},max:{x:60,y:18,z:49}},frame);
 const close=verifyFrame({min:{x:22,y:1,z:-2},max:{x:34,y:10,z:2}},frame);
 assert.ok(close.height<wide.height/3,'LED uses its own dimensions instead of a fixed scene zoom');
});
