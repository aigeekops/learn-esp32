import type {Lesson} from './lessons.ts';
import {connections} from './circuit.ts';
import {isRobotLesson} from './robot-shared.ts';
// One 2.54 mm grid owns both the visible sockets and the mounted leads.
// a–e and f–j are separate five-contact strips on each numbered row.
export interface Hole {row:number;col:number;}
export const breadboard={x:24,z:1,pitch:2.54,rows:28,surface:.8};
export function holePosition(h:Hole):[number,number,number]{
 if(!Number.isInteger(h.row)||h.row<0||h.row>=breadboard.rows||!Number.isInteger(h.col)||h.col<0||h.col>9)throw new Error('Invalid breadboard hole');
 return [breadboard.x+(h.col<5?-13.97+h.col*2.54:3.81+(h.col-5)*2.54),breadboard.surface,breadboard.z-34.29+h.row*2.54];
}
export const strip=(h:Hole)=>`${h.row}:${h.col<5?'left':'right'}`;
const hole=(row:number,col:number):Hole=>({row,col});
// Component leads and jumper plugs always occupy different sockets.
export const mountedLeads:Record<string,Hole>={
 'led.resistorIn':hole(9,6),'led.resistorOut':hole(9,3),'led.anode':hole(9,0),'led.GND':hole(11,0),
 'rgb.resistor23':hole(6,6),'rgb.out23':hole(6,3),'rgb.R':hole(6,0),
 'rgb.resistor19':hole(8,6),'rgb.out19':hole(8,3),'rgb.G':hole(8,0),
 'rgb.resistor18':hole(9,6),'rgb.out18':hole(9,3),'rgb.B':hole(9,0),'rgb.GND':hole(7,0),
 'pot.VCC':hole(20,3),'pot.signal':hole(21,3),'pot.GND':hole(22,3),
};
export const jumperSockets:Record<string,Hole>={
 'led.resistorIn':hole(9,9),'led.GND':hole(11,2),
 'rgb.resistor23':hole(6,9),'rgb.resistor19':hole(8,9),'rgb.resistor18':hole(9,9),'rgb.GND':hole(7,2),
 'led.groundBranch':hole(11,4),'rgb.groundBranch':hole(7,4),
 'pot.VCC':hole(20,0),'pot.signal':hole(21,0),'pot.GND':hole(22,0),
 ...Object.fromEntries(Array.from({length:5},(_,i)=>['breadboard.ground'+i,hole(26,i)])),
 ...Object.fromEntries(Array.from({length:5},(_,i)=>['breadboard.power'+i,hole(27,i+5)])),
 ...Object.fromEntries(Array.from({length:4},(_,i)=>['breadboard.robotGround'+i,hole(26,i)])),
 'breadboard.robotGroundBridgeIn':hole(26,4),'breadboard.robotGroundBridgeOut':hole(25,0),
 ...Object.fromEntries(Array.from({length:4},(_,i)=>['breadboard.robotGround'+(i+4),hole(25,i+1)])),
 ...Object.fromEntries(Array.from({length:5},(_,i)=>['breadboard.robotLogic'+i,hole(27,i+5)])),
 ...Object.fromEntries(Array.from({length:5},(_,i)=>['breadboard.robotPower'+i,hole(24,i+5)])),
};
export function connectedByStrip(a:string,b:string){
 return Boolean(mountedLeads[a]&&mountedLeads[b]&&strip(mountedLeads[a])===strip(mountedLeads[b]));
}

export function physicalJumpers(lesson:Lesson){
 const groundPart=lesson.parts.includes('rgb')?'rgb':lesson.parts.includes('led')?'led':null;
 const nets=connections(lesson).filter(c=>!connectedByStrip(c.from,c.to));
 if(isRobotLesson(lesson.id)){
  let ground=1,logic=1,power=1;
  const result=nets.map(c=>{
   if(c.to==='board.GND')return {...c,to:'breadboard.robotGround'+ground++};
   if(c.from==='board.3V3')return {...c,from:'breadboard.robotLogic'+logic++};
   if(c.from==='supply.positive')return {...c,from:'breadboard.robotPower'+power++};
   return c;
  });
  if(ground>1)result.push({from:'board.GND',to:'breadboard.robotGround0',color:'#505359'});
  if(ground>4)result.push({from:'breadboard.robotGroundBridgeIn',to:'breadboard.robotGroundBridgeOut',color:'#505359'});
  if(logic>1)result.push({from:'board.3V3',to:'breadboard.robotLogic0',color:'#bb6958'});
  if(power>1)result.push({from:'supply.positive',to:'breadboard.robotPower0',color:'#c58a4d'});
  return result;
 }
 if(lesson.parts.some(p=>['ldr','soil','piano'].includes(p))){
  let ground=1,power=1;const result=nets.map(c=>{
   if(c.to==='board.GND')return {...c,to:'breadboard.ground'+ground++};
   if(c.from==='board.3V3')return {...c,from:'breadboard.power'+power++};
   return c;
  });
  if(ground>1)result.push({from:'board.GND',to:'breadboard.ground0',color:'#505359'});
  if(power>1)result.push({from:'board.3V3',to:'breadboard.power0',color:'#bb6958'});
  return result;
 }
 return nets.map(c=>c.from==='pot.GND'&&groundPart?{...c,to:groundPart+'.groundBranch'}:c);
}
