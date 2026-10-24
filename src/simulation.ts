import type { Values } from './lessons.ts';
export type AlarmState='NORMAL'|'ALARM'|'ACK';
export function nextAlarm(previous:AlarmState,temperature:number,threshold:number,pressed:boolean):AlarmState{
 if(temperature<threshold)return 'NORMAL';
 if(previous==='NORMAL')return 'ALARM';
 if(previous==='ALARM'&&pressed)return 'ACK';
 return previous;
}
export const adc=(volts:number)=>Math.round(Math.min(1,Math.max(0,volts/3.1))*4095);
export interface Snapshot {led:boolean;level:number;rgb:[number,number,number];pressed:boolean;raw:number;volts:number;temperature:number;mv:number;alarm:AlarmState;frequency:number;angle:number;network:string;ip:string;oled:string[];time:number;}
export class Simulation {
 time=0;alarm:AlarmState='NORMAL';button=false;stable=false;candidate=false;changedAt=0;
 lastReport=-1;lastLed:boolean|undefined;lastButton=false;webLed=false;response='';
 sampledTemperature=25;sensorAt=0;displayTemperature=25;displayAt=0;displayAlarm:AlarmState='NORMAL';displayThreshold=30;
 id:string;values:Values;onLog:(text:string)=>void;
 constructor(id:string,values:Values,onLog:(text:string)=>void){this.id=id;this.values=values;this.onLog=onLog;}
 input(pressed:boolean){this.button=pressed;}
 network(){return !['wifi','http','web','project'].includes(this.id)?'':this.time<2200?'CONNECTING':this.values.network==='wrong'?'AUTH_FAILED':this.values.network==='offline'?'DISCONNECTED':'CONNECTED';}
 state(){return {temperatureC:this.sampledTemperature,thresholdC:Number(this.values.threshold),alarmState:this.alarm,led:this.alarm!=='NORMAL',buzzer:this.alarm==='ALARM'&&this.time%1000<100,networkConnected:this.network()==='CONNECTED'};}
 request(){
  const p=this.values;
  if(this.network()!=='CONNECTED'){this.response='NETWORK: device is not connected';this.onLog(this.response);return;}
  if(this.id==='web'){
   const valid=p.requestValue==='0'||p.requestValue==='1';
   if(valid)this.webLed=p.requestValue==='1';
   this.response=valid?'200 '+JSON.stringify({led:this.webLed}):'400 {"error":"invalid value"}';
  }else if(this.id==='project'){
   const value=Number(p.webThreshold);
   if(!Number.isInteger(value)||value<10||value>50)this.response='400 {"error":"threshold must be integer 10-50"}';
   else{p.threshold=value;this.alarm=nextAlarm(this.alarm,this.sampledTemperature,value,false);this.response='200 '+JSON.stringify(this.state());}
  }else this.response=p.path==='/missing'?'404 {"error":"not found"}':'200 '+JSON.stringify({temperatureC:Number(p.temperature)});
  this.onLog(this.response);
 }
 tick(dt:number):Snapshot{
  this.time+=Math.max(0,Math.min(dt,1000));
  const p=this.values,n=(key:string,f=0)=>Number(p[key]??f),t=this.time;
  if(this.button!==this.candidate){this.candidate=this.button;this.changedAt=t;}
  let press=false;
  if(t-this.changedAt>=30&&this.stable!==this.candidate){this.stable=this.candidate;press=this.stable;}
  const threshold=n('threshold',30),volts=3.3*n('knob',50)/100,raw=adc(volts);
  const sensorPeriod=this.id==='display'?n('refresh',500):200;
  if((!['alarm','project','display'].includes(this.id)&&this.lastReport<0)||t-this.sensorAt>=sensorPeriod){this.sampledTemperature=n('temperature',25);this.sensorAt=t;}
  const temperature=this.sampledTemperature;
  if(this.id==='alarm'||this.id==='project')this.alarm=nextAlarm(this.alarm,temperature,threshold,press);
  let led=false,level=0,frequency=0;
  const rgb:[number,number,number]=[n('red',255),n('green',80),n('blue',20)];
  switch(this.id){
   case 'blink':led=t%(n('on',500)+n('off',500))<n('on',500);break;
   case 'serial':led=Math.floor(t/n('period',500))%2===0;break;
   case 'button':led=this.button!==(p.inverted==='1');break;
   case 'pwm':if(p.pwmMode==='knob'){const v=Math.floor(raw*255/4095);rgb.splice(0,3,v,v,v);}level=Math.max(...rgb)/255;led=level>0;break;
   case 'temperature':led=temperature>=threshold;break;
   case 'timing':led=Math.floor(t/n('interval',500))%2===1;break;
   case 'sound':if(t%(n('on',100)+n('off',900))<n('on',100))frequency=n('frequency',2000);break;
   case 'alarm':case 'project':led=this.alarm!=='NORMAL';if(this.alarm==='ALARM'&&t%1000<100)frequency=2000;break;
   case 'web':led=this.webLed;break;
  }
  if(this.id!=='pwm')level=led?Math.min(1,220/n('ohms',330)):0;
  const network=this.network(),oledPeriod=this.id==='project'?500:n('refresh',500);
  if(t-this.displayAt>=oledPeriod){this.displayTemperature=temperature;this.displayAlarm=this.alarm;this.displayThreshold=threshold;this.displayAt=t;}
  const interval=this.id==='board'?1000:this.id==='serial'||this.id==='timing'?n('period',500):this.id==='knob'?100:this.id==='temperature'?200:500;
  const report=Math.floor(t/interval);
  if(report!==this.lastReport){
   this.lastReport=report;let text='';
   switch(this.id){
    case 'board':text=(report===0?'ESP32 ready\n':'')+'loop '+report;break;
    case 'knob':text='ADC1 GPIO34 = '+raw;break;
    case 'temperature':text=temperature.toFixed(1)+' C';break;
    case 'timing':if(t>=interval)text='ADC='+raw;break;
    case 'alarm':if(t>=500)text='T='+temperature.toFixed(1)+' threshold='+threshold+' state='+['NORMAL','ALARM','ACK'].indexOf(this.alarm);break;
    case 'wifi':text=network==='CONNECTED'?'192.168.4.23':'WiFi status: '+network;break;
    case 'http':case 'web':case 'project':if(network==='CONNECTED'&&t-interval<2200)text='192.168.4.23';break;
    case 'serial':text='count='+report+' GPIO23='+Number(led);break;
   }if(text)text.split('\n').forEach(s=>this.onLog(s));
  }
  if(this.id==='timing'&&this.button!==this.lastButton){this.onLog('BUTTON='+Number(!this.button));this.lastButton=this.button;}
  return {led,level,rgb,pressed:this.button,raw,volts,temperature,mv:500+temperature*10,alarm:this.alarm,frequency,angle:(n('pulse',1500)-1500)/1000*Math.PI,network,ip:network==='CONNECTED'?'192.168.4.23':'—',oled:['ESP32 MONITOR',this.displayTemperature.toFixed(1)+' C',this.id==='project'?this.displayAlarm:'I2C 0x3C',this.id==='project'?'LIMIT '+this.displayThreshold+' C':'LIVE SENSOR'],time:t};
 }
}
