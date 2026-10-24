import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RobotSimulation} from '../src/robot-simulation.ts';
import {Simulation} from '../src/simulation.ts';
const advance=(m:RobotSimulation,ms:number)=>{let state=m.tick(0);while(ms>0){const step=Math.min(ms,20);state=m.tick(step);ms-=step;}return state;};
test('load slows an open-loop motor; PI recovers a reachable target and clears output at zero',()=>{
 const open=new RobotSimulation('speed',{targetRpm:90,control:'open',load:50},()=>{});
 assert.ok(advance(open,3000).rpmLeft<65);
 const closed=new RobotSimulation('speed',{targetRpm:90,control:'closed',load:0,kp:1.2,ki:3},()=>{});
 assert.ok(Math.abs(advance(closed,5000).rpmLeft-90)<5);
 closed.values.load=50;const recovered=advance(closed,7000);assert.ok(Math.abs(recovered.rpmLeft-90)<5);assert.ok(recovered.dutyLeft>180);assert.equal(recovered.history.length,60);
 closed.values.targetRpm=0;assert.equal(closed.tick(0).dutyLeft,0);assert.ok(Math.abs(advance(closed,2000).rpmLeft)<2);
 closed.values.targetRpm=180;closed.values.load=80;assert.ok(advance(closed,5000).dutyLeft<=255);closed.values.targetRpm=0;assert.equal(closed.tick(0).dutyLeft,0);
});
test('encoder ticks reverse and differential motion integrates measured wheels',()=>{
 const motor=new RobotSimulation('encoder',{drive:-160,cpr:360},()=>{}),state=advance(motor,1200);
 assert.ok(state.ticksLeft<0);assert.ok(state.rpmLeft<0);assert.equal(state.ticksRight,0);assert.ok(Number.isInteger(state.ticksLeft));
 motor.values.cpr=720;const recalibrated=advance(motor,1200);assert.ok(Math.abs(recalibrated.rpmLeft/state.rpmLeft-.5)<.05);
 const straight=new RobotSimulation('differential',{linear:.15,angular:0},()=>{}),a=advance(straight,3000);
 assert.ok(a.x>.25);assert.equal(a.heading,0);assert.equal(a.y,0);
 const turn=new RobotSimulation('differential',{linear:0,angular:1},()=>{}),b=advance(turn,3000);
 assert.ok(b.heading>1);assert.ok(b.rpmLeft<0&&b.rpmRight>0);assert.ok(Math.abs(b.x)<.01);
});
test('valid commands drive, malformed input does not refresh the 1-second watchdog',()=>{
 const m=new RobotSimulation('uart',{leftRpm:60,rightRpm:80,command:'set',linkState:'connected'},()=>{});
 assert.equal(advance(m,500).dutyLeft,0);m.request();assert.equal(m.tick(0).targetRight,80);
 advance(m,700);m.values.command='invalid';m.request();assert.match(m.response,/ERR/);assert.equal(m.tick(0).targetLeft,60);
 const timedOut=advance(m,300);assert.equal(timedOut.targetLeft,0);assert.equal(timedOut.dutyLeft,0);assert.equal(timedOut.mode,'TIMEOUT');assert.equal(timedOut.rxCount,1);
 m.values.command='stop';m.request();assert.equal(m.tick(0).mode,'STOPPED');
 const wrapper=new Simulation('uart',{leftRpm:40,rightRpm:40},()=>{});wrapper.request();assert.match(wrapper.response,/OK/);assert.equal(wrapper.tick(100).robot?.targetLeft,40);
});
test('BLE disconnect and ESP-NOW channel mismatch reject delivery without changing commands',()=>{
 const ble=new RobotSimulation('ble',{linkState:'disconnected',leftRpm:60,rightRpm:60},()=>{});ble.request();assert.equal(ble.tick(0).rxCount,0);assert.equal(ble.tick(0).targetLeft,0);
 ble.values.linkState='connected';ble.request();assert.equal(ble.tick(0).rxCount,1);advance(ble,500);ble.values.linkState='disconnected';ble.values.leftRpm=120;ble.request();assert.equal(ble.tick(0).targetLeft,0);assert.equal(ble.tick(0).dutyLeft,0);ble.values.linkState='connected';assert.equal(ble.tick(0).targetLeft,0);
 const radio=new RobotSimulation('espnow',{channel:6,peerChannel:1,leftRpm:60,rightRpm:60},()=>{});radio.request();assert.equal(radio.tick(0).txCount,1);assert.equal(radio.tick(0).rxCount,0);assert.equal(radio.tick(0).link,'CHANNEL_MISMATCH');
 radio.values.peerChannel=6;radio.request();const state=advance(radio,300);assert.equal(state.txCount,2);assert.equal(state.rxCount,1);assert.ok(state.rpmLeft>0);radio.request();assert.match(radio.response,/"leftRpm":[1-9]/);
});
test('robot stops on near obstacles or failed ranges, including reverse commands',()=>{
 const m=new RobotSimulation('robot',{distance:80,rangeMode:'valid',stopDistance:20,leftRpm:60,rightRpm:60},()=>{});m.request();assert.ok(advance(m,200).dutyLeft>0);
 m.values.distance=20;let state=m.tick(0);assert.equal(state.targetLeft,0);assert.equal(state.dutyLeft,0);assert.equal(state.mode,'BLOCKED');
 m.values.distance=80;assert.equal(m.tick(0).targetLeft,0);m.request();assert.equal(m.tick(0).targetLeft,60);m.values.rangeMode='timeout';state=m.tick(0);assert.equal(state.rangeValid,false);assert.equal(state.dutyLeft,0);
 m.values.leftRpm=-60;m.values.rightRpm=-60;m.request();assert.equal(m.tick(0).targetLeft,0);m.values.rangeMode='valid';assert.equal(m.tick(0).targetLeft,0);m.request();assert.equal(m.tick(0).targetLeft,-60);
 assert.equal(advance(m,1000).targetLeft,0);
 const ranging=new Simulation('distance',{distance:10,stopDistance:20,rangeMode:'valid'},()=>{});assert.equal(ranging.tick(0).led,true);ranging.values.distance=50;assert.equal(ranging.tick(0).led,false);ranging.values.rangeMode='timeout';assert.equal(ranging.tick(0).led,true);
});
