import type {Lesson,Values} from './lessons.ts';

export interface Connection {from:string;to:string;color:string;}
export function connections(l:Lesson):Connection[]{
 const result:Connection[]=[];
 const wire=(from:string,to:string,color:string)=>result.push({from,to,color});
 for(const p of l.pins){
  if(p.target==='led')wire('board.'+p.pin,'led.resistorIn',p.color);
  else if(p.target==='rgb')wire('board.'+p.pin,'rgb.resistor'+p.pin,p.color);
  else if(p.target!=='board')wire('board.'+p.pin,p.target+'.'+(p.target==='oled'?(p.pin==='21'?'SDA':'SCL'):'signal'),p.color);
 }
 for(const part of l.parts){
  if(['router','browser'].includes(part))continue;
  wire(part+'.GND','board.GND','#505359');
  if(['pot','sensor','oled'].includes(part))wire('board.3V3',part+'.VCC','#bb6958');
  if(part==='led')wire('led.resistorOut','led.anode','#c87748');
  if(part==='rgb')for(const [pin,ch,color] of [['23','R','#c87748'],['19','G','#69a47c'],['18','B','#7196c2']])wire('rgb.out'+pin,'rgb.'+ch,color);
  if(part==='servo'){wire('supply.positive','servo.VCC','#bb6958');wire('supply.negative','board.GND','#505359');}
 }
 return result;
}
const names:Record<string,[string,string]>={led:['LED','LED'],button:['按钮','Button'],pot:['10 kΩ 电位器','10 kΩ pot'],rgb:['共阴极 RGB','RGB LED'],sensor:['TMP36','TMP36'],oled:['SSD1306 OLED','SSD1306 OLED'],buzzer:['无源压电片','Piezo'],servo:['舵机','Servo']};
export function circuitSvg(l:Lesson,v:Values,english:boolean):string{
 const rows=l.pins.filter(p=>p.target!=='board'),h=Math.max(140,rows.length*43+94);
 const line=(d:string,color='#505359')=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="1.5"/>';
 const label=(x:number,y:number,t:string,size=10)=>'<text x="'+x+'" y="'+y+'" font-family="monospace" font-size="'+size+'" fill="#394655">'+t+'</text>';
 const ground=(x:number,y:number)=>line('M'+x+' '+y+'v5m-7 0h14m-11 3h8m-6 3h4');
 let body='<rect x="8" y="18" width="77" height="'+(h-51)+'" rx="6" fill="#f4efdf" stroke="#394655"/>'+label(24,36,'ESP32',12);
 rows.forEach((p,i)=>{
  const y=58+i*43;
  body+='<g data-signal="'+p.pin+'">';
  body+=label(15,y+3,'IO'+p.pin)+line('M85 '+y+'H121',p.color);
  if(p.target==='led'||p.target==='rgb'){
   body+=line('M121 '+y+'l4 -4 6 8 6 -8 6 8 4 -4h32',p.color)+label(119,y-10,p.target==='led'?String(v.ohms??330)+' Ω':'330 Ω',8);
   body+=line('M179 '+(y-6)+'v12l12 -6Zm12 0v12m0 -6h18v9')+line('M184 '+(y-9)+'l5 -5m-1 8 5 -5')+ground(209,y+9)+label(220,y+3,p.target==='rgb'?'RGB '+({'23':'R','19':'G','18':'B'}[p.pin]??''): 'LED');
  }else if(p.target==='button'){
   body+=line('M121 '+y+'h21m-1 -3 18 -9m0 12h29v9',p.color)+ground(188,y+9)+label(203,y+3,english?'Button':'按钮')+label(93,y+19,'INPUT_PULLUP',8);
  }else{
   const terminal=p.target==='oled'?(p.pin==='21'?'SDA':'SCL'):p.target==='servo'?'SIG':p.target==='sensor'?'VOUT':p.target==='pot'?'WIPER':'+';
   body+=line('M121 '+y+'h25',p.color)+'<rect x="146" y="'+(y-11)+'" width="160" height="26" rx="4" fill="#f4efdf" stroke="#637a78"/>'+label(153,y+5,(names[p.target]?.[english?1:0]??p.target)+' · '+terminal,9);
  }
  body+='<text data-level x="89" y="'+(y+12)+'" font-family="monospace" font-size="7" fill="#57847f"></text></g>';
 });
 if(!rows.length)body+=label(17,70,'3V3 = 3.3 V')+label(17,92,'GND = 0 V');
 const powered=[...new Set(connections(l).filter(c=>c.from==='board.3V3').map(c=>c.to.split('.')[0]))];
 body+=label(10,h-28,powered.length?'3V3 → '+powered.map(p=>names[p][english?1:0]).join(' / '):'3.3 V GPIO',8)+label(10,h-13,l.id==='servo'?(english?'Servo: external 5 V · common GND':'舵机：独立 5 V · 所有器件共地'):(english?'All component GND → ESP32 GND':'所有器件 GND → ESP32 GND'),9);
 return '<svg class="circuit" viewBox="0 0 320 '+h+'" role="img" aria-label="'+(english?'Circuit connections':'电路连接')+'">'+body+'</svg>';
}
