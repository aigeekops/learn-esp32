import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lessons,boardLeft,boardRight,defaults} from '../src/lessons.ts';
import {componentDescription,descriptions} from '../src/component-info.ts';
import {circuitSvg} from '../src/circuit.ts';

test('all board pins and lesson parts have dedicated bilingual descriptions',()=>{
 for(const l of lessons){
  const ids=[...Object.keys(descriptions),...l.parts,...[...boardLeft,...boardRight].map(p=>'pin-'+({VP:'36',VN:'39',TX:'1',RX:'3'}[p]??p)),'pin-GND-1','pin-GND-2','capacitor-0','capacitor-1','board-capacitor-1','board-resistor-0','rgb-resistor-23','rgb-resistor-19','rgb-resistor-18'];
  for(const id of ids)for(const english of [false,true]){const description=componentDescription(id,l,english);assert.ok(description.length>10,id);assert.doesNotMatch(description,/undefined|NaN/);}
 }
 const knob=lessons.find(l=>l.id==='knob')!;
 assert.match(componentDescription('pin-34',knob),/ADC1_CH6.*只能输入/);
 assert.match(componentDescription('pin-34',knob),/电位器中间脚/);
 assert.match(componentDescription('pin-GND-2',knob),/公共地/);
 assert.doesNotMatch(componentDescription('pin-3V3',knob),/GPIO34–39/);
 const pwm=lessons.find(l=>l.id==='pwm')!;
 const svg=circuitSvg(pwm,defaults(pwm),false);
 for(const pin of ['23','19','18'])assert.ok(svg.includes(`data-circuit-part="rgb-resistor-${pin}"`));
});
