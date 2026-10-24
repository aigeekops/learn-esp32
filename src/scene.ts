import * as T from 'three';
import { boardLeft,boardRight } from './lessons.ts';
import type { Lesson, Part, Values } from './lessons.ts';
import type { Snapshot } from './simulation.ts';
import {connections} from './circuit.ts';
interface Entry {group:T.Group; label:string; en:string; anchor:T.Vector3;}
const colors={ink:0x303647,pcb:0x303e46,metal:0xc2c4bc,cream:0xeee8d9,black:0x252a33,gold:0xb9a260};
export class Workbench{
 renderer:T.WebGLRenderer; scene=new T.Scene(); camera=new T.OrthographicCamera(); root=new T.Group();
 entries=new Map<string,Entry>(); pins=new Map<string,T.Vector3>(); lights:T.Mesh[]=[]; flows:{curve:T.CatmullRomCurve3;dots:T.Mesh[];part:string;pin:string}[]=[];
 angle=.65;elevation=.85;zoom=1;pan=new T.Vector3(); boardX=0; private pointer:{x:number;y:number;moved:boolean;mode:string;part:string|null}|null=null;
 private ray=new T.Raycaster(); private ndc=new T.Vector2(); private target=new T.Vector3(); private last=0; private hovered=''; private selected=''; private ring:T.Box3Helper|null=null;
 private bounds=new T.Vector3(28,12,51);private materials:T.Material[]=[]; tags:HTMLDivElement; labelNodes=new Map<string,HTMLButtonElement>(); lesson!:Lesson; values:Values={};
 grid:T.GridHelper; settings={labels:true,grid:true,flow:true,autoRotate:false,reducedMotion:false};
 onSelect:(id:string)=>void; onInput:(key:string,v:number)=>void; onButton:(held:boolean)=>void;
 constructor(public host:HTMLElement,callbacks:{select:(id:string)=>void;input:(key:string,v:number)=>void;button:(held:boolean)=>void}){
  this.onSelect=callbacks.select;this.onInput=callbacks.input;this.onButton=callbacks.button;
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0,0);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.domElement.setAttribute('aria-label','交互式 ESP32 3D 视图：拖动平移，Q/E 旋转，滚轮缩放');this.renderer.domElement.setAttribute('role','img');this.renderer.domElement.tabIndex=0;this.host.append(this.renderer.domElement);
  this.scene.add(this.root,new T.HemisphereLight(0xfffcf2,0xb6a68b,2));
  const sun=new T.DirectionalLight(0xfff6e8,3);sun.position.set(-60,110,-40);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:300});sun.shadow.bias=-.001;sun.shadow.normalBias=.1;this.scene.add(sun);
  const ground=new T.Mesh(new T.PlaneGeometry(600,600),new T.ShadowMaterial({opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-2;ground.receiveShadow=true;this.scene.add(ground);
  this.grid=new T.GridHelper(600,60,0xd4ccb8,0xded6c5);this.grid.position.y=-1.9;this.grid.material.transparent=true;this.grid.material.opacity=.45;this.scene.add(this.grid);
  this.tags=document.createElement('div');this.tags.className='scene-tags';this.host.append(this.tags);
  this.host.addEventListener('pointerdown',e=>this.down(e));
  window.addEventListener('pointermove',e=>this.move(e));window.addEventListener('pointerup',()=>this.up());window.addEventListener('pointercancel',()=>this.cancel());window.addEventListener('blur',()=>this.cancel());
  this.host.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.5,Math.min(2.8,this.zoom*Math.exp(-e.deltaY*.001)));this.updateCamera();},{passive:false});
  this.host.addEventListener('dblclick',e=>{const id=this.pick(e.clientX,e.clientY);if(id)this.focus(id);else this.reset();});
  this.host.addEventListener('contextmenu',e=>e.preventDefault());
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();
 }
 mat(color:T.ColorRepresentation,metal=0){const m=new T.MeshStandardMaterial({color,roughness:.65,metalness:metal,flatShading:true});this.materials.push(m);return m;}
 box(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:T.ColorRepresentation,outline=true){
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),this.mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  if(outline){const edge=new T.LineSegments(new T.EdgesGeometry(mesh.geometry),new T.LineBasicMaterial({color:colors.ink,transparent:true,opacity:.8}));mesh.add(edge);}return mesh;
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
  const shield=new T.Group();shield.position.set(0,0,8);g.add(shield);this.box(shield,18,2.6,17.5,0,2.2,0,colors.metal);this.text(shield,'ESPRESSIF\nESP32-WROOM-32E\nWi-Fi + BT',0,3.55,0,16,12,'#535b5c');this.addEntry('module',shield,'ESP32 模组','ESP32 module',5);
  this.box(g,18,.45,6.8,0,1.15,20.5,0x262b31,false);
  for(let i=0;i<5;i++){this.box(g,13-i*1.4,.06,.3,1,1.42,18+i*1.1,0xb9a061,false);this.box(g,.3,.06,1.3,i%2?7:-5,1.42,18+i*1.1,0xb9a061,false);}
  const usb=new T.Group();usb.position.set(0,0,-23);g.add(usb);this.box(usb,8,3.3,5,0,2,0,0xbcbfb7);this.box(usb,6,1.6,.2,0,2,-2.6,0x202936);this.box(usb,4,.3,.25,0,1.9,-2.75,0xd4c9a2,false);this.addEntry('usb',usb,'USB 接口','USB port',5);
  for(const [id,x,label,en] of [['reset',-8,'EN 复位','EN reset'],['boot',8,'BOOT 按键','BOOT button']] as const){
   const b=new T.Group();b.position.set(x,0,-17);g.add(b);this.box(b,4.5,1.8,4.5,0,1.9,0,0xbec1b7);this.cylinder(b,1.5,1.1,0,3.2,0,0x30323a);this.text(g,id==='reset'?'EN':'BOOT',x,.83,-13,4,2);this.addEntry(id,b,label,en,4);
  }
  this.box(g,5,.8,6,0,1.3,-11,0x282d37);for(let i=0;i<5;i++){this.box(g,.8,.25,.4,-3.2,1.1,-13+i,0xc0bca8,false);this.box(g,.8,.25,.4,3.2,1.1,-13+i,0xc0bca8,false);}
  for(let i=0;i<9;i++){let x=(i%3-1)*6,z=-6+Math.floor(i/3)*3;this.box(g,1.5,.6,.9,x,1.25,z,i%2?0xa99b7c:0x383c44,false);}
  this.cylinder(g,1.8,2,-6,2.1,-7,0xa5aaa8);this.cylinder(g,1.3,2.7,6,2.1,-7,0x373d49);
  const pow=this.box(g,1.3,.7,1.8,5,1.7,-4,0xbf4741);(pow.material as T.MeshStandardMaterial).emissive.set('#b43d35');(pow.material as T.MeshStandardMaterial).emissiveIntensity=.65;
  for(const [names,x] of [[boardLeft,-13],[boardRight,13]] as const){
   this.box(g,2.5,2.6,47,x,-.5,0,0x282b33);
   names.forEach((name,i)=>{
    const z=22.5-i*2.5;this.cylinder(g,.46,6.5,x,1,z,colors.gold,6);
    this.text(g,name,x<0?-9.7:9.7,.81,z,3,1.55,'#ece9cd');
    const pinId=name==='TX'?'1':name==='RX'?'3':name==='VP'?'36':name==='VN'?'39':name;
    if(!this.pins.has(pinId))this.pins.set(pinId,new T.Vector3(this.boardX+x,4.3,z));
   });
  }
  this.text(g,'ESP32 DEVKITC',0,.84,-4,13,2.3);this.text(g,'3.3V LOGIC',0,.84,-1.8,11,1.9,'#bcc5bc');
  this.addEntry('board',g,'GPIO 引脚','GPIO pins',3);
  const power=new T.Group();power.position.set(-13,1,22);g.add(power);this.addEntry('power',power,'3V3 / GND','3V3 / GND',4);
 }
 private oledTexture:{ctx:CanvasRenderingContext2D;map:T.CanvasTexture}|null=null;
 private oledContent='';
 breadboard(){
  const g=new T.Group();g.position.set(24,0,1);this.root.add(g);
  this.box(g,43,1.8,49,0,-.1,0,0xe7e4d8);
  this.box(g,1.2,.08,43,0,.85,0,0xc8c5ba,false);
  for(const x of [-19,19]){this.box(g,.2,.1,43,x,.88,0,x<0?0xc7886b:0x6e93ad,false);}
  const geom=new T.CylinderGeometry(.31,.31,.08,6),mat=this.mat(0x8a8d89);const holes=new T.InstancedMesh(geom,mat,280);let k=0;const m=new T.Matrix4();
  for(let row=0;row<28;row++)for(let col=0;col<10;col++){const x=(col<5?-14+col*2.3:4.5+(col-5)*2.3),z=-21+row*1.55;m.makeTranslation(x,1,z);holes.setMatrixAt(k++,m);}g.add(holes);
  this.text(g,'+   −',0,.97,23,32,2,'#8d8f84');return g;
 }
 part(id:Part,x:number,z:number){
  const g=new T.Group();g.position.set(x,1.6,z);this.root.add(g);
  const names:Record<Part,[string,string]>={led:['LED 与电阻','LED + resistor'],button:['按钮','Button'],pot:['电位器','Potentiometer'],rgb:['RGB LED','RGB LED'],sensor:['TMP36 温度','TMP36'],oled:['OLED 屏幕','OLED'],buzzer:['蜂鸣器','Piezo'],servo:['舵机','Servo'],router:['路由器','Router'],browser:['浏览器','Browser']};
  this.addEntry(id,g,...names[id]);
  if(id==='led'||id==='rgb'){
   for(const q of (id==='led'?[-1,1]:[-1.8,-.6,.6,1.8]))this.cylinder(g,.2,5,q,2,0,0xb6b8aa,8);
   this.cylinder(g,2,3.8,0,5,0,id==='led'?0xe56b57:0xbba8d0,18);
   const dome=new T.Mesh(new T.SphereGeometry(2,18,12,0,Math.PI*2,0,Math.PI/2),this.mat(id==='led'?0xd54e42:0xe6d0f1));dome.position.y=6.9;g.add(dome);this.lights.push(dome);
   this.cylinder(g,2.4,.5,0,3.4,0,0x843e43);
   for(const z of (id==='rgb'?[-3,0,3]:[0])){
    const resistor=this.cylinder(g,.75,4.5,6,1.2,z,0xc7b58b,12);resistor.rotation.z=Math.PI/2;
    for(let i=0;i<3;i++){const band=this.cylinder(g,.78,.35,5+i,1.2,z,[0xbf753d,0xbf753d,0x765038][i],12);band.rotation.z=Math.PI/2;band.name='resistor-band-'+i;}
    for(const x of [3.2,8.8]){const lead=this.cylinder(g,.15,1.2,x,1.2,z,colors.metal,6);lead.rotation.z=Math.PI/2;}
   }
  }else if(id==='button'){
   this.box(g,7,2.5,7,0,1.2,0,0x393e48);this.box(g,6.4,.35,6.4,0,2.6,0,0xa9adac);this.cylinder(g,2.3,1.6,0,3.6,0,0xb85545);
   for(const a of [-3.7,3.7])for(const b of [-2,2])this.box(g,1.7,.3,.7,a,0,b,0xb7b5a8,false);
  }else if(id==='pot'){
   this.box(g,7,3,8,0,1,0,0x38526b);this.cylinder(g,3,1.4,0,3,0,0xafb1ab);const knob=this.cylinder(g,2.9,5.5,0,5,0,0x353941,18);knob.name='knob';const marker=this.box(g,.5,.1,2.1,0,7.8,-1,0xe5e0ce,false);marker.name='marker';for(let i=-1;i<=1;i++)this.box(g,.5,3,.5,i*2,0,-4,colors.gold,false);
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
   this.box(g,24,1,19,0,1,0,0xb3b7b2);this.text(g,'ESP32\n192.168.4.23\nDEVICE / API',0,1.7,0,22,16,'#467d7f','#f0ecdf');
  }
  return g;
 }
 wire(from:T.Vector3,to:T.Vector3,color:string,part:string,pin:string){
  const middle=from.clone().lerp(to,.5);middle.y=8+Math.abs(from.x-to.x)*.04;
  const curve=new T.CatmullRomCurve3([from,from.clone().add(new T.Vector3(0,3,0)),middle,to.clone().add(new T.Vector3(0,3,0)),to]);
  const tube=new T.Mesh(new T.TubeGeometry(curve,24,.28,6,false),this.mat(color));tube.castShadow=true;this.root.add(tube);
  const dots:T.Mesh[]=[];for(let i=0;i<3;i++){const dot=new T.Mesh(new T.SphereGeometry(.5,6,6),new T.MeshBasicMaterial({color:0xf4dba0}));this.root.add(dot);dots.push(dot);}this.flows.push({curve,dots,part,pin});
 }
 setLesson(l:Lesson,values:Values){
  this.up();this.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.LineSegments){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){const map=(m as T.MeshBasicMaterial).map;map?.dispose();m.dispose();}}});
  this.root.clear();this.entries.clear();this.pins.clear();this.lights=[];this.flows=[];this.materials=[];this.oledTexture=null;this.selected='';this.ring=null;this.lesson=l;this.values=values;this.boardX=l.parts.length?-28:0;this.board();
  if(l.parts.some(p=>!['router','browser'].includes(p)))this.breadboard();
  const positions:Record<string,[number,number]>={led:[14,-8],rgb:[14,-8],button:[27,7],pot:[25,16],sensor:[11,10],oled:[37,18],buzzer:[31,-13],servo:[25,0],router:[20,40],browser:[47,-17]};
  if(l.parts.length===1&&!['router','browser'].includes(l.parts[0]))positions[l.parts[0]]=[24,0];
  if(l.id==='display'){positions.oled=[29,2];positions.sensor=[13,-14];}
  if(l.id==='pwm'){positions.rgb=[20,-10];positions.pot=[29,13];}
  for(const id of l.parts){const [x,z]=positions[id];this.part(id,x,z);}
  if(l.parts.includes('servo')){
   const supply=new T.Group();supply.position.set(43,1.5,-16);this.root.add(supply);
   this.box(supply,12,5,13,0,2,0,0x656f73);this.text(supply,'5 V DC\n+    −',0,4.6,0,11,10,'#f0ead4');this.addEntry('supply',supply,'独立 5 V 电源','Separate 5 V supply');
  }
  for(const net of connections(l)){const part=(net.from.startsWith('board.')?net.to:net.from).split('.')[0],pin=(net.from.startsWith('board.')?net.from:net.to).split('.')[1];this.wire(this.terminal(net.from),this.terminal(net.to),net.color,part,pin);}
  this.tags.replaceChildren();this.labelNodes.clear();
  const ids:string[]=l.parts.length?[...l.parts,...(l.parts.includes('servo')?['supply']:[])]:['usb','module','board','power','reset','boot'];
  for(const id of ids){const entry=this.entries.get(id);if(!entry)continue;const b=document.createElement('button');b.className='scene-tag';b.dataset.part=id;b.innerHTML='<i></i><span>'+entry.label+'</span>';b.addEventListener('click',e=>{e.stopPropagation();this.onSelect(id);this.select(id);});this.tags.append(b);this.labelNodes.set(id,b);}
  new T.Box3().setFromObject(this.root).getSize(this.bounds);
  this.reset();
 }
 terminal(endpoint:string):T.Vector3{
  const [part,pin]=endpoint.split('.');
  if(part==='board'){const position=this.pins.get(pin);if(!position)throw new Error('Unknown board pin '+pin);return position.clone();}
  const terminals:Record<string,Record<string,[number,number,number]>>={
   led:{resistorIn:[9.4,1.2,0],resistorOut:[2.6,1.2,0],anode:[1,0,0],GND:[-1,0,0]},
   rgb:{resistor23:[9.4,1.2,-3],resistor19:[9.4,1.2,0],resistor18:[9.4,1.2,3],out23:[2.6,1.2,-3],out19:[2.6,1.2,0],out18:[2.6,1.2,3],R:[-1.8,0,0],G:[.6,0,0],B:[1.8,0,0],GND:[-.6,0,0]},
   button:{signal:[-4.4,0,-2],GND:[4.4,0,-2]},pot:{VCC:[-2,0,-4],signal:[0,0,-4],GND:[2,0,-4]},
   sensor:{VCC:[-1.7,-1.5,0],signal:[0,-1.5,0],GND:[1.7,-1.5,0]},
   oled:{GND:[-4.5,3.5,8],VCC:[-1.5,3.5,8],SCL:[1.5,3.5,8],SDA:[4.5,3.5,8]},
   buzzer:{signal:[2,-.7,0],GND:[-2,-.7,0]},servo:{signal:[-4,1,-6],VCC:[-4,1,-4],GND:[-4,1,-2]},
   supply:{positive:[-4,4.6,-4],negative:[4,4.6,-4]}
  };
  const position=terminals[part]?.[pin],entry=this.entries.get(part);
  if(!position||!entry)throw new Error('Unknown terminal '+endpoint);
  return entry.group.position.clone().add(new T.Vector3(...position));
 }
 select(id:string){
  if(this.ring){this.root.remove(this.ring);this.ring.geometry.dispose();(this.ring.material as T.Material).dispose();this.ring=null;}
  this.selected=id;const e=this.entries.get(id);if(e&&e.group.children.length){const box=new T.Box3().setFromObject(e.group).expandByScalar(1);this.ring=new T.Box3Helper(box,0x67a1a0);this.root.add(this.ring);}
 }
 focus(id:string){const e=this.entries.get(id);if(!e)return;const p=e.group.getWorldPosition(new T.Vector3());this.pan.copy(p).sub(this.center());this.zoom=1.8;this.updateCamera();this.select(id);}
 center(){return new T.Vector3(this.lesson?.parts.length?5:0,1,this.lesson?.parts.includes('router')?7:0);}
 reset(){this.pan.set(0,0,0);this.angle=.65;this.elevation=.85;this.zoom=1;this.updateCamera();}
 turn(d:number){this.angle+=d*.26;this.updateCamera();}
 magnify(d:number){this.zoom=Math.min(2.8,Math.max(.5,this.zoom*d));this.updateCamera();}
 panBy(x:number,z:number){this.pan.x+=x;this.pan.z+=z;this.updateCamera();}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.updateCamera();}
 updateCamera(){
  const w=this.host.clientWidth||600,h=this.host.clientHeight||500,aspect=w/h;const projectedWidth=Math.abs(Math.cos(this.angle))*this.bounds.x+Math.abs(Math.sin(this.angle))*this.bounds.z;const size=Math.max(this.lesson?.parts.length?102:74,projectedWidth/aspect*1.17)/this.zoom;
  this.camera.left=-size*aspect/2;this.camera.right=size*aspect/2;this.camera.top=size/2;this.camera.bottom=-size/2;this.camera.near=.1;this.camera.far=1000;
  this.target.copy(this.center()).add(this.pan);this.camera.position.copy(this.target).add(new T.Vector3(Math.sin(this.angle)*130*Math.cos(this.elevation),Math.sin(this.elevation)*130,Math.cos(this.angle)*130*Math.cos(this.elevation)));this.camera.lookAt(this.target);this.camera.updateProjectionMatrix();
 }
 pick(x:number,y:number){
  const r=this.renderer.domElement.getBoundingClientRect();if(x<r.left||x>r.right||y<r.top||y>r.bottom)return null;
  this.ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);
  for(const hit of this.ray.intersectObjects(this.root.children,true)){let o:T.Object3D|null=hit.object;while(o){if(o.userData.part)return String(o.userData.part);o=o.parent;}}return null;
 }
 down(e:PointerEvent){
  if((e.target as HTMLElement).closest('button,input,select,.inspector,.schematic,.toolbar,.readout'))return;
  const part=this.pick(e.clientX,e.clientY);this.pointer={x:e.clientX,y:e.clientY,moved:false,mode:e.button===2||e.shiftKey?'rotate':'pan',part};
  if(part==='button'){this.onButton(true);this.pointer.mode='button';}
  if(part==='pot')this.pointer.mode='pot';
  if(part==='servo')this.pointer.mode='servo';
 }
 move(e:PointerEvent){
  const p=this.pointer;if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)+Math.abs(dy)>2)p.moved=true;
  if(p.mode==='pot'){this.onInput('knob',Math.max(0,Math.min(100,Number(this.values.knob??50)+(dx-dy)*.5)));}
  else if(p.mode==='servo'){this.onInput('pulse',Math.max(1000,Math.min(2000,Number(this.values.pulse??1500)+(dx-dy)*5)));}
  else if(p.mode==='rotate'){this.angle+=dx*.008;this.updateCamera();}
  else if(p.mode==='pan'){const amount=(this.lesson.parts.length?102:74)/(this.host.clientHeight*this.zoom);this.pan.x-=dx*amount;this.pan.z+=dy*amount;this.updateCamera();}
  p.x=e.clientX;p.y=e.clientY;
 }
 cancel(){if(this.pointer?.mode==='button')this.onButton(false);this.pointer=null;}
 up(){const p=this.pointer;if(!p)return;if(p.mode==='button')this.onButton(false);if(!p.moved&&p.part){this.select(p.part);this.onSelect(p.part);}this.pointer=null;}
 draw(time:number,s:Snapshot|undefined,english=false){
  if(this.settings.autoRotate&&!this.pointer&&this.last)this.angle+=(time-this.last)*.00006;
  this.last=time;if(this.settings.autoRotate)this.updateCamera();this.grid.visible=this.settings.grid;
  for(const m of this.lights){const mat=m.material as T.MeshStandardMaterial;const color=this.lesson.id==='pwm'?new T.Color(s?s.rgb[0]/255:1,s?s.rgb[1]/255:.3,s?s.rgb[2]/255:.1):new T.Color(String(this.values.color??'#df554b'));mat.color.copy(color);mat.emissive.copy(color);mat.emissiveIntensity=s?.level?1.3*s.level:0;}
  const led=this.entries.get('led');if(led){const bands:Record<string,number[]>={'220':[0xa64c3e,0xa64c3e,0x765038],'330':[0xbf753d,0xbf753d,0x765038],'1000':[0x765038,0x30323a,0xa64c3e]};const palette=bands[String(this.values.ohms??330)];palette?.forEach((color,i)=>{const band=led.group.getObjectByName('resistor-band-'+i) as T.Mesh|undefined;if(band)(band.material as T.MeshStandardMaterial).color.setHex(color);});}
  const b=this.entries.get('button');if(b)b.group.scale.y=s?.pressed ? .78 : 1;
  const pot=this.entries.get('pot');if(pot){const marker=pot.group.getObjectByName('marker');if(marker){const a=(Number(this.values.knob??50)/100-.5)*Math.PI*1.5;marker.position.x=Math.sin(a);marker.position.z=-Math.cos(a);marker.rotation.y=-a;}}
  const servo=this.entries.get('servo');if(servo){const arm=servo.group.getObjectByName('arm');if(arm)arm.rotation.y=s?.angle??(Number(this.values.pulse??1500)-1500)/1000*Math.PI;}
  if(this.oledTexture){const text=s?.oled.join('\n')??'ESP32 MONITOR\n— C\nSTOPPED';if(text!==this.oledContent){this.oledContent=text;const {ctx,map}=this.oledTexture;ctx.fillStyle='#162b30';ctx.fillRect(0,0,512,256);ctx.fillStyle='#b5e1dc';ctx.font='bold 40px monospace';ctx.textAlign='left';text.split('\n').forEach((line,i)=>ctx.fillText(line,20,50+i*55));map.needsUpdate=true;}}
  for(const {curve,dots,part,pin} of this.flows)dots.forEach((dot,i)=>{const active=!s?false:part==='led'?s.led:part==='button'?s.pressed:part==='buzzer'?s.frequency>0:part==='rgb'&&['23','19','18'].includes(pin)?s.rgb[['23','19','18'].indexOf(pin)]>0:true;dot.visible=active&&this.settings.flow;dot.position.copy(curve.getPoint((time/1800+i/3)%1));});
  this.root.updateMatrixWorld(true);
  for(const [id,node] of this.labelNodes){const e=this.entries.get(id)!;const pos=e.group.localToWorld(e.anchor.clone()).project(this.camera);node.style.left=((pos.x+1)/2*this.host.clientWidth)+'px';node.style.top=((-pos.y+1)/2*this.host.clientHeight)+'px';node.style.display=this.settings.labels&&Math.abs(pos.x)<1&&Math.abs(pos.y)<1?'':'none';node.querySelector('span')!.textContent=english?e.en:e.label;}
  this.renderer.render(this.scene,this.camera);
 }
}
