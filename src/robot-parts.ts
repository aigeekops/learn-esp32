import * as T from 'three';
import type {Workbench} from './scene.ts';
import type {RobotSnapshot} from './robot-shared.ts';
import type {Values} from './lessons.ts';

export const robotPartNames:Record<string,[string,string]>={
 ranger:['超声波测距模块','Ultrasonic range sensor'],obstacle:['障碍物 · 拖动改变距离','Obstacle · drag to move'],
 driver:['TB6612 双电机驱动','TB6612 motor driver'],motor:['直流电机与编码器','DC motor and encoder'],
 chassis:['双轮差速底盘','Differential-drive chassis'],computer:['UART 上位机','UART host computer'],phone:['BLE 遥控器','BLE controller'],peer:['ESP-NOW 对端','ESP-NOW peer']
};
export const robotTerminals:Record<string,Record<string,[number,number,number]>>={
 ranger:{VCC:[-7,2,6],TRIG:[-2.3,2,6],ECHO:[2.3,2,6],GND:[7,2,6],echoDividerIn:[12,2,1],echoDividerOut:[12,2,6],echoDividerGND:[12,2,12]},
 driver:{PWM_A:[-8,2,-12],AIN1:[-4,2,-12],AIN2:[0,2,-12],PWM_B:[4,2,-12],BIN1:[8,2,-12],BIN2:[12,2,-12],STBY:[-12,2,-12],VCC:[-12,2,12],VM:[-8,2,12],GND:[-4,2,12],AO1:[0,2,12],AO2:[4,2,12],BO1:[8,2,12],BO2:[12,2,12]},
 motor:{M1:[-5,2,12],M2:[-2,2,12],encoderVCC:[1,2,12],GND:[4,2,12],A:[7,2,12],B:[10,2,12]},
 chassis:{LM1:[-18,2,24],LM2:[-14,2,24],RM1:[-10,2,24],RM2:[-6,2,24],encoderVCC:[-2,2,24],GND:[2,2,24],LA:[6,2,24],LB:[10,2,24],RA:[14,2,24],RB:[18,2,24]},
 computer:{TX:[-10,2,12],RX:[-6,2,12],GND:[-2,2,12]}
};
interface Screen{ctx:CanvasRenderingContext2D;map:T.CanvasTexture;previous:string}
interface Visuals{screens:Map<string,Screen>;trail:T.Line|null;points:{x:number;y:number}[];lastSample:number;packet:T.Mesh|null;radioLine:T.Line|null;lastCount:number;packetUntil:number;}
const visuals=new WeakMap<Workbench,Visuals>();
export function resetRobotParts(w:Workbench){visuals.set(w,{screens:new Map(),trail:null,points:[],lastSample:-1,packet:null,radioLine:null,lastCount:0,packetUntil:0});}
const state=(w:Workbench)=>{if(!visuals.has(w))resetRobotParts(w);return visuals.get(w)!;};
function ports(w:Workbench,g:T.Group,id:string){for(const [name,p] of Object.entries(robotTerminals[id]??{})){w.cylinder(g,.42,2,p[0],p[1]-1,p[2],0xb9a260,8);w.text(g,name,p[0],p[1]+.1,p[2]+2,3.5,1.7,'#526c68');}}
function wheel(w:Workbench,parent:T.Group,x:number,z:number,name:string){const g=new T.Group();g.position.set(x,6,z);g.name=name;parent.add(g);const tyre=w.cylinder(g,6,3,0,0,0,0x303641,24);tyre.rotation.z=Math.PI/2;const hub=w.cylinder(g,3.4,3.2,0,0,0,0xbda665,16);hub.rotation.z=Math.PI/2;for(let i=0;i<6;i++){const a=i*Math.PI/3;w.box(g,3.3,.5,3,0,Math.sin(a)*2.7,Math.cos(a)*2.7,0xeee6d2,false).rotation.x=-a;}return g;}
function encoder(w:Workbench,parent:T.Group,id:string,x:number,z:number){const g=new T.Group();g.position.set(x,7,z);parent.add(g);w.box(g,5,.6,6,0,2,0,0x558779);for(const [i,name] of ['A','B'].entries()){const lamp=w.box(g,1.2,.5,1.2,-1.3+i*2.6,2.6,-1,0x375150);lamp.name='encoder-'+name;w.text(g,name,-1.3+i*2.6,2.9,1.1,2,1.8,'#f0ead4');}w.addEntry(id,g,'正交编码器 A/B','Quadrature encoder A/B',4);}
function screen(w:Workbench,g:T.Group,id:string,title:string,width:number,depth:number,z=0){const s=w.text(g,title,0,3.3,z,width,depth,'#a8d8c9','#20373d');state(w).screens.set(id,{ctx:s.ctx,map:s.map,previous:''});}
export function buildRobotPart(w:Workbench,id:string,g:T.Group):boolean{
 if(!robotPartNames[id])return false;
 if(id==='ranger'){
  w.box(g,21,1.2,13,0,1,0,0x456f80);w.text(g,'HC-SR04',0,1.7,4,13,3,'#e9e6d6');
  for(const x of [-5.6,5.6]){const shell=w.cylinder(g,4.2,5,x,5,-2,0xb7bcb5,24);shell.rotation.x=Math.PI/2;const grille=w.cylinder(g,3.5,.2,x,5,-4.6,0x4b5760,20);grille.rotation.x=Math.PI/2;}
  for(const [a,b] of [[1,2.2],[4.8,6],[6,7.7],[10.3,12]]){const lead=w.cylinder(g,.18,b-a,12,1.8,(a+b)/2,0xbcbeb1,6);lead.rotation.x=Math.PI/2;}
  const divider=new T.Group();divider.position.set(12,0,6);g.add(divider);w.box(divider,5,1,17,0,.6,0,0xded5bb);
  for(const [key,z,label,color] of [['echo-resistor-upper',-2.5,'2.2 kΩ',0xb86d51],['echo-resistor-lower',3,'3.3 kΩ',0xc39961]] as const){const r=new T.Group();r.position.set(0,0,z);divider.add(r);w.cylinder(r,.7,2.6,0,1.8,0,0xc7b58b,12).rotation.x=Math.PI/2;for(const band of [-.7,0,.7])w.cylinder(r,.72,.25,0,1.8,band,color,12).rotation.x=Math.PI/2;w.addEntry(key,r,label+' Echo 分压电阻',label+' Echo divider resistor',4);}
 }else if(id==='obstacle'){
  w.box(g,27,15,3,0,6,0,0xba9c79);w.box(g,29,.7,8,0,-1,0,0xc8bfa8);w.text(g,'DISTANCE',0,13.7,0,24,3,'#f2ecda');
 }else if(id==='driver'){
  w.box(g,30,1,28,0,.7,0,0x537b67);w.box(g,10,1.8,9,0,2,0,0x303641);for(let i=0;i<7;i++)for(const x of [-5.8,5.8])w.box(g,1.2,.3,.5,x,1.4,-3+i,0xc0bda5,false);w.text(g,'TB6612FNG',0,3,0,15,5,'#e6e9dc');w.text(g,'VM 5V · VCC 3V3',0,1.3,7,22,3,'#e6e9dc');
 }else if(id==='motor'){
  w.box(g,18,6,10,0,4,0,0xc4a454);w.cylinder(g,3,12,-7,4,0,0xb9bdb4,16).rotation.z=Math.PI/2;wheel(w,g,12,0,'wheel-left');encoder(w,g,'encoder-disc',1,-6);
 }else if(id==='chassis'){
  w.box(g,52,.7,54,0,-1,0,0xe5ddc8,false);w.text(g,'LOCAL TRACK  ·  1 m = 12 units',0,-.55,-23,44,3,'#8b8b76');
  const car=new T.Group();car.name='car-body';g.add(car);w.box(car,26,2,29,0,6,0,0x708b7b);w.box(car,18,2,12,0,8,-4,0x4d6970);w.text(car,'ESP32 ROBOT',0,9.1,-3,17,5,'#e5e2cf');
  wheel(w,car,-16,0,'wheel-left');wheel(w,car,16,0,'wheel-right');w.cylinder(car,2.5,3,0,3,12,0xb7beb0,12);
  const arrow=new T.Mesh(new T.ConeGeometry(2,5,3),w.mat('#d2b265'));arrow.position.set(0,8,-13);arrow.rotation.x=-Math.PI/2;car.add(arrow);encoder(w,car,'encoder-left',-8,9);encoder(w,car,'encoder-right',8,9);
  const material=new T.LineBasicMaterial({color:0x6c9c96,transparent:true,opacity:.8});const trail=new T.Line(new T.BufferGeometry(),material);trail.position.y=-.4;g.add(trail);state(w).trail=trail;
 }else if(id==='computer'){
  w.box(g,34,2,29,0,1,0,0xb7bcb4);screen(w,g,id,'UART HOST',31,23);w.text(g,'3.3V USB–UART',0,3.5,-10,29,3,'#9dcbc2');
 }else if(id==='phone'){
  w.box(g,19,2,33,0,1,0,0x363f4a);screen(w,g,id,'BLE CONTROLLER',16,27);w.cylinder(g,1,.1,0,2.2,14.7,0xb5bcb4,12);
 }else if(id==='peer'){
  w.box(g,24,1,39,0,1,0,0x35474c);w.box(g,16,2,14,0,2.5,-6,0xb9beb3);w.text(g,'ESP32\nESP-NOW',0,3.6,-6,15,11,'#4d605d');
  for(const x of [-10.5,10.5])for(let i=0;i<15;i++)w.cylinder(g,.35,3,x,2,-16+i*2.2,0xb9a260,6);screen(w,g,id,'PEER READY',17,10,9);for(let i=0;i<4;i++)w.box(g,12-i,.1,.3,0,1.6,-15+i,0xb9a260,false);
 }
 ports(w,g,id);return true;
}
export function setupRobotLinks(w:Workbench){
 const id=w.lesson.parts.includes('phone' as never)?'phone':w.lesson.parts.includes('peer' as never)?'peer':'';if(!id)return;
 const a=w.entries.get('board')!.group.position.clone().add(new T.Vector3(0,9,0)),b=w.entries.get(id)!.group.position.clone().add(new T.Vector3(0,9,0));
 const geometry=new T.BufferGeometry().setFromPoints([a,b]);const line=new T.Line(geometry,new T.LineDashedMaterial({color:0x75a49c,dashSize:2,gapSize:1.5,transparent:true,opacity:.6}));line.computeLineDistances();w.root.add(line);
 const packet=new T.Mesh(new T.SphereGeometry(1,10,10),new T.MeshBasicMaterial({color:0x4ba9a1}));w.root.add(packet);packet.visible=false;const v=state(w);v.packet=packet;v.radioLine=line;packet.userData.start=a;packet.userData.end=b;
}
export function updateRobotParts(w:Workbench,s:RobotSnapshot|undefined,time:number,values:Values){
 const v=state(w);const obstacle=w.entries.get('obstacle')?.group;
 if(obstacle&&!w.host.getAttribute('aria-busy')?.includes('true')){const origin=obstacle.userData.origin as T.Vector3|undefined;if(origin)obstacle.position.z=origin.z-(Math.max(2,Math.min(200,s?.distanceCm??Number(values.distance??60)))-60)*.12;}
 const motor=w.entries.get('motor')?.group;const chassis=w.entries.get('chassis')?.group;
 if(motor){const wheel=motor.getObjectByName('wheel-left');if(wheel)wheel.rotation.x=-(s?.angleLeft??0);}
 if(chassis){const body=chassis.getObjectByName('car-body')!;body.rotation.y=s?.heading??0;const left=body.getObjectByName('wheel-left')!,right=body.getObjectByName('wheel-right')!;left.rotation.x=-(s?.angleLeft??0);right.rotation.x=-(s?.angleRight??0);
  if(s&&time-v.lastSample>150){v.lastSample=time;v.points.push({x:s.x,y:s.y});if(v.points.length>100)v.points.shift();const points=v.points.map(p=>new T.Vector3(Math.max(-22,Math.min(22,-(p.y-s.y)*12)),0,Math.max(-22,Math.min(22,-(p.x-s.x)*12))));v.trail?.geometry.dispose();if(v.trail)v.trail.geometry=new T.BufferGeometry().setFromPoints(points.length>1?points:[new T.Vector3(),new T.Vector3()]);}
 }
 for(const root of [motor,chassis])root?.traverse(o=>{if(o.name==='encoder-A'||o.name==='encoder-B'){const on=o.name==='encoder-A'?s?.encoderA:s?.encoderB;const m=(o as T.Mesh).material as T.MeshStandardMaterial;m.color.set(on?'#82c8aa':'#375150');m.emissive.set(on?'#40826d':'#000000');}});
 const rightEncoder=w.entries.get('encoder-right')?.group;if(rightEncoder){const phase=((s?.ticksRight??0)%4+4)%4;for(const [name,on] of [['A',phase>=2],['B',phase===1||phase===2]] as const){const mesh=rightEncoder.getObjectByName('encoder-'+name) as T.Mesh;const mat=mesh.material as T.MeshStandardMaterial;mat.color.set(on?'#82c8aa':'#375150');mat.emissive.set(on?'#40826d':'#000000');}}
 for(const [id,screen] of v.screens){const title=id==='phone'?'BLE CONTROL':id==='peer'?'ESP-NOW PEER':'UART HOST';const content=[title,s?.link??'STOPPED',s?.response??'RUN TO START','TX '+(s?.txCount??0)+'   RX '+(s?.rxCount??0)].join('\n');if(content!==screen.previous){screen.previous=content;const {ctx,map}=screen;ctx.fillStyle='#20373d';ctx.fillRect(0,0,512,256);ctx.fillStyle='#b9ded0';ctx.textAlign='left';ctx.font='bold 31px monospace';content.split('\n').forEach((line,i)=>ctx.fillText(line.slice(0,29),16,38+i*59));map.needsUpdate=true;}}
 const count=(s?.txCount??0)+(s?.rxCount??0);if(count!==v.lastCount){v.lastCount=count;v.packetUntil=time+700;}
 if(v.packet){v.packet.visible=!!s&&time<v.packetUntil;v.packet.position.copy(v.packet.userData.start).lerp(v.packet.userData.end,(time%700)/700);}
 if(v.radioLine){const linked=!!s&&!/disconnect|stopped|timeout|lost|fail|offline/i.test(s.link);(v.radioLine.material as T.LineDashedMaterial).color.set(linked?'#579e90':'#b6ab95');}
}
