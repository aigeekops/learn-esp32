import type {Values} from './lessons.ts';
import {noteFrequencies,noteNames} from './lessons.ts';
import {RobotSimulation} from './robot-simulation.ts';
import {isRobotLesson,type RobotSnapshot} from './robot-shared.ts';
export const adc=(volts:number)=>Math.round(Math.min(1,Math.max(0,volts/3.1))*4095);
export const relativeMoisture=(raw:number,dry:number,wet:number)=>Math.max(0,Math.min(100,Math.trunc((raw-dry)*100/(wet-dry))));
export interface Snapshot {
 led:boolean;level:number;duty:number;rgb:[number,number,number];pressed:boolean;raw:number;volts:number;temperature:number;mv:number;
 frequency:number;angle:number;network:string;ip:string;oled:string[];displayValue:number;time:number;
 moisture:number;soilRaw:number;soilWetness:number;watering:boolean;light:number;noteIndex:number;note:string;
 robot?:RobotSnapshot;
}
export class Simulation {
 time=0;button=false;keys=new Set<number>();lastReport=-1;lastLed:boolean|undefined;lastButton=false;lastNote=-1;webLed=false;response='';
 sampledTemperature=25;sensorAt=0;displayTemperature=25;displayAt=0;displayMoisture=55;displayMessage='Happy :)';
 moisture:number;private moistureInput:number;
 id:string;values:Values;onLog:(text:string)=>void;
 robot?:RobotSimulation;
 constructor(id:string,values:Values,onLog:(text:string)=>void){this.id=id;this.values=values;this.onLog=onLog;this.moisture=this.moistureInput=Number(values.moisture??55);if(isRobotLesson(id))this.robot=new RobotSimulation(id,values,onLog);}
 input(pressed:boolean){this.button=pressed;}
 key(index:number,held:boolean){if(index<0||index>7)return;if(held)this.keys.add(index);else this.keys.delete(index);}
 network(){return !['wifi','http','web','project'].includes(this.id)?'':this.time<2200?'CONNECTING':this.values.network==='wrong'?'AUTH_FAILED':this.values.network==='offline'?'DISCONNECTED':'CONNECTED';}
 soil(){const raw=Math.round(3300-19*this.moisture);return {raw,percent:relativeMoisture(raw,Number(this.values.dry??3300),Number(this.values.wet??1400))};}
 state(){const soil=this.soil();return {moisturePercent:soil.percent,raw:soil.raw,thresholdPercent:Number(this.values.thirsty),needsWater:soil.percent<Number(this.values.thirsty),networkConnected:this.network()==='CONNECTED'};}
 request(){
  if(this.robot){this.robot.request();this.response=this.robot.response;return;}
  const p=this.values;
  if(this.network()!=='CONNECTED'){this.response='NETWORK: device is not connected';this.onLog(this.response);return;}
  if(this.id==='web'){
   const valid=p.requestValue==='0'||p.requestValue==='1';if(valid)this.webLed=p.requestValue==='1';
   this.response=valid?'200 '+JSON.stringify({led:this.webLed}):'400 {"error":"invalid value"}';
  }else if(this.id==='project'){
   if(p.plantRequest==='config'){
    const value=Number(p.webThreshold);
    if(!Number.isInteger(value)||value<10||value>50){this.response='400 {"error":"threshold must be integer 10-50"}';this.onLog(this.response);return;}
    p.thirsty=value;
   }
   this.response='200 '+JSON.stringify(this.state());
  }else this.response=p.path==='/missing'?'404 {"error":"not found"}':'200 '+JSON.stringify({temperatureC:Number(p.temperature)});
  this.onLog(this.response);
 }
 tick(dt:number):Snapshot{
  const elapsed=Math.max(0,Math.min(dt,1000));this.time+=elapsed;
  const p=this.values,n=(key:string,f=0)=>Number(p[key]??f),t=this.time,isPlant=this.id==='plant'||this.id==='project';
  if(isPlant){
   if(n('moisture',55)!==this.moistureInput){this.moisture=this.moistureInput=n('moisture',55);}
   const drying=p.sun==='sun'?4:p.sun==='shade'?.5:1.8;
   this.moisture=Math.max(0,Math.min(100,this.moisture+(this.button?18:-drying)*elapsed/1000));
  }
  const soil=this.soil(),light=n('light',75),knobVolts=3.3*n('knob',50)/100;
  const volts=this.id==='light'?3.3*10000/(1000+99000*Math.pow(1-light/100,2)+10000):isPlant?soil.raw/4095*3.1:knobVolts;
  const raw=isPlant?soil.raw:adc(volts),duty=Math.floor(raw*255/4095);
  const sensorPeriod=this.id==='display'?n('refresh',500):200;
  if(t-this.sensorAt>=sensorPeriod){this.sampledTemperature=n('temperature',25);this.sensorAt=t;}
  const temperature=this.sampledTemperature,threshold=n('threshold',30),thirsty=soil.percent<n('thirsty',30);
  let led=false,level=0,frequency=0;
  const noteIndex=this.keys.size?Math.max(...this.keys):-1,note=noteIndex<0?'—':noteNames[noteIndex];
  const rgb:[number,number,number]=[n('red',255),n('green',80),n('blue',20)];
  switch(this.id){
   case 'distance':led=p.rangeMode==='timeout'||n('distance',70)<=n('stopDistance',20);break;
   case 'blink':led=t%(n('on',500)+n('off',500))<n('on',500);break;
   case 'button':led=this.button!==(p.inverted==='1');break;
   case 'knob':level=duty/255;led=duty>0;break;
   case 'pwm':level=Math.max(...rgb)/255;led=level>0;break;
   case 'light':led=raw<n('lightThreshold',1800);break;
   case 'temperature':led=temperature>=threshold;if(led&&t%1000<100)frequency=2000;break;
   case 'timing':led=this.button||Math.floor(t/n('interval',500))%2===1;break;
   case 'piano':if(noteIndex>=0)frequency=noteFrequencies[noteIndex]*n('octave',1);break;
   case 'project':led=thirsty;if(thirsty&&t%1000<100)frequency=2000;break;
   case 'web':led=this.webLed;break;
  }
  if(!['knob','pwm'].includes(this.id))level=led?Math.min(1,220/n('ohms',330)):0;
  const network=this.network(),oledPeriod=this.id==='project'||this.id==='plant'?500:n('refresh',500);
  if(t-this.displayAt>=oledPeriod){
   this.displayTemperature=temperature;this.displayMoisture=soil.percent;
   this.displayMessage=thirsty?'Water me!':soil.percent>n('soggy',85)?'Too wet!':'Happy :)';this.displayAt=t;
  }
  const interval=this.id==='board'?1000:this.id==='timing'?n('period',500):this.id==='knob'||this.id==='light'?100:this.id==='temperature'?200:500;
  const report=Math.floor(t/interval);
  if(report!==this.lastReport){
   this.lastReport=report;let text='';
   switch(this.id){
    case 'board':text=(report===0?'ESP32 ready\n':'')+'loop '+report;break;
    case 'knob':text='ADC='+raw+' PWM='+duty;break;
    case 'light':text='LIGHT='+raw+' LED='+Number(led);break;
    case 'temperature':text=temperature.toFixed(1)+' C ALARM='+Number(led);break;
    case 'timing':if(t>=interval)text='ADC='+raw+' BUTTON='+Number(!this.button);break;
    case 'plant':text='RAW='+soil.raw+' MOISTURE='+soil.percent+'%';break;
    case 'wifi':text=network==='CONNECTED'?'192.168.4.23':'WiFi status: '+network;break;
    case 'http':case 'web':case 'project':if(network==='CONNECTED'&&t-interval<2200)text='192.168.4.23';break;
   }if(text)text.split('\n').forEach(s=>this.onLog(s));
  }
  if(this.id==='blink'&&led!==this.lastLed){this.onLog('GPIO23='+Number(led));this.lastLed=led;}
  if(this.id==='button'&&this.button!==this.lastButton){this.onLog('BUTTON='+Number(!this.button)+' LED='+Number(led));this.lastButton=this.button;}
  if(this.id==='piano'&&noteIndex!==this.lastNote){this.onLog(noteIndex<0?'Note off':note+' '+frequency+' Hz');this.lastNote=noteIndex;}
  return {led,level,duty,rgb,pressed:this.button,raw,volts,temperature,mv:500+temperature*10,frequency,angle:(n('pulse',1500)-1500)/1000*Math.PI,network,ip:network==='CONNECTED'?'192.168.4.23':'—',
   oled:isPlant?['ESP32 GARDEN',this.displayMoisture+'%',this.displayMessage]:['ESP32 THERMOMETER',this.displayTemperature.toFixed(1)+' C','LIVE SENSOR'],displayValue:isPlant?this.displayMoisture:this.displayTemperature/60*100,
   moisture:soil.percent,soilRaw:soil.raw,soilWetness:this.moisture,watering:isPlant&&this.button,light,noteIndex,note,time:t,robot:this.robot?.tick(elapsed)};
 }
}
