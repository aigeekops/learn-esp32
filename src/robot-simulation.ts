import type {Values} from './lessons.ts';
import type {RobotSnapshot} from './robot-shared.ts';

const clamp=(value:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,value));
const communication=new Set(['uart','ble','espnow','robot']);
const dual=new Set(['differential','uart','ble','espnow','robot']);
const TAU=2*Math.PI;
const ENCODER_COUNTS_PER_REV=360;
//~ROS 2 Twist 语义：线速度 m/s、偏航角速度 rad/s~ROS 2 Twist semantics: m/s and rad/s
const MAX_LINEAR=.25,MAX_ANGULAR=2;

/** A teaching model, with finite motor response and quantised encoder measurements. */
export class RobotSimulation {
 id:string;values:Values;onLog:(text:string)=>void;response='';
 private time=0;private sampleTime=0;private lastCommand=-Infinity;
 private commandLeft=0;private commandRight=0;private targetLeft=0;private targetRight=0;
 private velocity=[0,0];private angles=[0,0];private counts=[0,0];private sampledCounts=[0,0];
 private measured=[0,0];private duties=[0,0];private integral=[0,0];
 private pose=[0,0,0];private txCount=0;private rxCount=0;private mode='IDLE';
 private history:RobotSnapshot['history']=[];
 constructor(id:string,values:Values,onLog:(text:string)=>void){this.id=id;this.values=values;this.onLog=onLog;}
 private n(key:string,fallback:number){const value=Number(this.values[key]??fallback);return Number.isFinite(value)?value:fallback;}
 private link(){
  if(!communication.has(this.id))return '—';
  if(this.values.linkState==='disconnected')return 'DISCONNECTED';
  if(this.id==='espnow'&&this.n('channel',6)!==this.n('peerChannel',6))return 'CHANNEL_MISMATCH';
  return 'CONNECTED';
 }
 request(){
  if(!communication.has(this.id))return;
  this.txCount++;
  const link=this.link();
  if(link!=='CONNECTED'){this.response='NO_REPLY '+link;this.onLog(this.response);return;}
  const command=String(this.values.command??'twist');
  if(command==='stop'){
   this.commandLeft=0;this.commandRight=0;this.lastCommand=this.time;this.rxCount++;
   this.resolveTargets();this.response='OK '+JSON.stringify({stop:true,mode:this.mode});this.onLog(this.response);return;
  }
  const linear=Number(this.values.linear),angular=Number(this.values.angular);
  if(command!=='twist'||!Number.isFinite(linear)||!Number.isFinite(angular)||Math.abs(linear)>MAX_LINEAR||Math.abs(angular)>MAX_ANGULAR){
   this.response='ERR invalid command';this.onLog(this.response);return;
  }
  const wheels=this.twistToWheels(linear,angular);
  this.commandLeft=wheels.left;this.commandRight=wheels.right;this.lastCommand=this.time;this.rxCount++;
  this.resolveTargets();
  this.response='OK '+JSON.stringify({linear,angular,targetLeft:this.targetLeft,targetRight:this.targetRight,mode:this.mode});
  this.onLog(this.response);
 }
 //~Twist 换算成轮速：超 150 RPM 时等比缩放，保持曲率~Twist to wheel RPM, scaled together above 150
 private twistToWheels(linear:number,angular:number){
  const radius=Math.max(.005,this.n('wheelRadius',.0325)),track=Math.max(.02,this.n('trackWidth',.145));
  const left=(linear-angular*track/2)/radius*60/TAU,right=(linear+angular*track/2)/radius*60/TAU;
  const scale=Math.max(1,Math.abs(left)/150,Math.abs(right)/150);
  return {left:left/scale,right:right/scale};
 }
 private resolveTargets(){
  const {id}=this;
  this.targetLeft=0;this.targetRight=0;
  if(id==='distance'){this.mode=this.values.rangeMode==='timeout'?'RANGE_TIMEOUT':'MEASURING';return;}
  if(id==='motor'||id==='encoder'){
   this.targetLeft=clamp(this.n('drive',128),-255,255)/255*180;this.mode='OPEN_LOOP';
  }else if(id==='speed'){
   this.targetLeft=clamp(this.n('targetRpm',90),-180,180);this.mode=this.values.control==='open'?'OPEN_LOOP':'CLOSED_LOOP';
  }else if(id==='differential'){
   const wheels=this.twistToWheels(this.n('linear',.15),this.n('angular',0));
   this.targetLeft=wheels.left;this.targetRight=wheels.right;this.mode='CLOSED_LOOP';
  }else if(communication.has(id)){
   if(id==='ble'&&this.link()==='DISCONNECTED'){
    this.commandLeft=0;this.commandRight=0;this.lastCommand=-Infinity;this.mode='DISCONNECTED';return;
   }
   if(id==='robot'&&(this.values.rangeMode==='timeout'||this.n('distance',80)<=this.n('stopDistance',20))){
    this.commandLeft=0;this.commandRight=0;this.lastCommand=-Infinity;this.mode=this.values.rangeMode==='timeout'?'RANGE_TIMEOUT':'BLOCKED';return;
   }
   if(this.time-this.lastCommand>=1000){this.mode=Number.isFinite(this.lastCommand)?'TIMEOUT':'IDLE';return;}
   this.targetLeft=this.commandLeft;this.targetRight=this.commandRight;
   this.mode=this.targetLeft===0&&this.targetRight===0?'STOPPED':'DRIVE';
  }
 }
 private control(sampleSeconds:number){
  const targets=[this.targetLeft,this.targetRight];
  for(let i=0;i<2;i++){
   if(targets[i]===0){this.integral[i]=0;this.duties[i]=0;continue;}
   if(this.mode==='OPEN_LOOP'){this.integral[i]=0;this.duties[i]=clamp(Math.round(targets[i]/180*255),-255,255);continue;}
   const error=targets[i]-this.measured[i],kp=this.n('kp',1.2),ki=this.n('ki',3);
   const next=this.integral[i]+ki*error*sampleSeconds,unclipped=kp*error+next;
   // Integrate only while within the limit or when correcting saturated output.
   if(Math.abs(unclipped)<=255||unclipped>255&&error<0||unclipped< -255&&error>0)this.integral[i]=next;
   this.integral[i]=clamp(this.integral[i],-255,255);
   this.duties[i]=clamp(Math.round(kp*error+this.integral[i]),-255,255);
  }
 }
 tick(dt:number):RobotSnapshot{
  let remaining=clamp(Number.isFinite(dt)?dt:0,0,1000);
  this.resolveTargets();this.control(0);
  while(remaining>0){
   const step=Math.min(remaining,10),seconds=step/1000;remaining-=step;this.time+=step;
   this.resolveTargets();
   // Stops take effect at the next model step; the wheel retains mechanical inertia.
   if(this.targetLeft===0){this.duties[0]=0;this.integral[0]=0;}
   if(this.targetRight===0){this.duties[1]=0;this.integral[1]=0;}
   const maxRpm=180*(1-.7*clamp(this.n('load',0),0,80)/100),cpr=Math.max(1,this.n('cpr',360));
   for(let i=0;i<2;i++){
    if(i===1&&!dual.has(this.id)){this.velocity[i]=0;continue;}
    const equilibrium=this.duties[i]/255*maxRpm;
    this.velocity[i]+=(equilibrium-this.velocity[i])*(1-Math.exp(-seconds/.25));
    this.angles[i]+=this.velocity[i]/60*TAU*seconds;
    // Hardware emits fixed pulses; changing the software CPR only changes its interpretation.
    this.counts[i]=Math.trunc(this.angles[i]/TAU*ENCODER_COUNTS_PER_REV);
   }
   if(dual.has(this.id)){
    const radius=Math.max(.005,this.n('wheelRadius',.0325)),track=Math.max(.02,this.n('trackWidth',.145));
    const left=this.measured[0]/60*TAU*radius,right=this.measured[1]/60*TAU*radius;
    const speed=(left+right)/2,turn=(right-left)/track,mid=this.pose[2]+turn*seconds/2;
    this.pose[0]+=speed*Math.cos(mid)*seconds;this.pose[1]+=speed*Math.sin(mid)*seconds;this.pose[2]+=turn*seconds;
   }
   const elapsed=this.time-this.sampleTime;
   if(elapsed>=100){
    for(let i=0;i<2;i++){
     this.measured[i]=(this.counts[i]-this.sampledCounts[i])*60000/(cpr*elapsed);
     this.sampledCounts[i]=this.counts[i];
    }
    this.control(elapsed/1000);this.sampleTime=this.time;
    this.history.push({time:this.time/1000,target:this.targetLeft,actual:this.measured[0],duty:this.duties[0]});
    if(this.history.length>60)this.history.shift();
    if(Math.floor(this.time/500)!==Math.floor((this.time-elapsed)/500))this.onLog(this.id==='distance'?(this.values.rangeMode==='timeout'?'RANGE TIMEOUT':`DISTANCE ${this.n('distance',80).toFixed(1)} cm`):`TARGET ${this.targetLeft.toFixed(1)} / ${this.targetRight.toFixed(1)} RPM | MEASURED ${this.measured[0].toFixed(1)} / ${this.measured[1].toFixed(1)} | PWM ${this.duties[0]} / ${this.duties[1]} | ${this.mode}`);
   }
  }
  const radius=Math.max(.005,this.n('wheelRadius',.0325)),track=Math.max(.02,this.n('trackWidth',.145));
  const left=this.measured[0]/60*TAU*radius,right=this.measured[1]/60*TAU*radius;
  const phase=((this.counts[0]%4)+4)%4;
  return {distanceCm:clamp(this.n('distance',80),5,200),rangeValid:this.values.rangeMode!=='timeout',targetLeft:this.targetLeft,targetRight:this.targetRight,
   rpmLeft:this.measured[0],rpmRight:this.measured[1],dutyLeft:this.duties[0],dutyRight:this.duties[1],angleLeft:this.angles[0],angleRight:this.angles[1],ticksLeft:this.counts[0],ticksRight:this.counts[1],
   x:this.pose[0],y:this.pose[1],heading:this.pose[2],linear:(left+right)/2,angular:(right-left)/track,link:this.link(),mode:this.mode,txCount:this.txCount,rxCount:this.rxCount,response:this.response,
   encoderA:phase===1||phase===2,encoderB:phase===2||phase===3,history:this.history.slice()};
 }
}
