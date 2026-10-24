import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lessons,defaults,normalize,boardLeft,boardRight} from '../src/lessons.ts';
import {source} from '../src/firmware.ts';
import {connections} from '../src/circuit.ts';
import {lessonGuide} from '../src/lesson-guide.ts';
import {Simulation,adc,relativeMoisture} from '../src/simulation.ts';
const lesson=(id:string)=>lessons.find(l=>l.id===id)!;
const sim=(id:string)=>new Simulation(id,defaults(lesson(id)),()=>{});
const advance=(m:Simulation,ms:number)=>{let state=m.tick(0);while(ms>0){const step=Math.min(ms,10);state=m.tick(step);ms-=step;}return state;};
test('25 lessons have complete sketches, bilingual guidance and valid GPIO routes',()=>{
 assert.equal(lessons.length,25);assert.equal(new Set(lessons.map(l=>l.id)).size,25);assert.equal(boardLeft.length+boardRight.length,38);
 const pins=new Set([...boardLeft,...boardRight]);
 for(const l of lessons){assert.doesNotMatch(source(l,defaults(l)),/@@|undefined|NaN/);assert.match(source(l,defaults(l)),/void setup\(\)/);assert.equal(lessonGuide[l.id].featuresEn.length,3);assert.ok(lessonGuide[l.id].steps.length>=3);assert.ok(lessonGuide[l.id].en.length>=3);for(const c of connections(l))for(const endpoint of [c.from,c.to])if(endpoint.startsWith('board.'))assert.ok(pins.has(endpoint.slice(6)),endpoint);}
});
test('saved inputs clamp to course limits and reject invalid options',()=>{
 const p=normalize(lesson('blink'),{on:-99,off:99999,color:'invalid',ohms:'220',unknown:9});assert.equal(p.on,50);assert.equal(p.off,2000);assert.equal(p.color,'#df554b');assert.equal(p.ohms,'220');assert.equal(p.unknown,undefined);
});
test('LED timing, held input and ADC saturation follow the circuit',()=>{
 const blink=sim('blink');assert.equal(blink.tick(0).led,true);assert.equal(advance(blink,500).led,false);assert.equal(advance(blink,500).led,true);
 const button=sim('button');assert.equal(button.tick(0).led,false);button.input(true);assert.equal(button.tick(1).led,true);button.input(false);assert.equal(button.tick(1).led,false);
 assert.equal(adc(0),0);assert.equal(adc(1.55),2048);assert.equal(adc(3.1),4095);assert.equal(adc(3.3),4095);
 const timing=sim('timing');assert.equal(timing.tick(0).led,false);timing.input(true);assert.equal(timing.tick(1).led,true);timing.input(false);assert.equal(timing.tick(1).led,false);assert.equal(advance(timing,500).led,true);
});
test('knob brightness, RGB channels, light divider and temperature alarm respond to their inputs',()=>{
 const knob=sim('knob');knob.values.knob=0;assert.equal(knob.tick(0).level,0);knob.values.knob=100;assert.equal(knob.tick(0).duty,255);knob.values.knob=47;assert.ok(Math.abs(knob.tick(0).level-.5)<.01);
 const pwm=sim('pwm');pwm.values.red=0;pwm.values.green=255;pwm.values.blue=0;assert.deepEqual(pwm.tick(0).rgb,[0,255,0]);
 const light=sim('light');light.values.light=0;const dark=light.tick(0);light.values.light=100;const bright=light.tick(0);assert.ok(dark.raw<bright.raw);assert.equal(dark.led,true);assert.equal(bright.led,false);light.values.light=80;light.values.lightThreshold=3900;assert.equal(light.tick(0).led,true);
 const hot=sim('temperature');hot.values.temperature=40;assert.equal(advance(hot,1000).frequency,2000);hot.values.temperature=20;assert.equal(advance(hot,200).led,false);assert.equal(hot.tick(0).frequency,0);
});
test('piano holds one note, prioritises the highest pressed key, changes octave and releases',()=>{
 const m=sim('piano');assert.equal(m.tick(0).frequency,0);m.key(0,true);assert.equal(m.tick(0).frequency,262);m.key(4,true);assert.equal(m.tick(0).note,'Sol');m.values.octave='2';assert.equal(m.tick(0).frequency,784);m.key(4,false);assert.equal(m.tick(0).frequency,524);m.key(0,false);assert.equal(m.tick(0).frequency,0);
});
test('plants dry, recover with manual watering, and calibration changes interpretation rather than soil',()=>{
 const m=sim('plant');m.values.moisture=20;m.values.sun='sun';assert.equal(m.tick(0).moisture,20);assert.ok(advance(m,1000).soilWetness<20);assert.equal(advance(m,500).oled[2],'Water me!');
 m.input(true);const wet=advance(m,4000);assert.ok(wet.moisture>80);assert.equal(wet.watering,true);m.input(false);assert.equal(m.tick(0).watering,false);
 const physical=m.moisture;m.values.dry=3800;const recalibrated=m.tick(0);assert.equal(m.moisture,physical);assert.notEqual(recalibrated.moisture,wet.moisture);
 assert.equal(relativeMoisture(3300,3300,1400),0);assert.equal(relativeMoisture(1400,3300,1400),100);assert.equal(relativeMoisture(3900,3300,1400),0);assert.equal(relativeMoisture(0,3300,1400),100);
 for(const dry of [2800,3800])for(const wet of [700,2200])assert.ok(dry>wet);
});
test('OLED holds the sampled display until the next refresh',()=>{
 const m=sim('display');m.values.temperature=42;assert.equal(advance(m,490).oled[1],'25.0 C');assert.equal(advance(m,10).oled[1],'42.0 C');
});
test('HTTP needs a connection, rejects invalid commands and returns the updated shared garden state',()=>{
 const m=sim('web');m.request();assert.match(m.response,/not connected/);advance(m,2300);m.request();assert.equal(m.tick(0).led,true);m.values.requestValue='2';m.request();assert.match(m.response,/^400/);assert.equal(m.tick(0).led,true);m.values.requestValue='0';m.request();assert.equal(m.tick(0).led,false);
 const http=sim('http');advance(http,2300);http.values.path='/missing';http.request();assert.match(http.response,/^404/);
 const garden=sim('project');garden.values.moisture=35;advance(garden,2300);garden.request();assert.match(garden.response,/"moisturePercent":/);garden.values.plantRequest='config';garden.values.webThreshold=45;garden.request();assert.equal(garden.values.thirsty,45);assert.match(garden.response,/"needsWater":true/);assert.equal(garden.tick(0).led,true);garden.values.webThreshold=9;garden.request();assert.match(garden.response,/^400/);assert.equal(garden.values.thirsty,45);
});
