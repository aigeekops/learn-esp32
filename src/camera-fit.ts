/** Orthographic framing in the part of the canvas left clear by UI panels. */
export interface Point3 {x:number;y:number;z:number}
export interface Bounds3 {min:Point3;max:Point3}
export interface CameraFrame {width:number;height:number;left:number;top:number;right:number;bottom:number}
export function fitCamera(bounds:Bounds3|Bounds3[],angle:number,elevation:number,frame:CameraFrame,fill=.76){
 const right={x:Math.cos(angle),y:0,z:-Math.sin(angle)};
 const up={x:-Math.sin(elevation)*Math.sin(angle),y:Math.cos(elevation),z:-Math.sin(elevation)*Math.cos(angle)};
 const boxes=Array.isArray(bounds)?bounds:[bounds];
 const min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
 for(const box of boxes)for(const axis of ['x','y','z'] as const){min[axis]=Math.min(min[axis],box.min[axis]);max[axis]=Math.max(max[axis],box.max[axis]);}
 const center={x:(min.x+max.x)/2,y:(min.y+max.y)/2,z:(min.z+max.z)/2};
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const box of boxes)for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const dx=x-center.x,dy=y-center.y,dz=z-center.z;
  const px=dx*right.x+dy*right.y+dz*right.z,py=dx*up.x+dy*up.y+dz*up.z;
  minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
 }
 const height=Math.max(12,(maxX-minX)*frame.height/((frame.right-frame.left)*fill),(maxY-minY)*frame.height/((frame.bottom-frame.top)*fill));
 const midX=(minX+maxX)/2,midY=(minY+maxY)/2;
 center.x+=right.x*midX+up.x*midY;center.y+=right.y*midX+up.y*midY;center.z+=right.z*midX+up.z*midY;
 const dx=((frame.left+frame.right)/2-frame.width/2)*height/frame.height;
 const dy=((frame.top+frame.bottom)/2-frame.height/2)*height/frame.height;
 return {height,target:{x:center.x-right.x*dx+up.x*dy,y:center.y-right.y*dx+up.y*dy,z:center.z-right.z*dx+up.z*dy}};
}
