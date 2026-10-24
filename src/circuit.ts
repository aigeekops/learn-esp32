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
 const rows=l.pins.filter(p=>p.target!=='board'),h=Math.max(164,rows.length*58+96);
 const line=(d:string,color='#505359',className='')=>'<path class="'+className+'" d="'+d+'" fill="none" stroke="'+color+'" stroke-width="1.6"/>';
 const label=(x:number,y:number,t:string,size=12)=>'<text x="'+x+'" y="'+y+'" font-family="monospace" font-size="'+size+'" fill="#394655">'+t+'</text>';
 const ground=(x:number,y:number)=>line('M'+x+' '+y+'v5m-7 0h14m-11 3h8m-6 3h4');
 const hit=(id:string,name:string,x:number,y:number,w:number,height:number,body:string)=>'<g class="schematic-hit" data-circuit-part="'+id+'" role="button" tabindex="0" aria-label="'+name+'" aria-pressed="false"><rect class="hit-area" x="'+x+'" y="'+y+'" width="'+w+'" height="'+height+'" rx="5" fill="transparent"/>'+body+'</g>';
 let body=hit('board','ESP32',10,14,90,h-52,'<rect x="14" y="18" width="82" height="'+(h-62)+'" rx="6" fill="#f4efdf" stroke="#394655"/>'+label(29,38,'ESP32',14));
 rows.forEach((p,i)=>{
  const y=66+i*58;
  body+='<g data-signal="'+p.pin+'">';
  body+=hit('pin-'+p.pin,'GPIO '+p.pin,16,y-15,78,31,label(23,y+4,'IO'+p.pin,13))+line('M96 '+y+'H142',p.color,'signal-wire');
  if(p.target==='led'||p.target==='rgb'){
   body+=hit(p.target==='led'?'resistor':'rgb',english?'Series resistor':'限流电阻',137,y-28,57,46,line('M142 '+y+'l4 -5 6 10 6 -10 6 10 4 -5h26',p.color)+label(139,y-12,p.target==='led'?String(v.ohms??330)+' Ω':'330 Ω',11));
   body+=hit(p.target,p.target==='rgb'?'RGB LED':'LED',200,y-28,83,51,line('M194 '+y+'h22',p.color)+'<path class="led-emitter" d="M216 '+(y-7)+'v14l14 -7Z" fill="none" stroke="#505359" stroke-width="1.6"/>'+line('M230 '+(y-7)+'v14m0 -7h27v9')+line('M220 '+(y-11)+'l6 -6m-1 9 6 -6')+ground(257,y+9)+label(272,y+4,p.target==='rgb'?'RGB '+({'23':'R','19':'G','18':'B'}[p.pin]??''):'LED',12));
  }else if(p.target==='button'){
   body+=hit('button',english?'Button':'按钮',138,y-21,174,49,line('M142 '+y+'h20',p.color)+'<path class="switch-lever" data-open="M162 '+(y-3)+'l20 -11" data-closed="M162 '+y+'h20" d="M162 '+(y-3)+'l20 -11" fill="none" stroke="'+p.color+'" stroke-width="1.6"/>'+line('M182 '+y+'h31v9',p.color)+ground(213,y+9)+label(237,y+4,english?'Button':'按钮',12))+label(104,y+24,'INPUT_PULLUP',10);
  }else{
   const terminal=p.target==='oled'?(p.pin==='21'?'SDA':'SCL'):p.target==='servo'?'SIG':p.target==='sensor'?'VOUT':p.target==='pot'?'WIPER':'+';
   body+=hit(p.target,names[p.target]?.[english?1:0]??p.target,142,y-20,210,40,line('M142 '+y+'h14',p.color)+'<rect x="156" y="'+(y-15)+'" width="190" height="32" rx="4" fill="#f4efdf" stroke="#637a78"/>'+label(164,y+5,(names[p.target]?.[english?1:0]??p.target)+' · '+terminal,11));
  }
  body+='<text data-level x="101" y="'+(y+16)+'" font-family="monospace" font-size="10" fill="#57847f"></text></g>';
 });
 if(!rows.length){body+=hit('power','3V3 / GND',18,52,154,49,label(24,70,'3V3 = 3.3 V',12)+label(24,92,'GND = 0 V',12));for(const [i,id] of l.parts.entries())body+=hit(id,id,184,38+i*38,154,34,'<rect x="184" y="'+(38+i*38)+'" width="154" height="30" rx="4" fill="#f4efdf" stroke="#637a78"/>'+label(195,58+i*38,id==='router'?'Wi-Fi 2.4 GHz':'Device / API',12));}
 const powered=[...new Set(connections(l).filter(c=>c.from==='board.3V3').map(c=>c.to.split('.')[0]))];
 body+=hit('power',english?'Power and common ground':'电源与公共地',8,h-35,346,33,label(14,h-22,powered.length?'3V3 → '+powered.map(p=>names[p][english?1:0]).join(' / '):'3.3 V GPIO',10)+label(14,h-7,l.id==='servo'?(english?'Servo: external 5 V · common GND':'舵机：独立 5 V · 所有器件共地'):(english?'GND → ESP32 GND':'所有器件 GND → ESP32 GND'),11));
 return '<svg class="circuit" viewBox="0 0 364 '+h+'" role="group" aria-label="'+(english?'Interactive circuit diagram':'可交互电路原理图')+'">'+body+'</svg>';
}
