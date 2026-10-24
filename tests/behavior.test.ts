import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lessons,defaults,normalize,boardLeft,boardRight} from '../src/lessons.ts';
import {source} from '../src/firmware.ts';
import {connections} from '../src/circuit.ts';
import {Simulation,nextAlarm,adc} from '../src/simulation.ts';
const lesson=(id:string)=>lessons.find(l=>l.id===id)!;
const sim=(id:string)=>new Simulation(id,defaults(lesson(id)),()=>{});
const advance=(m:Simulation,ms:number)=>{let state=m.tick(0);while(ms>0){const step=Math.min(ms,10);state=m.tick(step);ms-=step;}return state;};
test('16 default examples have complete parameters and valid physical GPIO routes',()=>{
 assert.equal(lessons.length,16);assert.equal(new Set(lessons.map(l=>l.id)).size,16);assert.equal(boardLeft.length+boardRight.length,38);
 const pins=new Set([...boardLeft,...boardRight]);
 for(const l of lessons){assert.doesNotMatch(source(l,defaults(l)),/@@|undefined|NaN/);assert.match(source(l,defaults(l)),/void setup\(\)/);for(const c of connections(l)){for(const endpoint of [c.from,c.to])if(endpoint.startsWith('board.'))assert.ok(pins.has(endpoint.slice(6)),endpoint);}}
});
test('saved inputs clamp to course limits and reject invalid options',()=>{
 const p=normalize(lesson('blink'),{on:-99,off:99999,color:'invalid',ohms:'220',unknown:9});
 assert.equal(p.on,50);assert.equal(p.off,2000);assert.equal(p.color,'#df554b');assert.equal(p.ohms,'220');assert.equal(p.unknown,undefined);
});
test('LED timing, held button and ADC saturation follow the circuit',()=>{
 const blink=sim('blink');assert.equal(blink.tick(0).led,true);assert.equal(advance(blink,500).led,false);assert.equal(advance(blink,500).led,true);
 const button=sim('button');assert.equal(button.tick(0).led,false);button.input(true);assert.equal(button.tick(1).led,true);button.input(false);assert.equal(button.tick(1).led,false);
 assert.equal(adc(0),0);assert.equal(adc(1.55),2048);assert.equal(adc(3.1),4095);assert.equal(adc(3.3),4095);
 const timing=sim('timing');assert.equal(timing.tick(0).led,false);assert.equal(advance(timing,500).led,true);
});
test('alarm priority, stable press, acknowledgement and cooling reset',()=>{
 assert.equal(nextAlarm('NORMAL',30,30,true),'ALARM');assert.equal(nextAlarm('ALARM',29,30,true),'NORMAL');
 const m=sim('alarm');m.values.temperature=35;assert.equal(advance(m,200).alarm,'ALARM');
 m.input(true);assert.equal(advance(m,20).alarm,'ALARM');m.input(false);advance(m,40);assert.equal(m.alarm,'ALARM');
 m.input(true);assert.equal(advance(m,40).alarm,'ACK');m.input(false);advance(m,40);assert.equal(m.alarm,'ACK');
 m.values.temperature=20;assert.equal(advance(m,200).alarm,'NORMAL');m.values.temperature=35;assert.equal(advance(m,200).alarm,'ALARM');
});
test('OLED respects refresh timing and PWM knob uses 12-bit ADC',()=>{
 const m=sim('display');m.values.temperature=42;assert.equal(advance(m,490).oled[1],'25.0 C');assert.equal(advance(m,10).oled[1],'42.0 C');
 const pwm=sim('pwm');pwm.values.pwmMode='knob';pwm.values.knob=0;assert.deepEqual(pwm.tick(0).rgb,[0,0,0]);pwm.values.knob=100;assert.deepEqual(pwm.tick(0).rgb,[255,255,255]);
});
test('HTTP needs a connection, validates input and returns updated state',()=>{
 const m=sim('web');m.request();assert.match(m.response,/not connected/);advance(m,2300);m.request();assert.equal(m.tick(0).led,true);m.values.requestValue='2';m.request();assert.match(m.response,/^400/);assert.equal(m.tick(0).led,true);m.values.requestValue='0';m.request();assert.equal(m.tick(0).led,false);
 const http=sim('http');advance(http,2300);http.values.path='/missing';http.request();assert.match(http.response,/^404/);
 const project=sim('project');advance(project,2300);project.values.webThreshold=20;project.request();assert.equal(project.values.threshold,20);assert.match(project.response,/"alarmState":"ALARM"/);project.values.webThreshold=9;project.request();assert.match(project.response,/^400/);assert.equal(project.values.threshold,20);
});
