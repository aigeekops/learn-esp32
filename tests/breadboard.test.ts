import {test} from 'node:test';
import assert from 'node:assert/strict';
import {holePosition,mountedLeads,jumperSockets,strip,connectedByStrip,physicalJumpers} from '../src/breadboard.ts';
import {lessons} from '../src/lessons.ts';
import {connections,circuitSvg} from '../src/circuit.ts';
import {isRobotLesson} from '../src/robot-shared.ts';

test('LED, RGB and potentiometer use distinct sockets and electrically correct five-hole strips',()=>{
 for(const lesson of lessons){
  const endpoints=Object.keys(mountedLeads).filter(e=>lesson.parts.includes(e.split('.')[0] as never));
  const occupied=new Set<string>();
  for(const endpoint of endpoints){
   for(const h of [mountedLeads[endpoint],jumperSockets[endpoint]].filter(Boolean)){
    const key=`${h.row}:${h.col}`;assert.ok(!occupied.has(key),`${lesson.id}: shared socket ${key}`);occupied.add(key);
    assert.ok(holePosition(h).every(Number.isFinite));
   }
   if(jumperSockets[endpoint])assert.equal(strip(mountedLeads[endpoint]),strip(jumperSockets[endpoint]));
  }
  const jumpers=physicalJumpers(lesson);
  for(const net of jumpers)for(const endpoint of [net.from,net.to])if(endpoint.endsWith('.groundBranch')){const h=jumperSockets[endpoint];assert.ok(!occupied.has(`${h.row}:${h.col}`));assert.equal(strip(h),strip(mountedLeads[endpoint.split('.')[0]+'.GND']));}
  if(lesson.parts.includes('pot')&&(lesson.parts.includes('led')||lesson.parts.includes('rgb')))assert.equal(jumpers.filter(c=>c.from==='pot.GND'&&c.to.endsWith('.groundBranch')).length,1);
  for(const net of connections(lesson))if(net.from.startsWith('led.')&&net.to.startsWith('led.')||net.from.startsWith('rgb.')&&net.to.startsWith('rgb.'))assert.ok(connectedByStrip(net.from,net.to));
 }
 for(const [a,b] of [['led.resistorIn','led.resistorOut'],['led.anode','led.GND'],['rgb.resistor23','rgb.out23'],['rgb.resistor19','rgb.out19'],['rgb.resistor18','rgb.out18']])assert.notEqual(strip(mountedLeads[a]),strip(mountedLeads[b]),`${a} must not be shorted to ${b}`);
 assert.equal(new Set(['rgb.R','rgb.G','rgb.B','rgb.GND'].map(e=>strip(mountedLeads[e]))).size,4);
 assert.equal(new Set(['pot.VCC','pot.signal','pot.GND'].map(e=>strip(mountedLeads[e]))).size,3);
});

test('robot power distribution uses separate sockets, common ground and a divided Echo input',()=>{
 for(const lesson of lessons.filter(l=>isRobotLesson(l.id))){
  const nets=physicalJumpers(lesson),occupied=new Set<string>();
  for(const net of nets)for(const endpoint of [net.from,net.to]){
   assert.ok(!occupied.has(endpoint),`${lesson.id}: shared terminal ${endpoint}`);occupied.add(endpoint);
  }
  const sockets=[...occupied].filter(e=>e.startsWith('breadboard.')).map(e=>{
   assert.ok(jumperSockets[e],e);return jumperSockets[e];
  });
  assert.equal(new Set(sockets.map(h=>h.row+':'+h.col)).size,sockets.length,lesson.id+' shared physical socket');
  assert.equal(nets.filter(c=>c.from==='board.GND'||c.to==='board.GND').length,1);
  assert.equal(nets.filter(c=>c.from==='supply.positive').length,1);
  assert.notEqual(strip(jumperSockets['breadboard.robotPower0']),strip(jumperSockets['breadboard.robotLogic0']));
  if([...occupied].some(e=>/^breadboard\.robotGround[4-7]$/.test(e)))assert.ok(nets.some(c=>c.from==='breadboard.robotGroundBridgeIn'&&c.to==='breadboard.robotGroundBridgeOut'));
  const logical=connections(lesson);
  if(lesson.parts.includes('ranger')){
   assert.ok(logical.some(c=>c.from==='board.14'&&c.to==='ranger.echoDividerOut'));
   assert.ok(logical.some(c=>c.from==='ranger.ECHO'&&c.to==='ranger.echoDividerIn'));
   assert.ok(logical.some(c=>c.from==='ranger.echoDividerGND'&&c.to==='board.GND'));
   assert.match(circuitSvg(lesson,{},false),/data-circuit-part="echo-resistor-upper"/);
   assert.match(circuitSvg(lesson,{},false),/data-circuit-part="echo-resistor-lower"/);
  }
  if(lesson.parts.includes('motor'))assert.ok(logical.some(c=>c.from==='driver.AO1'&&c.to==='motor.M1'));
  if(lesson.parts.includes('chassis'))assert.ok(logical.some(c=>c.from==='driver.BO2'&&c.to==='chassis.RM2'));
  assert.ok(!logical.some(c=>/^(phone|peer)\./.test(c.from)||/^(phone|peer)\./.test(c.to)));
 }
});

// One distribution strip uses a different physical hole for each lead.
test('new multi-part lessons distribute ground and power without sharing sockets',()=>{
 for(const lesson of lessons.filter(l=>l.parts.some(p=>['ldr','soil','piano'].includes(p)))){
  const nets=physicalJumpers(lesson),used=new Set<string>();
  for(const net of nets)for(const endpoint of [net.from,net.to])if(endpoint.startsWith('breadboard.')){
   const h=jumperSockets[endpoint];assert.ok(h,endpoint);const key=h.row+':'+h.col;assert.ok(!used.has(key),lesson.id+' duplicate '+key);used.add(key);
   assert.equal(strip(h),strip(jumperSockets[endpoint.startsWith('breadboard.ground')?'breadboard.ground0':'breadboard.power0']));
  }
  assert.equal(nets.filter(n=>n.from==='board.GND'||n.to==='board.GND').length,1);
  assert.notEqual(strip(jumperSockets['breadboard.ground0']),strip(jumperSockets['breadboard.power0']));
 }
});
