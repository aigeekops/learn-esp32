import type {Lesson,Values} from './lessons.ts';
import {pianoPins,noteNames} from './lessons.ts';
import {isRobotLesson} from './robot-shared.ts';

export interface Connection {from:string;to:string;color:string;}
export function connections(l:Lesson):Connection[]{
 const result:Connection[]=[];
 const wire=(from:string,to:string,color:string)=>result.push({from,to,color});
 if(isRobotLesson(l.id)){
  for(const p of l.pins){
   const terminal=p.target==='ranger'&&p.terminal==='ECHO'?'echoDividerOut':p.terminal??'signal';
   wire('board.'+p.pin,p.target+'.'+terminal,p.color);
  }
  for(const part of l.parts){
   if(['obstacle','phone','peer'].includes(part))continue;
   wire(part+'.GND','board.GND','#505359');
   if(part==='driver'){wire('board.3V3','driver.VCC','#bb6958');wire('supply.positive','driver.VM','#c58a4d');}
   if(part==='motor'||part==='chassis')wire('board.3V3',part+'.encoderVCC','#bb6958');
   if(part==='ranger'){
    wire('supply.positive','ranger.VCC','#c58a4d');wire('ranger.ECHO','ranger.echoDividerIn','#7196a8');wire('ranger.echoDividerGND','board.GND','#505359');
   }
   if(part==='led')wire('led.resistorOut','led.anode','#c87748');
  }
  if(l.parts.includes('motor')){wire('driver.AO1','motor.M1','#c87748');wire('driver.AO2','motor.M2','#6a969d');}
  if(l.parts.includes('chassis'))for(const [from,to,color] of [['AO1','LM1','#c87748'],['AO2','LM2','#6a969d'],['BO1','RM1','#c87748'],['BO2','RM2','#6a969d']])wire('driver.'+from,'chassis.'+to,color);
  wire('supply.negative','board.GND','#505359');
  return result;
 }
 for(const p of l.pins){
  if(p.target==='led')wire('board.'+p.pin,'led.resistorIn',p.color);
  else if(p.target==='rgb')wire('board.'+p.pin,'rgb.resistor'+p.pin,p.color);
  else if(p.target!=='board')wire('board.'+p.pin,p.target+'.'+(p.target==='oled'?(p.pin==='21'?'SDA':'SCL'):p.target==='piano'?'key'+pianoPins.indexOf(p.pin):'signal'),p.color);
 }
 for(const part of l.parts){
  if(['router','browser','lamp','plant','watering'].includes(part))continue;
  wire(part+'.GND','board.GND','#505359');
  if(['pot','sensor','oled','ldr','soil'].includes(part))wire('board.3V3',part+'.VCC','#bb6958');
  if(part==='led')wire('led.resistorOut','led.anode','#c87748');
  if(part==='rgb')for(const [pin,ch,color] of [['23','R','#c87748'],['19','G','#69a47c'],['18','B','#7196c2']])wire('rgb.out'+pin,'rgb.'+ch,color);
  if(part==='servo'){wire('supply.positive','servo.VCC','#bb6958');wire('supply.negative','board.GND','#505359');}
 }
 return result;
}
const names:Record<string,[string,string]>={led:['LED','LED'],button:['按钮','Button'],pot:['10 kΩ 电位器','10 kΩ pot'],rgb:['共阴极 RGB','RGB LED'],sensor:['TMP36','TMP36'],oled:['SSD1306 OLED','SSD1306 OLED'],buzzer:['无源压电片','Piezo'],servo:['舵机','Servo'],piano:['八键钢琴','Piano'],ldr:['光敏分压','LDR divider'],soil:['土壤传感器','Soil sensor'],driver:['TB6612 驱动','TB6612 driver'],motor:['电机编码器','Motor encoder'],chassis:['双轮编码器','Wheel encoders'],ranger:['HC-SR04','HC-SR04'],computer:['3.3 V 上位机','3.3 V UART host']};
export function circuitSvg(l:Lesson,v:Values,english:boolean):string{
 const robot=isRobotLesson(l.id),rows=l.pins.filter(p=>p.target!=='board'),outputs=l.parts.includes('chassis')?2:l.parts.includes('motor')?1:0,h=Math.max(164,rows.length*58+96+(robot?outputs*47+74:0));
 const line=(d:string,color='#505359',className='')=>'<path class="'+className+'" d="'+d+'" fill="none" stroke="'+color+'" stroke-width="1.6"/>';
 const label=(x:number,y:number,t:string,size=12)=>'<text x="'+x+'" y="'+y+'" font-family="monospace" font-size="'+size+'" fill="#18213d">'+t+'</text>';
 const ground=(x:number,y:number)=>line('M'+x+' '+y+'v5m-7 0h14m-11 3h8m-6 3h4');
 const hit=(id:string,name:string,x:number,y:number,w:number,height:number,body:string)=>'<g class="schematic-hit" data-circuit-part="'+id+'" role="button" tabindex="0" aria-label="'+name+'" aria-pressed="false"><rect class="hit-area" x="'+x+'" y="'+y+'" width="'+w+'" height="'+height+'" rx="5" fill="transparent"/>'+body+'</g>';
 let body=hit('board','ESP32',10,14,90,h-52,'<rect x="14" y="18" width="82" height="'+(h-62)+'" rx="6" fill="#f4efdf" stroke="#394655"/>'+label(29,38,'ESP32',14));
 rows.forEach((p,i)=>{
  const y=66+i*58;
  body+='<g data-signal="'+p.pin+'">';
  body+=hit('pin-'+p.pin,'GPIO '+p.pin,16,y-15,78,31,label(23,y+4,'IO'+p.pin,13))+line('M96 '+y+'H142',p.color,'signal-wire');
  if(p.target==='led'||p.target==='rgb'){
   body+=hit(p.target==='led'?'resistor':'rgb-resistor-'+p.pin,english?'Series resistor':'限流电阻',137,y-28,57,46,line('M142 '+y+'l4 -5 6 10 6 -10 6 10 4 -5h26',p.color)+label(139,y-12,p.target==='led'?String(v.ohms??330)+' Ω':'330 Ω',11));
   body+=hit(p.target,p.target==='rgb'?'RGB LED':'LED',200,y-28,83,51,line('M194 '+y+'h22',p.color)+'<path class="led-emitter" d="M216 '+(y-7)+'v14l14 -7Z" fill="none" stroke="#505359" stroke-width="1.6"/>'+line('M230 '+(y-7)+'v14m0 -7h27v9')+line('M220 '+(y-11)+'l6 -6m-1 9 6 -6')+ground(257,y+9)+label(272,y+4,p.target==='rgb'?'RGB '+({'23':'R','19':'G','18':'B'}[p.pin]??''):'LED',12));
  }else if(p.target==='button'){
   body+=hit('button',english?'Button':'按钮',138,y-21,174,49,line('M142 '+y+'h20',p.color)+'<path class="switch-lever" data-open="M162 '+(y-3)+'l20 -11" data-closed="M162 '+y+'h20" d="M162 '+(y-3)+'l20 -11" fill="none" stroke="'+p.color+'" stroke-width="1.6"/>'+line('M182 '+y+'h31v9',p.color)+ground(213,y+9)+label(237,y+4,english?'Button':'按钮',12))+label(104,y+24,'INPUT_PULLUP',10);
  }else if(p.target==='piano'){
   const key=pianoPins.indexOf(p.pin),name=noteNames[key];
   body+=hit('key-'+key,name,138,y-21,174,49,line('M142 '+y+'h20',p.color)+'<path class="switch-lever" data-piano-key="'+key+'" data-open="M162 '+(y-3)+'l20 -11" data-closed="M162 '+y+'h20" d="M162 '+(y-3)+'l20 -11" fill="none" stroke="'+p.color+'" stroke-width="1.6"/>'+line('M182 '+y+'h31v9',p.color)+ground(213,y+9)+label(237,y+4,name,12))+label(104,y+24,'INPUT_PULLUP',10);
  }else if(p.target==='ldr'){
   body+=line('M142 '+y+'h65',p.color)+hit('ldr',english?'Light dependent resistor':'光敏电阻',188,y-32,136,33,line('M207 '+y+'v-7l-5 -3 10 -5 -10 -5 5 -3v-7')+label(218,y-15,'LDR',12)+label(257,y-25,'3V3',10));
   body+=hit('light-resistor','10 kΩ',188,y+1,136,38,line('M207 '+y+'v5l-5 3 10 5 -10 5 5 3v4')+ground(207,y+25)+label(222,y+19,'10 kΩ',12));
  }else if(p.target==='ranger'&&p.terminal==='ECHO'){
   body+=line('M142 '+y+'h60',p.color)+'<circle cx="166" cy="'+y+'" r="2.4" fill="'+p.color+'"/>';
   body+=hit('echo-resistor-upper','2.2 kΩ',196,y-26,63,39,line('M202 '+y+'l4 -5 6 10 6 -10 6 10 4 -5h28',p.color)+label(201,y-12,'2.2 kΩ',10));
   body+=hit('ranger','HC-SR04 ECHO',257,y-18,100,36,label(261,y+4,'ECHO 5 V',11));
   body+=hit('echo-resistor-lower','3.3 kΩ',151,y+2,103,37,line('M166 '+y+'v5l-4 3 8 4 -8 4 4 3v4')+ground(166,y+23)+label(181,y+19,'3.3 kΩ',10));
   body+=label(106,y-10,'≈3.0 V',10);
  }else{
   const terminal=p.terminal??(p.target==='oled'?(p.pin==='21'?'SDA':'SCL'):p.target==='servo'?'SIG':p.target==='sensor'?'VOUT':p.target==='soil'?'AOUT':p.target==='pot'?'WIPER':'+');
   body+=hit(p.target,names[p.target]?.[english?1:0]??p.target,142,y-20,210,40,line('M142 '+y+'h14',p.color)+'<rect x="156" y="'+(y-15)+'" width="190" height="32" rx="4" fill="#f4efdf" stroke="#637a78"/>'+label(164,y+5,(names[p.target]?.[english?1:0]??p.target)+' · '+terminal,11));
  }
  body+='<text data-level x="101" y="'+(y+16)+'" font-family="monospace" font-size="10" fill="#57847f"></text></g>';
 });
 if(robot){
  const start=66+rows.length*58;
  for(let i=0;i<outputs;i++){
   const y=start+i*47,channel=i?'B':'A',part=l.parts.includes('chassis')?'chassis':'motor',motorName=outputs===1?(english?'Motor':'电机'):(i?(english?'Right wheel':'右轮'):(english?'Left wheel':'左轮'));
   body+=hit('driver',english?'Motor power outputs':'电机功率输出',14,y-18,146,38,'<rect x="18" y="'+(y-14)+'" width="137" height="30" rx="4" fill="#f4efdf" stroke="#637a78"/>'+label(23,y+5,'TB6612 '+channel+'O1 / '+channel+'O2',10));
   body+=line('M155 '+(y-4)+'H222','#c87748')+line('M155 '+(y+7)+'H222','#6a969d');
   body+=hit(part,motorName,222,y-18,132,38,'<rect x="224" y="'+(y-14)+'" width="126" height="30" rx="4" fill="#f4efdf" stroke="#637a78"/>'+label(232,y+5,motorName+' M1 / M2',11));
  }
  const supplies=['5 V → '+[l.parts.includes('driver')?'VM':'',l.parts.includes('ranger')?'HC-SR04 VCC':''].filter(Boolean).join(' / '),'3V3 → '+(l.parts.includes('driver')?'VCC · encoder VCC':'ESP32 logic')];
  body+=hit('supply',english?'Independent regulated 5 V':'独立稳压 5 V',10,h-94,344,51,label(15,h-77,supplies[0],11)+label(15,h-56,supplies[1],11));
  const wireless=l.parts.includes('phone')?'phone':l.parts.includes('peer')?'peer':'';
  if(wireless)body+=hit(wireless,wireless==='phone'?'BLE GATT':'ESP-NOW',12,h-39,199,28,label(17,h-22,wireless==='phone'?'BLE GATT ))) ESP32':'ESP-NOW ))) ESP32',11));
 }
 if(!rows.length){body+=hit('power','3V3 / GND',18,52,154,49,label(24,70,'3V3 = 3.3 V',12)+label(24,92,'GND = 0 V',12));for(const [i,id] of l.parts.entries())body+=hit(id,id,184,38+i*38,154,34,'<rect x="184" y="'+(38+i*38)+'" width="154" height="30" rx="4" fill="#f4efdf" stroke="#637a78"/>'+label(195,58+i*38,id==='router'?'Wi-Fi 2.4 GHz':'Device / API',12));}
 const powered=[...new Set(connections(l).filter(c=>c.from==='board.3V3').map(c=>c.to.split('.')[0]))];
 body+=hit('power',english?'Power and common ground':'电源与公共地',8,robot?h-20:h-35,346,robot?18:33,(robot?'':label(14,h-22,powered.length?'3V3 → '+powered.map(p=>names[p][english?1:0]).join(' / '):'3.3 V GPIO',10))+label(14,h-7,l.id==='servo'?(english?'Servo: external 5 V · common GND':'舵机：独立 5 V · 所有器件共地'):(english?'All GND → ESP32 GND':'所有器件 GND → ESP32 GND'),11));
 return '<svg class="circuit" viewBox="0 0 364 '+h+'" role="group" aria-label="'+(english?'Interactive circuit diagram':'可交互电路原理图')+'">'+body+'</svg>';
}
