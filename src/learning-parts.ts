import * as T from 'three';
import type {Workbench} from './scene.ts';
import type {Part} from './lessons.ts';
import {noteNames} from './lessons.ts';

// Independent teaching models; no meshes or textures are copied from the reference site.
export function buildLearningPart(w:Workbench,id:Part,g:T.Group):boolean{
 const mesh=(geometry:T.BufferGeometry,color:T.ColorRepresentation,x=0,y=0,z=0)=>{const m=new T.Mesh(geometry,w.mat(color));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
 if(id==='ldr'){
  w.box(g,9,.8,15,0,1,0,0x527b6d);w.text(g,'LDR + 10k',0,1.5,5,8,3,'#e9e6cd');
  w.cylinder(g,3.5,1,0,3,-2,0xc49c62,20);
  const track=[[-2,-3],[-2,0],[-1,0],[-1,-4],[0,-4],[0,0],[1,0],[1,-4],[2,-4],[2,-1]].map(([x,z])=>new T.Vector3(x,3.6,z));
  const trace=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(track),36,.16,5,false),w.mat('#685149'));g.add(trace);
  const resistor=new T.Group();resistor.position.set(0,0,3);g.add(resistor);w.box(resistor,3,1,1.5,0,2,0,0xc1ad7b);w.box(resistor,.3,1.05,1.55,-.8,2,0,0x85513e);w.box(resistor,.3,1.05,1.55,.2,2,0,0x30343c);w.addEntry('light-resistor',resistor,'10 kΩ 分压电阻','10 kΩ divider resistor',3);
  for(const x of [-2,0,2])w.cylinder(g,.25,3,x,1,7,0xb9a260,6);
 }else if(id==='lamp'){
  w.cylinder(g,6,1.6,0,0,0,0xb8ad92);w.cylinder(g,.65,18,0,10,0,0x56636a);
  const shade=mesh(new T.ConeGeometry(6,7,18),0xc3a266,0,20,0);shade.rotation.z=.3;
  const bulb=w.cylinder(g,3,.4,0,16.5,0,0xffefb8);bulb.name='lamp-bulb';
  const pool=mesh(new T.CircleGeometry(13,36),0xffe6a0,0,-3.35,0);pool.rotation.x=-Math.PI/2;(pool.material as T.MeshStandardMaterial).transparent=true;(pool.material as T.MeshStandardMaterial).opacity=.3;pool.name='lamp-pool';
 }else if(id==='piano'){
  w.box(g,64,1.8,19,0,1,0,0x35464c);w.text(g,'ESP32 · 1  2  3  4  5  6  7  8',0,2.1,-7.5,61,3,'#d3d0b7');
  for(let i=0;i<8;i++){
   const key=new T.Group();key.position.set(-26.25+i*7.5,0,0);g.add(key);
   const cap=w.box(key,6.7,2,12,0,3,1,0xf4efdf);cap.name='key-cap';
   w.text(key,noteNames[i],0,4.05,3.7,6,3,'#48676b');w.addEntry('key-'+i,key,noteNames[i]+' 琴键',noteNames[i]+' key',5);
   w.cylinder(g,.3,2,-26.25+i*7.5,1,-8.5,0xb9a260,6);
  }
  w.cylinder(g,.3,2,30,1,-8.5,0xb9a260,6);
 }else if(id==='plant'){
  mesh(new T.CylinderGeometry(10,7,12,20),0xb77e60,0,5,0);
  w.cylinder(g,10.7,1.8,0,11.5,0,0xc78f69,22);
  const soil=w.cylinder(g,9.5,.5,0,12.5,0,0x6e513a,22);soil.name='soil-surface';
  w.cylinder(g,.65,15,0,20,0,0x5c815a,9);
  for(let i=0;i<6;i++){
   const a=i*Math.PI*2/3,height=19+Math.floor(i/3)*5;
   const leaf=mesh(new T.SphereGeometry(1,12,8),0x6b9b65,Math.cos(a)*4,height,Math.sin(a)*4);
   leaf.scale.set(6,1.1,2.6);leaf.rotation.y=-a;leaf.userData.leaf=true;leaf.userData.side=Math.cos(a);leaf.userData.restY=height;
  }
  w.text(g,'SMART GARDEN',0,12.6,6,15,3,'#ead8b3');
 }else if(id==='soil'){
  const blade=w.box(g,4,23,1,0,14,0,0x3c6e50);blade.rotation.z=-.12;
  for(const x of [-1,1])w.box(g,.25,15,.06,x,12,.55,0xb39c61,false);
  w.box(g,5,5,1.5,-1,26,0,0x39484a);w.text(g,'SOIL',0,28.6,0,6,3,'#d9dcbe');
  for(const x of [-2,0,2])w.cylinder(g,.24,2,x,29,0,0xb9a260,6);
 }else if(id==='watering'){
  w.cylinder(g,4.2,8,0,5,0,0x5d929f,18);
  const handle=mesh(new T.TorusGeometry(3.8,.55,8,18),0x5d929f,-4,5,0);handle.rotation.y=Math.PI/2;
  const curve=new T.CatmullRomCurve3([new T.Vector3(2,4,0),new T.Vector3(6,5,-4),new T.Vector3(9,10,-10)]);
  mesh(new T.TubeGeometry(curve,18,1.1,8,false),0x5d929f);const tip=w.cylinder(g,2,.5,9,10,-10,0x719fa6,12);tip.rotation.z=-.6;
  for(let i=0;i<9;i++){const drop=mesh(new T.SphereGeometry(.55,6,6),0x7eb4c5);drop.scale.y=1.6;drop.name='water-drop-'+i;drop.visible=false;}
 }else return false;
 return true;
}
