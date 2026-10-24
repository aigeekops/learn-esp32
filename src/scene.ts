import * as T from 'three';
import {buildLearningPart} from './learning-parts.ts';
import {buildRobotPart,robotPartNames,robotTerminals,resetRobotParts,setupRobotLinks,updateRobotParts} from './robot-parts.ts';
import {isRobotLesson} from './robot-shared.ts';
import { boardLeft,boardRight } from './lessons.ts';
import type { Lesson, Part, Values } from './lessons.ts';
import type { Snapshot } from './simulation.ts';
import {fitCamera} from './camera-fit.ts';
import {breadboard, holePosition, mountedLeads, jumperSockets, physicalJumpers} from './breadboard.ts';
interface Entry {group:T.Group; label:string; en:string; anchor:T.Vector3;}
const colors={ink:0x303647,pcb:0x303e46,metal:0xc2c4bc,cream:0xeee8d9,black:0x252a33,gold:0xb9a260};
export class Workbench{
 renderer:T.WebGLRenderer; scene=new T.Scene(); camera=new T.OrthographicCamera(); root=new T.Group();
 entries=new Map<string,Entry>(); pins=new Map<string,T.Vector3>(); lights:T.Mesh[]=[]; flows:{curve:T.CatmullRomCurve3;dots:T.Mesh[];part:string;pin:string;tube:T.Mesh;count:number}[]=[];
 angle=.65;elevation=.85;zoom=1;pan=new T.Vector3(); boardX=0; private pointer:{x:number;y:number;moved:boolean;mode:string;part:string|null}|null=null;
 private ray=new T.Raycaster(); private ndc=new T.Vector2(); private target=new T.Vector3(); private cameraDestination=new T.Vector3(); private cameraAim=new T.Vector3(); private last=0; private hovered=''; private selected=''; private ring=new T.Group();private hoverRing=new T.Group();
 private bounce?:{group:T.Group;baseY:number;start:number};private hoverHint:HTMLDivElement;private selectionLink:SVGSVGElement;
 private circuitBounds=[new T.Box3(new T.Vector3(-14,-2,-26),new T.Vector3(14,10,26))];private focusId='';private viewHeight=125;private desiredHeight=125;
 private assembly?:{start:number;board:T.Group;fromX:number;toX:number;incoming:{group:T.Object3D;position:T.Vector3;delay:number}[];outgoing:T.Group;duration:number};private materials:T.Material[]=[]; tags:HTMLDivElement; labelNodes=new Map<string,HTMLButtonElement>(); lesson!:Lesson; values:Values={};
 grid:T.GridHelper;private watermark:T.Mesh; settings={labels:true,grid:true,flow:true,autoRotate:false,reducedMotion:false};
 onSelect:(id:string)=>void; onInput:(key:string,v:number)=>void; onButton:(held:boolean)=>void;onKey:(index:number,held:boolean)=>void;
 constructor(public host:HTMLElement,callbacks:{select:(id:string)=>void;input:(key:string,v:number)=>void;button:(held:boolean)=>void;key:(index:number,held:boolean)=>void}){
  this.onSelect=callbacks.select;this.onInput=callbacks.input;this.onButton=callbacks.button;this.onKey=callbacks.key;
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0,0);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.domElement.setAttribute('aria-label','交互式 ESP32 3D 视图：拖动平移，Q/E 旋转，滚轮缩放');this.renderer.domElement.setAttribute('role','img');this.renderer.domElement.tabIndex=0;this.host.append(this.renderer.domElement);
  this.scene.add(this.root,new T.HemisphereLight(0xfffcf2,0xb6a68b,2));
  const sun=new T.DirectionalLight(0xfff6e8,2.3);sun.position.set(-60,110,-40);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:300});sun.shadow.bias=-.001;sun.shadow.normalBias=.1;this.scene.add(sun);
  const ground=new T.Mesh(new T.PlaneGeometry(600,600),new T.ShadowMaterial({opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-2;ground.receiveShadow=true;this.scene.add(ground);
  this.grid=new T.GridHelper(600,150,0xbdb6a5,0xd0c7b5);this.grid.position.y=-1.9;this.grid.material.transparent=true;this.grid.material.opacity=.42;this.grid.material.depthWrite=false;this.scene.add(this.grid);this.scene.fog=new T.FogExp2(0xf3eedf,.0035);
  this.watermark=this.desktopWatermark();this.scene.add(this.watermark);
  this.tags=document.createElement('div');this.tags.className='scene-tags';this.host.append(this.tags);
  this.ring=this.makeRing(.8);this.hoverRing=this.makeRing(.35);this.scene.add(this.ring,this.hoverRing);
  this.hoverHint=document.createElement('div');this.hoverHint.className='component-tooltip';this.hoverHint.setAttribute('role','tooltip');this.hoverHint.hidden=true;this.host.append(this.hoverHint);
  this.selectionLink=document.createElementNS('http://www.w3.org/2000/svg','svg');this.selectionLink.classList.add('selection-link');this.selectionLink.setAttribute('aria-hidden','true');this.selectionLink.innerHTML='<path/><circle r="5"/>';this.selectionLink.style.display='none';this.host.append(this.selectionLink);
  this.host.addEventListener('pointerleave',()=>this.setHover(''));
  this.host.addEventListener('pointerdown',e=>this.down(e));
  window.addEventListener('pointermove',e=>this.move(e));window.addEventListener('pointerup',()=>this.up());window.addEventListener('pointercancel',()=>this.cancel());window.addEventListener('blur',()=>this.cancel());
  this.host.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.4,Math.min(5,this.zoom*Math.exp(-e.deltaY*.001)));this.updateCamera();},{passive:false});
  this.host.addEventListener('dblclick',e=>{const id=this.pick(e.clientX,e.clientY,false);if(id)this.focus(id);else this.reset();});
  this.host.addEventListener('contextmenu',e=>e.preventDefault());
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();
 }
 private desktopWatermark(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#a99c82';ctx.font='600 88px "PingFang SC", "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('公众号 · 极客行动',512,80);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=this.renderer.capabilities.getMaxAnisotropy();
  const mesh=new T.Mesh(new T.PlaneGeometry(64,10),new T.MeshBasicMaterial({map,transparent:true,opacity:.55,depthWrite:false}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(5,-1.85,49);return mesh;
 }
 mat(color:T.ColorRepresentation,metal=0){const m=new T.MeshStandardMaterial({color,roughness:.65,metalness:metal,flatShading:true});this.materials.push(m);return m;}
 box(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:T.ColorRepresentation,outline=true){
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),this.mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  if(outline){const edge=new T.LineSegments(new T.EdgesGeometry(mesh.geometry),new T.LineBasicMaterial({color:colors.ink,transparent:true,opacity:.55}));mesh.add(edge);}return mesh;
 }
 cylinder(g:T.Object3D,r:number,h:number,x:number,y:number,z:number,color:T.ColorRepresentation,segments=16){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,segments),this.mat(color));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
 text(g:T.Object3D,text:string,x:number,y:number,z:number,w:number,d:number,color='#e6e9dc',background?:string){
  const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d')!;if(background){ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);}ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 65px monospace';text.split('\n').forEach((line,i,all)=>ctx.fillText(line,256,128+(i-(all.length-1)/2)*72));
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  const mesh=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);g.add(mesh);return {mesh,ctx,map};
 }
 addEntry(id:string,group:T.Group,label:string,en:string,y=6){group.userData.part=id;this.entries.set(id,{group,label,en,anchor:new T.Vector3(0,y,0)});return group;}
 board(){
  const g=new T.Group();g.position.x=this.boardX;this.root.add(g);
  this.box(g,28,1.5,51,0,0,0,colors.pcb);
  for(const x of [-10.6,10.6])for(const z of [-21.8,21.8]){const ring=new T.Mesh(new T.TorusGeometry(1,.3,6,18),this.mat(colors.gold));ring.rotation.x=Math.PI/2;ring.position.set(x,.85,z);g.add(ring);this.cylinder(g,.57,.1,x,1,z,0x3c4148);}
  const shield=new T.Group();shield.position.set(0,0,8);g.add(shield);const lid=this.box(shield,18,2.6,17.5,0,2.2,0,0xb8bdb6);(lid.material as T.MeshStandardMaterial).metalness=.45;(lid.material as T.MeshStandardMaterial).roughness=.42;
  for(const x of [-8.3,8.3])for(let z=-7;z<=7;z+=2)this.box(shield,.6,.15,.75,x,3.58,z,0xd7d9cf,false);this.text(shield,'ESPRESSIF\nESP32-WROOM-32E\nWi-Fi + BT',0,3.55,0,16,12,'#535b5c');this.addEntry('module',shield,'ESP32 模组','ESP32 module',5);
  const antenna=new T.Group();antenna.position.set(0,0,20.5);g.add(antenna);this.box(antenna,18,.45,6.8,0,1.15,0,0x262b31,false);
  for(let i=0;i<5;i++){this.box(antenna,13-i*1.4,.06,.3,1,1.42,-2.5+i*1.1,0xb9a061,false);this.box(antenna,.3,.06,1.3,i%2?7:-5,1.42,-2.5+i*1.1,0xb9a061,false);}this.addEntry('antenna',antenna,'PCB 天线','PCB antenna',3);
  const usb=new T.Group();usb.position.set(0,0,-23);g.add(usb);this.box(usb,8,3.3,5,0,2,0,0xbcbfb7);this.box(usb,6,1.6,.2,0,2,-2.6,0x202936);this.box(usb,4,.3,.25,0,1.9,-2.75,0xd4c9a2,false);this.addEntry('usb',usb,'USB 接口','USB port',5);
  for(const [id,x,label,en] of [['reset',-8,'EN 复位','EN reset'],['boot',8,'BOOT 按键','BOOT button']] as const){
   const b=new T.Group();b.position.set(x,0,-17);g.add(b);this.box(b,4.5,1.8,4.5,0,1.9,0,0xbec1b7);this.cylinder(b,1.5,1.1,0,3.2,0,0x30323a);this.text(g,id==='reset'?'EN':'BOOT',x,.83,-13,4,2);this.addEntry(id,b,label,en,4);
  }
  const uart=new T.Group();uart.position.set(0,0,-11);g.add(uart);this.box(uart,5,.8,6,0,1.3,0,0x282d37);for(let i=0;i<5;i++){this.box(uart,.8,.25,.4,-3.2,1.1,-2+i,0xc0bca8,false);this.box(uart,.8,.25,.4,3.2,1.1,-2+i,0xc0bca8,false);}this.addEntry('uart',uart,'USB 转串口芯片','USB-to-UART bridge',3);
  const regulator=new T.Group();regulator.position.set(-8,0,-10);g.add(regulator);this.box(regulator,3.4,.9,3.5,0,1.3,0,0x353941);this.box(regulator,2,.18,1.2,0,1.25,2.1,colors.metal,false);for(const x of [-1,0,1])this.box(regulator,.5,.2,1.2,x,1.1,-2.1,colors.metal,false);this.addEntry('regulator',regulator,'3.3 V 稳压器','3.3 V regulator',3);
  for(let i=0;i<9;i++){const part=new T.Group();part.position.set((i%3-1)*6,0,-6+Math.floor(i/3)*3);g.add(part);this.box(part,1.5,.6,.9,0,1.25,0,i%2?0xa99b7c:0x383c44,false);this.addEntry('board-'+(i%2?'capacitor-':'resistor-')+i,part,(i%2?'贴片电容 ':'贴片电阻 ')+(i+1),(i%2?'SMD capacitor ':'SMD resistor ')+(i+1),2);}
  for(const [i,x] of [-6,6].entries()){const capacitor=new T.Group();capacitor.position.set(x,0,-7);g.add(capacitor);this.cylinder(capacitor,i?1.3:1.8,i?2.7:2,0,2.1,0,i?0x373d49:0xa5aaa8);this.addEntry('capacitor-'+i,capacitor,'滤波电容 '+(i+1),'Filter capacitor '+(i+1),4);}
  const powerLed=new T.Group();powerLed.position.set(5,0,-4);g.add(powerLed);const pow=this.box(powerLed,1.3,.7,1.8,0,1.7,0,0xbf4741);(pow.material as T.MeshStandardMaterial).emissive.set('#b43d35');(pow.material as T.MeshStandardMaterial).emissiveIntensity=.65;this.addEntry('power-led',powerLed,'供电指示灯','Power indicator',3);
  for(const [names,x] of [[boardLeft,-13],[boardRight,13]] as const){
   this.box(g,2.5,2.6,47,x,-.5,0,0x282b33);
   names.forEach((name,i)=>{
    const z=22.5-i*2.5;const pinGroup=new T.Group();pinGroup.position.set(x,0,z);g.add(pinGroup);this.cylinder(pinGroup,.46,6.5,0,1,0,colors.gold,6);
    this.text(g,name,x<0?-9.7:9.7,.81,z,3,1.55,'#ece9cd');
    const pinId=name==='TX'?'1':name==='RX'?'3':name==='VP'?'36':name==='VN'?'39':name;
    const duplicates=[...this.entries.keys()].filter(id=>id==='pin-'+pinId||id.startsWith('pin-'+pinId+'-')).length;
    const id='pin-'+pinId+(duplicates?'-'+duplicates:'');const label=Number.isFinite(Number(pinId))?'GPIO '+pinId:pinId;
    if(!this.pins.has(pinId))this.pins.set(pinId,new T.Vector3(this.boardX+x,4.3,z));this.addEntry(id,pinGroup,label,label,5);
    const hit=new T.Mesh(new T.CylinderGeometry(.95,.95,6.5,8),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.position.y=1;hit.userData.hitArea=true;pinGroup.add(hit);
   });
  }
  for(const x of [-7.5,7.5]){this.box(g,.15,.03,16,x,.79,5,0x7b877c,false);for(let i=0;i<5;i++)this.box(g,1.2,.03,.15,x+Math.sign(x)*.5,.8,-1+i*3,0x869082,false);}
  this.text(g,'ESP32 DEVKITC',0,.84,-4,13,2.3);this.text(g,'3.3V LOGIC',0,.84,-1.8,11,1.9,'#bcc5bc');
  this.addEntry('board',g,'ESP32 开发板','ESP32 board',3);
  const power=new T.Group();power.position.set(-13,1,22);g.add(power);this.addEntry('power',power,'3V3 / GND','3V3 / GND',4);
 }
 private oledTexture:{ctx:CanvasRenderingContext2D;map:T.CanvasTexture}|null=null;
 private oledContent='';
 private browserTexture:{ctx:CanvasRenderingContext2D;map:T.CanvasTexture}|null=null;private browserContent='';
 breadboard(){
  const g=new T.Group();g.position.set(breadboard.x,0,breadboard.z);this.root.add(g);
  this.box(g,43,1.5,77,0,-.45,0,0xe7e4d8);
  for(const x of [-10.9,10.9])this.box(g,21.2,.5,75,x,.55,0,0xeeeadd,false);
  this.box(g,1.2,.08,72,0,.34,0,0xb7b4a9,false);
  const geom=new T.PlaneGeometry(.62,.62),mat=new T.MeshStandardMaterial({color:0x515654,roughness:1});
  const holes=new T.InstancedMesh(geom,mat,breadboard.rows*10);let k=0;const m=new T.Matrix4();
  for(let row=0;row<breadboard.rows;row++)for(let col=0;col<10;col++){
   const [x,y,z]=holePosition({row,col});m.makeRotationX(-Math.PI/2);m.setPosition(x-breadboard.x,y+.008,z-breadboard.z);holes.setMatrixAt(k++,m);
  }g.add(holes);
  for(let col=0;col<10;col++){const [x]=holePosition({row:0,col});this.text(g,'abcdefghij'[col],x-breadboard.x,.82,-36.5,1.8,1.7,'#777d76');}
  for(let row=0;row<breadboard.rows;row++){const z=holePosition({row,col:0})[2]-breadboard.z;this.text(g,String(row+1),-16,.82,z,1.7,1.3,'#777d76');}
  if(this.lesson.parts.some(p=>['ldr','soil','piano'].includes(p))){
   const ground=holePosition(jumperSockets['breadboard.ground0']),power=holePosition(jumperSockets['breadboard.power4']);
   this.text(g,'GND',ground[0]-breadboard.x,1.03,ground[2]-breadboard.z-2.6,9,2,'#58635c');
   if(this.lesson.parts.some(p=>['ldr','soil','oled','pot','sensor'].includes(p)))this.text(g,'3V3',power[0]-breadboard.x,1.03,power[2]-breadboard.z+2.6,9,2,'#b46e58');
  }
  if(isRobotLesson(this.lesson.id)){for(const [label,row,col,color] of [['GND',26,0,'#58635c'],['3V3',27,9,'#b46e58'],['5V',24,9,'#aa8a51']] as const){const point=holePosition({row,col});this.text(g,label,point[0]-breadboard.x,1.03,point[2]-breadboard.z+(label==='5V'?-2.5:2.3),8,2,color);}}
  this.addEntry('breadboard',g,'面包板','Breadboard',2);return g;
 }
 private lead(g:T.Object3D,points:T.Vector3[],radius=.16){
  const path=new T.CurvePath<T.Vector3>();for(let i=1;i<points.length;i++)path.add(new T.LineCurve3(points[i-1],points[i]));
  const mesh=new T.Mesh(new T.TubeGeometry(path,24,radius,8,false),this.mat(colors.metal,.5));mesh.castShadow=true;g.add(mesh);
 }
 private mountedLight(id:'led'|'rgb'){
  const keys=id==='led'?['anode','GND']:['R','GND','G','B'];
  const contacts=keys.map(key=>new T.Vector3(...holePosition(mountedLeads[id+'.'+key])));
  const center=contacts[0].clone().lerp(contacts[contacts.length-1],.5);center.y=0;
  const g=new T.Group();g.position.copy(center);this.root.add(g);this.addEntry(id,g,id==='led'?'5 mm LED':'RGB LED',id==='led'?'5 mm LED':'RGB LED',9);
  contacts.forEach((contact,i)=>{const foot=contact.clone().sub(center);const neckZ=id==='led'?(i===0?-1:1):(i-1.5)*1.1;
   this.lead(g,[new T.Vector3(0,4.5,neckZ),new T.Vector3(0,2.1,foot.z),new T.Vector3(foot.x,.55,foot.z)]);
  });
  const lens=this.cylinder(g,2,3.8,0,6.3,0,id==='led'?0xe56b57:0xbba8d0,24);this.lights.push(lens);(lens.material as T.MeshStandardMaterial).roughness=.23;
  const dome=new T.Mesh(new T.SphereGeometry(2,24,16,0,Math.PI*2,0,Math.PI/2),this.mat(id==='led'?0xd54e42:0xe6d0f1));dome.position.y=8.2;g.add(dome);this.lights.push(dome);
  this.cylinder(g,2.4,.5,0,4.5,0,0x843e43);
  const channels=id==='led'?[['resistorIn','resistorOut']]:[['resistor23','out23'],['resistor19','out19'],['resistor18','out18']];
  channels.forEach(([input,output])=>{
   const a=new T.Vector3(...holePosition(mountedLeads[id+'.'+input])),b=new T.Vector3(...holePosition(mountedLeads[id+'.'+output]));
   const r=new T.Group();r.position.copy(a.clone().lerp(b,.5));r.position.y=0;
   this.root.add(r);const channel=input.slice('resistor'.length);this.addEntry(id==='led'?'resistor':'rgb-resistor-'+channel,r,id==='led'?'限流电阻':({'23':'红色','19':'绿色','18':'蓝色'}[channel]??'')+'限流电阻',id==='led'?'Resistor':'RGB '+channel+' resistor',3);
   const body=this.cylinder(r,.75,4.5,0,2.4,0,0xc7b58b,16);body.rotation.z=Math.PI/2;
   [-1,0,1].forEach((x,i)=>{const band=this.cylinder(r,.77,.35,x,2.4,0,[0xbf753d,0xbf753d,0x765038][i],16);band.rotation.z=Math.PI/2;band.name='resistor-band-'+i;});
   for(const sign of [-1,1])this.lead(r,[new T.Vector3(sign*2.25,2.4,0),new T.Vector3(sign*5.6,2.4,0),new T.Vector3(sign*6.35,1.65,0),new T.Vector3(sign*6.35,.55,0)]);
  });
  return g;
 }
 part(id:Part,x:number,z:number){
  if(id==='led'||id==='rgb')return this.mountedLight(id);
  if(id==='pot'){const p=holePosition(mountedLeads['pot.signal']);x=p[0]+4;z=p[2];}
  const g=new T.Group();g.position.set(x,1.6,z);this.root.add(g);
  const names:Record<string,[string,string]>={led:['5 mm LED','5 mm LED'],button:['按钮','Button'],pot:['电位器','Potentiometer'],rgb:['RGB LED','RGB LED'],sensor:['TMP36 温度','TMP36'],oled:['OLED 屏幕','OLED'],buzzer:['蜂鸣器','Piezo'],servo:['舵机','Servo'],router:['路由器','Router'],browser:['设备网页','Device webpage'],ldr:['光敏分压模块','LDR divider'],lamp:['台灯','Desk lamp'],piano:['八键钢琴','Eight-key piano'],soil:['土壤传感器','Soil sensor'],plant:['智能植物','Smart plant'],watering:['洒水壶','Watering can']};
  this.addEntry(id,g,...(robotPartNames[id]??names[id]),id==='plant'?32:id==='soil'?30:id==='lamp'?24:6);
  if(buildRobotPart(this,id,g)||buildLearningPart(this,id,g))return g;
  if(id==='button'){
   this.box(g,7,2.5,7,0,1.2,0,0x393e48);this.box(g,6.4,.35,6.4,0,2.6,0,0xa9adac);this.cylinder(g,2.3,1.6,0,3.6,0,0xb85545);
   for(const a of [-3.7,3.7])for(const b of [-2,2])this.box(g,1.7,.3,.7,a,0,b,0xb7b5a8,false);
  }else if(id==='pot'){
   this.box(g,7,3,8,0,1,0,0x38526b);this.cylinder(g,3,1.4,0,3,0,0xafb1ab);const knob=this.cylinder(g,2.9,5.5,0,5,0,0x353941,18);knob.name='knob';const marker=this.box(g,.5,.1,2.1,0,7.8,-1,0xe5e0ce,false);marker.name='marker';for(let i=-1;i<=1;i++)this.lead(g,[new T.Vector3(-3.2,.8,i*2.54),new T.Vector3(-4,.8,i*2.54),new T.Vector3(-4,-1.05,i*2.54)]);
  }else if(id==='sensor'){
   this.box(g,4.5,5,2.8,0,3,0,0x303540);this.cylinder(g,2.1,4.5,0,3,.5,0x303540,12);
   for(let i=-1;i<=1;i++)this.cylinder(g,.2,4,i*1.7,.5,0,colors.metal,6);
   this.text(g,'TMP36',0,5.7,0,4,2,'#e7e5cf');
  }else if(id==='oled'){
   this.box(g,25,1.1,20,0,1,0,0x3e6172);this.box(g,22,.7,14,0,2,-1,0x222b33);const screen=this.text(g,'',0,2.45,-1,20,12,'#b9e4e4','#17282c');this.oledTexture={ctx:screen.ctx,map:screen.map};this.oledContent='';
   for(let i=0;i<4;i++)this.cylinder(g,.35,3,-4.5+i*3,2,8,colors.gold,6);
   this.text(g,'GND VCC SCL SDA',0,1.61,8.7,22,2);
  }else if(id==='buzzer'){
   this.cylinder(g,4.1,4.6,0,3,0,0x303641,22);this.cylinder(g,.8,.06,0,5.35,0,0x111924,12);this.text(g,'+',2,5.38,-1,2,2,'#e4e0ca');
   for(const x of [-2,2])this.cylinder(g,.2,3,x,.8,0,colors.metal,8);
  }else if(id==='servo'){
   this.box(g,9,12,15,0,6,0,0x416897);this.cylinder(g,4,4,0,13,-2,0x3a5881);const arm=new T.Group();arm.name='arm';g.add(arm);this.box(arm,2.5,1,17,0,15,-2,0xe1dfd2);this.cylinder(arm,2.5,1.1,0,15,-2,0xd5d4cc);
   this.text(g,'5V EXT',0,12.1,4,7,4);
  }else if(id==='router'){
   this.box(g,19,3,13,0,2,0,0xdddcd0);
   for(let i=0;i<3;i++)this.box(g,1,.25,1,-4+i*3,3.7,-3,0x619d89,false);
   for(const xx of [-7,7])this.cylinder(g,.55,14,xx,9,4,0x393f48,8);
   this.text(g,'Wi-Fi  2.4G',0,3.6,0,14,5,'#56615f');
  }else if(id==='browser'){
   this.box(g,28,1,23,0,1,0,0xb3b7b2);const screen=this.text(g,'ESP32\nDEVICE WEBPAGE',0,1.7,0,26,21,'#467d7f','#f0ecdf');this.browserTexture={ctx:screen.ctx,map:screen.map};this.browserContent='';
  }
  return g;
 }
 wire(from:T.Vector3,to:T.Vector3,color:string,part:string,pin:string){
  // Route RGB/LED signal jumpers around the rear of the breadboard, away from the lenses.
  const routed=(part==='led'||part==='rgb')&&pin!=='GND';
  const middle=from.clone().lerp(to,.5);middle.y=routed?9:10;
  if(routed)middle.z=-40-(pin==='19'?2:pin==='18'?4:0);
  if((part==='led'||part==='rgb')&&pin==='GND'){middle.z=Math.max(from.z,to.z)+10;middle.y=4;}
  const curve=new T.CatmullRomCurve3([from,from.clone().add(new T.Vector3(0,3,0)),middle,to.clone().add(new T.Vector3(0,3,0)),to]);
  const tube=new T.Mesh(new T.TubeGeometry(curve,24,.28,6,false),this.mat(color));tube.castShadow=true;tube.userData.wire=true;this.root.add(tube);
  const dots:T.Mesh[]=[];for(let i=0;i<3;i++){const dot=new T.Mesh(new T.SphereGeometry(.5,6,6),new T.MeshBasicMaterial({color:0xf4dba0}));this.root.add(dot);dots.push(dot);}this.flows.push({curve,dots,part,pin,tube,count:tube.geometry.index!.count});
 }
 setLesson(l:Lesson,values:Values){
  this.setHover('');this.finishAssembly();this.cancel();this.select('');
  const board=this.entries.get('board')?.group,fromX=board?.position.x??0;
  const boardEntries=[...this.entries].filter(([,entry])=>{let node:T.Object3D|null=entry.group;while(node){if(node===board)return true;node=node.parent;}return false;});
  const pins=new Map(this.pins),previousX=this.boardX,outgoing=new T.Group();
  for(const child of [...this.root.children])if(child!==board)outgoing.add(child);
  this.scene.add(outgoing);this.root.clear();this.entries.clear();this.pins.clear();this.lights=[];this.flows=[];this.materials=[];this.oledTexture=null;this.browserTexture=null;this.selected='';this.lesson=l;this.values=values;resetRobotParts(this);this.boardX=l.parts.length?-28:0;
  if(board){board.position.x=this.boardX;this.root.add(board);for(const [id,e] of boardEntries)this.entries.set(id,e);for(const [id,p] of pins)this.pins.set(id,p.clone().add(new T.Vector3(this.boardX-previousX,0,0)));}
  else this.board();
  if(isRobotLesson(l.id)||l.parts.some(p=>!['router','browser','plant','watering','lamp','soil','piano'].includes(p)))this.breadboard();
  const positions:Record<string,[number,number]>={led:[14,-8],rgb:[14,-8],button:[27,7],pot:[25,16],sensor:[11,10],oled:[37,18],buzzer:[31,-13],servo:[25,0],router:[20,40],browser:[46,-35],ldr:[29,8],lamp:[60,-3],piano:[35,0],soil:[59,9],plant:[64,9],watering:[57,35]};
  if(l.parts.length===1&&!['router','browser'].includes(l.parts[0]))positions[l.parts[0]]=[24,0];
  if(l.id==='display'){positions.oled=[29,2];positions.sensor=[13,-14];}
  if(l.id==='pwm'){positions.rgb=[20,-10];}
  if(l.id==='piano')positions.buzzer=[32,20];
  if(l.id==='plant'||l.id==='project'){positions.oled=[28,16];positions.buzzer=[39,-15];positions.router=[4,43];}
  if(isRobotLesson(l.id))Object.assign(positions,{ranger:[72,-32],obstacle:[72,-67],driver:[68,-28],motor:[67,12],chassis:[84,18],computer:[-7,-53],phone:[-25,44],peer:[-25,44]});
  if(l.id==='robot'){positions.ranger=[108,-38];positions.obstacle=[108,-73];}
  for(const id of l.parts){const [x,z]=positions[id];const group=this.part(id,x,z);group.userData.origin=group.position.clone();}
  if(l.parts.some(p=>['servo','driver','ranger'].includes(p))){
   const supply=new T.Group();supply.position.set(isRobotLesson(l.id)?23:43,1.5,isRobotLesson(l.id)?47:-16);this.root.add(supply);
   this.box(supply,12,5,13,0,2,0,0x656f73);this.text(supply,'5 V DC\n+    −',0,4.6,0,11,10,'#f0ead4');this.addEntry('supply',supply,'独立 5 V 电源','Separate 5 V supply');
  }
  for(const net of physicalJumpers(l)){const part=(net.from.startsWith('board.')?net.to:net.from).split('.')[0],pin=net.to.endsWith('.groundBranch')?'GND':(net.from.startsWith('board.')?net.from:net.to).split('.')[1];this.wire(this.terminal(net.from),this.terminal(net.to),net.color,part,pin);}
  setupRobotLinks(this);
  this.tags.innerHTML='<svg class="tag-leaders" aria-hidden="true"></svg>';this.labelNodes.clear();
  const ids:string[]=l.parts.length?[...l.parts,...l.pins.filter(p=>p.target!=='board').slice(0,isRobotLesson(l.id)?3:l.id==='piano'?2:99).map(p=>'pin-'+p.pin),...(l.parts.includes('led')?['resistor']:[]),...(l.parts.some(p=>['servo','driver','ranger'].includes(p))?['supply']:[])]:['usb','module','board','power','reset','boot'];
  for(const id of new Set(ids))this.addTag(id);
  this.circuitBounds=this.meshBounds(this.root);
  this.watermark.position.set(l.parts.length?5:0,-1.85,l.parts.length?49:35);
  this.reset();
  const incoming=this.root.children.filter(o=>o instanceof T.Group&&o!==this.entries.get('board')!.group).map((group,i)=>({group,position:group.position.clone(),delay:250+i*65}));
  const duration=Math.max(650,...incoming.map(p=>p.delay+450),...this.flows.map((_,i)=>800+i*Math.min(55,550/Math.max(1,this.flows.length))+420));
  this.assembly={start:performance.now(),board:this.entries.get('board')!.group,fromX:board?fromX:this.boardX,toX:this.boardX,incoming,outgoing,duration};
  this.host.setAttribute('aria-busy','true');this.animateAssembly(0);
 }
 private disposeGroup(group:T.Group){
  group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material]){(material as T.MeshBasicMaterial).map?.dispose();material.dispose();}}});
  group.removeFromParent();group.clear();
 }
 private finishAssembly(){
  const a=this.assembly;if(!a)return;
  a.board.position.x=a.toX;
  for(const item of a.incoming){item.group.position.copy(item.position);item.group.scale.setScalar(1);item.group.visible=true;}
  for(const wire of this.flows)wire.tube.geometry.setDrawRange(0,wire.count);
  this.disposeGroup(a.outgoing);this.assembly=undefined;this.tags.style.opacity='1';this.host.setAttribute('aria-busy','false');
 }
 private animateAssembly(elapsed:number){
  const a=this.assembly;if(!a)return;
  if(this.settings.reducedMotion||elapsed>=a.duration){this.finishAssembly();return;}
  const progress=(time:number,duration:number)=>Math.max(0,Math.min(1,time/duration));
  const smooth=(t:number)=>1-Math.pow(1-t,3);
  a.board.position.x=a.fromX+(a.toX-a.fromX)*smooth(progress(elapsed,650));
  for(const old of a.outgoing.children){
   if(old.userData.wire){const mesh=old as T.Mesh;mesh.geometry.setDrawRange(0,Math.floor(mesh.geometry.index!.count*(1-smooth(progress(elapsed,300)))/3)*3);}
   else{old.visible=elapsed<450;if(old instanceof T.Group)old.scale.setScalar(1-smooth(progress(elapsed-100,350)));}
  }
  for(const {group,position,delay} of a.incoming){const p=smooth(progress(elapsed-delay,450));group.visible=p>0;group.position.copy(position);group.position.y+=(1-p)*15;group.scale.setScalar(.8+.2*p);}
  this.flows.forEach((wire,i)=>{const p=smooth(progress(elapsed-800-i*Math.min(55,550/Math.max(1,this.flows.length)),420));wire.tube.geometry.setDrawRange(0,Math.floor(wire.count*p/3)*3);for(const dot of wire.dots)dot.visible=false;});
  this.tags.style.opacity=String(progress(elapsed-(a.duration-250),250));
 }
 terminal(endpoint:string):T.Vector3{
  const [part,pin]=endpoint.split('.');
  if(part==='board'){const position=this.pins.get(pin);if(!position)throw new Error('Unknown board pin '+pin);return position.clone();}
  const socket=jumperSockets[endpoint];if(socket)return new T.Vector3(...holePosition(socket));
  const terminals:Record<string,Record<string,[number,number,number]>>={
   button:{signal:[-4.4,0,-2],GND:[4.4,0,-2]},
   ldr:{VCC:[-2,2.5,7],signal:[0,2.5,7],GND:[2,2.5,7]},
   soil:{VCC:[-2,30,0],signal:[0,30,0],GND:[2,30,0]},
   piano:{...Object.fromEntries(Array.from({length:8},(_,i)=>['key'+i,[-26.25+i*7.5,2,-8.5] as [number,number,number]])),GND:[30,2,-8.5]},
   sensor:{VCC:[-1.7,-1.5,0],signal:[0,-1.5,0],GND:[1.7,-1.5,0]},
   oled:{GND:[-4.5,3.5,8],VCC:[-1.5,3.5,8],SCL:[1.5,3.5,8],SDA:[4.5,3.5,8]},
   buzzer:{signal:[2,-.7,0],GND:[-2,-.7,0]},servo:{signal:[-4,1,-6],VCC:[-4,1,-4],GND:[-4,1,-2]},
   supply:{positive:[-4,4.6,-4],negative:[4,4.6,-4]}
  };
  const position=(robotTerminals[part]??terminals[part])?.[pin],entry=this.entries.get(part);
  if(!position||!entry)throw new Error('Unknown terminal '+endpoint);
  return entry.group.position.clone().add(new T.Vector3(...position));
 }
 private addTag(id:string){
  const entry=this.entries.get(id);if(!entry||this.labelNodes.has(id))return;
  const b=document.createElement('button');b.className='scene-tag';b.dataset.part=id;b.innerHTML='<i></i><span></span>';b.querySelector('span')!.textContent=entry.label;b.setAttribute('aria-pressed','false');
  b.addEventListener('click',e=>{e.stopPropagation();this.onSelect(id);});
  b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')this.setHover(id);});b.addEventListener('pointerleave',()=>this.setHover(''));
  b.addEventListener('focus',()=>this.setHover(id));b.addEventListener('blur',()=>this.setHover(''));
  this.tags.append(b);this.labelNodes.set(id,b);const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.dataset.leader=id;this.tags.querySelector('svg')!.append(line);
 }
 private makeRing(opacity:number){
  const group=new T.Group();for(const [inner,outer] of [[1,1.045],[1.14,1.16]]){const ring=new T.Mesh(new T.RingGeometry(inner,outer,64),new T.MeshBasicMaterial({color:0x319c9b,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;group.add(ring);}group.visible=false;return group;
 }
 private restoreBounce(){if(this.bounce)this.bounce.group.position.y=this.bounce.baseY;}
 private animateHover(time:number){
  const b=this.bounce;if(!b)return;const progress=Math.max(0,Math.min(1,(time-b.start)/520));
  b.group.position.y=b.baseY+(this.settings.reducedMotion?0:Math.sin(progress*Math.PI)*Math.pow(1-progress,.5)*1.6);
  if(progress>=1||this.settings.reducedMotion){b.group.position.y=b.baseY;this.bounce=undefined;}
 }
 private setHover(id:string){
  if(this.assembly)id='';if(id===this.hovered)return;
  this.restoreBounce();this.bounce=undefined;this.hovered=id;this.host.dataset.hoveredPart=id;
  this.labelNodes.forEach((node,key)=>node.classList.toggle('hovered',key===id));
  const e=this.entries.get(id);this.hoverHint.hidden=!e;this.hoverRing.visible=!!e;
  if(e&&!this.settings.reducedMotion)this.bounce={group:e.group,baseY:e.group.position.y,start:performance.now()};
 }
 select(id:string){
  this.restoreBounce();this.bounce=undefined;this.selected=id;this.host.dataset.selectedPart=id;
  this.addTag(id);this.labelNodes.forEach((node,key)=>{node.classList.toggle('selected',key===id);node.setAttribute('aria-pressed',String(key===id));});
  this.ring.visible=!!this.entries.get(id);if(!id)this.selectionLink.style.display='none';
 }
 showSelection(id:string){
  this.finishAssembly();this.select(id);
  // Preserve the current zoom. Only pan enough to uncover the selected object.
  const entry=this.entries.get(id);if(!entry)return;this.camera.updateMatrixWorld();
  const p=entry.group.localToWorld(entry.anchor.clone()).project(this.camera),frame=this.frameArea(),w=this.host.clientWidth,h=this.host.clientHeight;
  const x=(p.x+1)*w/2,y=(1-p.y)*h/2;
  const tx=Math.max(frame.left+16,Math.min(frame.right-16,x)),ty=Math.max(frame.top+16,Math.min(frame.bottom-16,y));
  const amount=this.desiredHeight/h;
  const right=new T.Vector3(Math.cos(this.angle),0,-Math.sin(this.angle)),up=new T.Vector3(-Math.sin(this.elevation)*Math.sin(this.angle),Math.cos(this.elevation),-Math.sin(this.elevation)*Math.cos(this.angle));
  this.target.copy(this.cameraAim).addScaledVector(right,(x-tx)*amount).addScaledVector(up,(ty-y)*amount);
  const plan=fitCamera(this.viewBounds(),this.angle,this.elevation,frame);
  this.pan.copy(this.target).sub(new T.Vector3(plan.target.x,plan.target.y,plan.target.z));this.zoom=plan.height/this.desiredHeight;
  this.cameraDestination.copy(this.target).add(new T.Vector3(Math.sin(this.angle)*130*Math.cos(this.elevation),Math.sin(this.elevation)*130,Math.cos(this.angle)*130*Math.cos(this.elevation)));
 }
 private drawInteraction(english:boolean){
  for(const [id,ring] of [[this.selected,this.ring],[this.hovered,this.hoverRing]] as const){
   const e=this.entries.get(id);ring.visible=!!e&&!this.assembly;if(!e)continue;
   const box=new T.Box3().setFromObject(e.group),center=e.group.getWorldPosition(new T.Vector3());let radius=2.4,y=center.y+1;
   if(!box.isEmpty()){box.getCenter(center);const size=box.getSize(new T.Vector3());radius=Math.max(1.6,Math.min(24,Math.hypot(size.x,size.z)*.55));y=Math.max(-1.8,box.min.y+.12);}
   if(id.startsWith('pin-'))y=1.02;ring.position.set(center.x,y,center.z);ring.scale.setScalar(radius);
  }
  const hovered=this.entries.get(this.hovered);this.hoverHint.hidden=!hovered||!!this.pointer||this.labelNodes.has(this.hovered)||!!this.assembly;
  if(hovered&&!this.hoverHint.hidden){const point=hovered.group.localToWorld(hovered.anchor.clone()).project(this.camera);this.hoverHint.textContent=english?hovered.en:hovered.label;const x=(point.x+1)/2*this.host.clientWidth,y=(1-point.y)/2*this.host.clientHeight;
   this.hoverHint.style.left=Math.max(10,Math.min(this.host.clientWidth-this.hoverHint.offsetWidth-10,x+14))+'px';this.hoverHint.style.top=Math.max(8,Math.min(this.host.clientHeight-45,y-30))+'px';
  }
  const entry=this.entries.get(this.selected),panel=this.host.querySelector<HTMLElement>('.inspector');
  this.selectionLink.style.display=entry&&panel&&!panel.hidden&&!this.assembly?'':'none';if(!entry||!panel||panel.hidden)return;
  const p=entry.group.localToWorld(entry.anchor.clone()).project(this.camera),w=this.host.clientWidth,h=this.host.clientHeight;
  const x=(p.x+1)*w/2,y=(1-p.y)*h/2,r=panel.getBoundingClientRect(),host=this.host.getBoundingClientRect();
  if(Math.abs(p.x)>1||Math.abs(p.y)>1){this.selectionLink.style.display='none';return;}
  const left=r.left-host.left,right=r.right-host.left,top=r.top-host.top,bottom=r.bottom-host.top;
  let ex=x<(left+right)/2?left:right,ey=Math.max(top+20,Math.min(bottom-18,y));
  if(x>=left&&x<=right){ex=Math.max(left+20,Math.min(right-20,x));ey=y<top?top:bottom;}
  this.selectionLink.setAttribute('viewBox',`0 0 ${w} ${h}`);this.selectionLink.querySelector('path')!.setAttribute('d',`M${x} ${y} L${ex+(ex===left?-16:ex===right?16:0)} ${ey} L${ex} ${ey}`);
  const dot=this.selectionLink.querySelector('circle')!;dot.setAttribute('cx',String(x));dot.setAttribute('cy',String(y));
 }
 get focused(){return this.focusId!=='';}
 private meshBounds(group:T.Object3D){
  group.updateWorldMatrix(true,true);const boxes:T.Box3[]=[];
  group.traverse(o=>{if(o instanceof T.Mesh)boxes.push(new T.Box3().setFromObject(o));});
  return boxes;
 }
 private viewBounds(){
  const entry=this.entries.get(this.focusId);if(!entry)return this.circuitBounds;
  const boxes=this.meshBounds(entry.group);
  const mounted=this.focusId==='resistor'?'led':this.focusId;
  if(['led','rgb','pot'].includes(mounted))for(const [endpoint,hole] of Object.entries({...mountedLeads,...jumperSockets}))if(endpoint.startsWith(mounted+'.'))boxes.push(new T.Box3().setFromCenterAndSize(new T.Vector3(...holePosition(hole)),new T.Vector3(2,2,2)));
  if(!boxes.length){const p=entry.group.getWorldPosition(new T.Vector3());boxes.push(new T.Box3().setFromCenterAndSize(p,new T.Vector3(6,6,6)));}
  return boxes;
 }
 private frameArea(){
  const w=this.host.clientWidth||600,h=this.host.clientHeight||500,rect=this.host.getBoundingClientRect();
  const frame={width:w,height:h,left:24,top:32,right:w-24,bottom:h-62};
  const schematic=this.host.querySelector<HTMLElement>('.schematic');
  const inspector=this.host.querySelector<HTMLElement>('.inspector');
  if(inspector&&!inspector.hidden){
   const panel=inspector.getBoundingClientRect();
   if(panel.top<rect.bottom&&panel.bottom>rect.top){
    const candidates=[
     {...frame,right:Math.min(frame.right,panel.left-rect.left-18)},
     {...frame,left:Math.max(frame.left,panel.right-rect.left+18)},
     {...frame,bottom:Math.min(frame.bottom,panel.top-rect.top-18)},
     {...frame,top:Math.max(frame.top,panel.bottom-rect.top+18)},
    ];
    const area=(f:typeof frame)=>Math.max(0,f.right-f.left)*Math.max(0,f.bottom-f.top);
    Object.assign(frame,candidates.sort((a,b)=>area(b)-area(a))[0]);
   }
  }
  if(schematic&&!schematic.hidden){const panel=schematic.getBoundingClientRect();const right={...frame,left:Math.max(frame.left,panel.right-rect.left+18)},below={...frame,top:Math.max(frame.top,panel.bottom-rect.top+18)};const area=(f:typeof frame)=>Math.max(0,f.right-f.left)*Math.max(0,f.bottom-f.top);return area(right)>area(below)?right:below;}
  return frame;
 }
 focus(id:string){if(!this.entries.has(id))return;this.finishAssembly();this.focusId=id;this.pan.set(0,0,0);this.zoom=1;this.select(id);this.updateCamera();}
 center(){return new T.Vector3().copy(fitCamera(this.viewBounds(),this.angle,this.elevation,this.frameArea()).target);}
 reset(){this.focusId='';this.pan.set(0,0,0);this.angle=.25;this.elevation=.70;this.zoom=1;this.select('');this.updateCamera();}
 turn(d:number){this.angle+=d*.26;this.updateCamera();}
 magnify(d:number){this.zoom=Math.min(5,Math.max(.4,this.zoom*d));this.updateCamera();}
 panBy(x:number,z:number){this.pan.x+=x;this.pan.z+=z;this.updateCamera();}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.updateCamera();}
 updateCamera(){
  const plan=fitCamera(this.viewBounds(),this.angle,this.elevation,this.frameArea());
  this.desiredHeight=plan.height/this.zoom;this.target.copy(plan.target).add(this.pan);
  this.cameraDestination.copy(this.target).add(new T.Vector3(Math.sin(this.angle)*130*Math.cos(this.elevation),Math.sin(this.elevation)*130,Math.cos(this.angle)*130*Math.cos(this.elevation)));
  if(!this.last||this.settings.reducedMotion){this.camera.position.copy(this.cameraDestination);this.cameraAim.copy(this.target);this.viewHeight=this.desiredHeight;}
  this.projectCamera();
 }
 private projectCamera(){
  const aspect=(this.host.clientWidth||600)/(this.host.clientHeight||500);
  this.camera.left=-this.viewHeight*aspect/2;this.camera.right=this.viewHeight*aspect/2;this.camera.top=this.viewHeight/2;this.camera.bottom=-this.viewHeight/2;this.camera.near=.1;this.camera.far=1000;
  this.camera.lookAt(this.cameraAim);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
 }
 pick(x:number,y:number,resting=true){
  if(this.assembly)return null;
  const r=this.renderer.domElement.getBoundingClientRect();if(x<r.left||x>r.right||y<r.top||y>r.bottom)return null;
  if(resting)this.restoreBounce();this.root.updateMatrixWorld(true);
  this.ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);
  let found:string|null=null;for(const hit of this.ray.intersectObjects(this.root.children,true)){let o:T.Object3D|null=hit.object;while(o){if(o.userData.part){found=String(o.userData.part);break;}o=o.parent;}if(found)break;}if(resting)this.animateHover(performance.now());return found;
 }
 down(e:PointerEvent){
  if((e.target as HTMLElement).closest('button,input,select,.inspector,.schematic,.toolbar,.readout'))return;
  const part=this.pick(e.clientX,e.clientY,false);this.setHover('');this.pointer={x:e.clientX,y:e.clientY,moved:false,mode:e.button===2||e.shiftKey?'rotate':'pan',part};
  if(part==='button'){this.onButton(true);this.pointer.mode='button';}
  if(part==='watering'){this.onButton(true);this.pointer.mode='water';}
  if(part?.startsWith('key-')){this.onKey(Number(part.slice(4)),true);this.pointer.mode='key';}
  if(part==='pot')this.pointer.mode='pot';
  if(part==='servo')this.pointer.mode='servo';
  if(part==='obstacle')this.pointer.mode='distance';
 }
 move(e:PointerEvent){
  const p=this.pointer;if(!p){const target=e.target as HTMLElement;if(target===this.renderer.domElement&&e.pointerType!=='touch'){const id=this.pick(e.clientX,e.clientY);this.setHover(id??'');this.host.style.cursor=id?'pointer':'grab';}else if(!target.closest('.scene-tag'))this.setHover('');return;}const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)+Math.abs(dy)>2)p.moved=true;
  if(p.mode==='pot'){this.onInput('knob',Math.max(0,Math.min(100,Number(this.values.knob??50)+(dx-dy)*.5)));}
  else if(p.mode==='servo'){this.onInput('pulse',Math.max(1000,Math.min(2000,Number(this.values.pulse??1500)+(dx-dy)*5)));}
  else if(p.mode==='distance'){this.onInput('distance',Math.max(2,Math.min(200,Number(this.values.distance??60)+(dx-dy)*.7)));}
  else if(p.mode==='rotate'){this.angle+=dx*.008;this.updateCamera();}
  else if(p.mode==='pan'){const amount=this.viewHeight/this.host.clientHeight;const right=new T.Vector3(Math.cos(this.angle),0,-Math.sin(this.angle));const up=new T.Vector3(-Math.sin(this.elevation)*Math.sin(this.angle),Math.cos(this.elevation),-Math.sin(this.elevation)*Math.cos(this.angle));this.pan.addScaledVector(right,-dx*amount).addScaledVector(up,dy*amount);this.updateCamera();}
  p.x=e.clientX;p.y=e.clientY;
 }
 cancel(){if(this.pointer?.mode==='button'||this.pointer?.mode==='water')this.onButton(false);if(this.pointer?.mode==='key')this.onKey(Number(this.pointer.part!.slice(4)),false);this.pointer=null;this.setHover('');}
 up(){const p=this.pointer;if(!p)return;if(p.mode==='button'||p.mode==='water')this.onButton(false);if(p.mode==='key')this.onKey(Number(p.part!.slice(4)),false);if(!p.moved&&p.part){this.select(p.part);this.onSelect(p.part);}this.pointer=null;}
 draw(time:number,s:Snapshot|undefined,english=false){
  this.restoreBounce();
  if(this.assembly)this.animateAssembly(time-this.assembly.start);
  if(this.settings.autoRotate&&!this.pointer&&this.last)this.angle+=(time-this.last)*.00006;
  const blend=this.settings.reducedMotion?1:1-Math.exp(-Math.min(64,this.last?time-this.last:64)/160);this.camera.position.lerp(this.cameraDestination,blend);this.cameraAim.lerp(this.target,blend);this.viewHeight+=(this.desiredHeight-this.viewHeight)*blend;this.projectCamera();
  this.last=time;if(this.settings.autoRotate)this.updateCamera();this.grid.visible=this.settings.grid;
  for(const m of this.lights){const mat=m.material as T.MeshStandardMaterial;const color=this.lesson.id==='pwm'?new T.Color(s?s.rgb[0]/255:1,s?s.rgb[1]/255:.3,s?s.rgb[2]/255:.1):new T.Color(String(this.values.color??'#df554b'));mat.color.copy(color);mat.emissive.copy(color);mat.emissiveIntensity=s?.level?1.3*s.level:0;}
  const led=this.entries.get('resistor')??this.entries.get('led');if(led){const bands:Record<string,number[]>={'220':[0xa64c3e,0xa64c3e,0x765038],'330':[0xbf753d,0xbf753d,0x765038],'1000':[0x765038,0x30323a,0xa64c3e]};const palette=bands[String(this.values.ohms??330)];palette?.forEach((color,i)=>{const band=led.group.getObjectByName('resistor-band-'+i) as T.Mesh|undefined;if(band)(band.material as T.MeshStandardMaterial).color.setHex(color);});}
  const b=this.entries.get('button');if(b)b.group.scale.y=s?.pressed ? .78 : 1;
  const pot=this.entries.get('pot');if(pot){const marker=pot.group.getObjectByName('marker');if(marker){const a=(Number(this.values.knob??50)/100-.5)*Math.PI*1.5;marker.position.x=Math.sin(a);marker.position.z=-Math.cos(a);marker.rotation.y=-a;}}
  const servo=this.entries.get('servo');if(servo){const arm=servo.group.getObjectByName('arm');if(arm)arm.rotation.y=s?.angle??(Number(this.values.pulse??1500)-1500)/1000*Math.PI;}
  const garden=this.entries.get('plant');
  if(garden){
   const wet=s?.soilWetness??Number(this.values.moisture??55);garden.group.traverse(o=>{if(o.userData.leaf){o.rotation.z=(wet<30?.8:wet>85?.3:0)*Number(o.userData.side);const m=o as T.Mesh;(m.material as T.MeshStandardMaterial).color.set(wet<30?'#a19b5d':'#6b9b65');}});
   const soil=garden.group.getObjectByName('soil-surface') as T.Mesh;(soil.material as T.MeshStandardMaterial).color.set(wet<30?'#a27d55':wet>80?'#493c30':'#72553b');
  }
  const watering=this.entries.get('watering');if(watering){
   watering.group.rotation.z=s?.watering?-.25:0;watering.group.updateWorldMatrix(true,false);
   const end=garden?watering.group.worldToLocal(garden.group.localToWorld(new T.Vector3(0,13,0))):new T.Vector3(12,-4,-18);
   for(let i=0;i<9;i++){const drop=watering.group.getObjectByName('water-drop-'+i)!;drop.visible=!!s?.watering;drop.position.copy(new T.Vector3(9,10,-10).lerp(end,((time/650+i/9)%1)));}
  }
  for(let i=0;i<8;i++){const key=this.entries.get('key-'+i);if(key){const cap=key.group.getObjectByName('key-cap') as T.Mesh;key.group.position.y=s?.noteIndex===i?-.8:0;(cap.material as T.MeshStandardMaterial).color.set(s?.noteIndex===i?'#a1c6bc':'#f4efdf');}}
  const lamp=this.entries.get('lamp');if(lamp){const pool=lamp.group.getObjectByName('lamp-pool') as T.Mesh;(pool.material as T.MeshStandardMaterial).opacity=Number(this.values.light??75)/100*.45;const bulb=lamp.group.getObjectByName('lamp-bulb') as T.Mesh;(bulb.material as T.MeshStandardMaterial).emissive.set('#ffe0a0');(bulb.material as T.MeshStandardMaterial).emissiveIntensity=Number(this.values.light??75)/100;}
  if(this.oledTexture){
   const text=s?.oled.join('\n')??'ESP32\nRUN TO START';
   if(text!==this.oledContent){this.oledContent=text;const {ctx,map}=this.oledTexture;ctx.fillStyle='#162b30';ctx.fillRect(0,0,512,256);ctx.fillStyle='#b5e1dc';ctx.textAlign='left';const lines=text.split('\n');ctx.font='bold 30px monospace';ctx.fillText(lines[0],18,34);ctx.font='bold 65px monospace';ctx.fillText(lines[1]??'',18,109);ctx.strokeStyle='#b5e1dc';ctx.lineWidth=3;ctx.strokeRect(18,133,472,32);ctx.fillRect(24,139,460*(s?.displayValue??0)/100,20);ctx.font='bold 38px monospace';ctx.fillText(lines[2]??'',18,215);map.needsUpdate=true;}
  }
  if(this.browserTexture){const text=this.lesson.id==='project'?'ESP32 GARDEN\n'+(s?s.moisture+'%':'—%')+'  '+(s?.network??'STOPPED')+'\n'+(s&&s.moisture<Number(this.values.thirsty)?'Water me!':'Happy :)'):this.lesson.id==='http'?'ESP32 THERMOMETER\n'+(s?s.temperature.toFixed(1)+' C':'— C')+'\nGET /api/state':'ESP32 LED\n'+(s?.led?'ON':'OFF')+'\nPOST /api/led';if(text!==this.browserContent){this.browserContent=text;const {ctx,map}=this.browserTexture;ctx.fillStyle='#f0ecdf';ctx.fillRect(0,0,512,256);ctx.fillStyle='#467d7f';ctx.textAlign='left';ctx.font='bold 32px monospace';text.split('\n').forEach((line,i)=>ctx.fillText(line,18,50+i*65));map.needsUpdate=true;}}

  updateRobotParts(this,s?.robot,time,this.values);
  for(const {curve,dots,part,pin,tube,count} of this.flows)dots.forEach((dot,i)=>{const active=!s?false:part==='led'?s.led:part==='button'?s.pressed:part==='buzzer'?s.frequency>0:part==='rgb'&&['23','19','18'].includes(pin)?s.rgb[['23','19','18'].indexOf(pin)]>0:true;dot.visible=active&&this.settings.flow&&tube.geometry.drawRange.count>=count;dot.position.copy(curve.getPoint((time/1800+i/3)%1));});
  this.animateHover(time);this.root.updateMatrixWorld(true);this.drawInteraction(english);
  const placed:{x:number;y:number;w:number;h:number}[]=[];
  const offsets:Record<string,[number,number]>={usb:[40,-24],module:[-50,18],board:[60,40],power:[-65,-8],reset:[-18,-50],boot:[65,7],led:[-10,-20],resistor:[40,32]};
  for(const [id,node] of this.labelNodes){
   const e=this.entries.get(id)!,pos=e.group.localToWorld(e.anchor.clone()).project(this.camera);
   const visible=this.settings.labels&&Math.abs(pos.x)<1&&Math.abs(pos.y)<1;
   node.style.display=visible?'':'none';node.querySelector('span')!.textContent=english?e.en:e.label;
   const line=this.tags.querySelector<SVGLineElement>('[data-leader="'+id+'"]')!;line.style.display=visible?'':'none';if(!visible)continue;
   const ax=(pos.x+1)/2*this.host.clientWidth,ay=(-pos.y+1)/2*this.host.clientHeight;
   const [dx,dy]=offsets[id]??[0,-10],w=node.offsetWidth,h=node.offsetHeight;
   const x=Math.max(w/2+8,Math.min(this.host.clientWidth-w/2-8,ax+dx));let y=Math.max(h+8,Math.min(this.host.clientHeight-65,ay+dy));
   for(let pass=0;pass<12;pass++){const hit=placed.find(r=>Math.abs(x-r.x)<(w+r.w)/2+7&&Math.abs(y-h/2-r.y)<(h+r.h)/2+6);if(!hit)break;y=hit.y+hit.h/2+h+7;}
   node.style.left=x+'px';node.style.top=y+'px';placed.push({x,y:y-h/2,w,h});
   line.setAttribute('x1',String(ax));line.setAttribute('y1',String(ay));line.setAttribute('x2',String(x));line.setAttribute('y2',String(y-h/2));
  }
  this.renderer.render(this.scene,this.camera);
 }
}
