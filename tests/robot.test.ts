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
test('TWIST maps m/s and rad/s to wheel RPM and scales above the limit',()=>{
 const straight=new RobotSimulation('uart',{linear:.15,angular:0,command:'twist',linkState:'connected'},()=>{});
 straight.request();const a=straight.tick(0);
 assert.ok(Math.abs(a.targetLeft-44.1)<.5);assert.ok(Math.abs(a.targetRight-44.1)<.5);
 straight.values.angular=1;straight.request();const turn=straight.tick(0);
 assert.ok(turn.targetLeft>0&&turn.targetLeft<turn.targetRight);
 straight.values.linear=.3;straight.request();assert.match(straight.response,/ERR/);assert.ok(Math.abs(straight.tick(0).targetLeft-turn.targetLeft)<.01);
 const scaled=new RobotSimulation('uart',{linear:.25,angular:2,command:'twist',wheelRadius:.02,trackWidth:.145},()=>{});
 scaled.request();const s=scaled.tick(0);
 assert.ok(Math.abs(Math.abs(s.targetRight)-150)<.01);assert.ok(Math.abs(s.targetLeft/s.targetRight-((.25-.145)/(.25+.145)))<.01);
});
test('valid TWIST commands drive, malformed input does not refresh the 1-second watchdog',()=>{
 const m=new RobotSimulation('uart',{linear:.15,angular:.5,command:'twist',linkState:'connected'},()=>{});
 assert.equal(advance(m,500).dutyLeft,0);m.request();
 assert.ok(Math.abs(m.tick(0).targetLeft-33.4)<1);assert.ok(Math.abs(m.tick(0).targetRight-54.7)<1);
 advance(m,700);m.values.linear=.3;m.request();assert.match(m.response,/ERR/);assert.ok(Math.abs(m.tick(0).targetLeft-33.4)<1);
 const timedOut=advance(m,300);assert.equal(timedOut.targetLeft,0);assert.equal(timedOut.dutyLeft,0);assert.equal(timedOut.mode,'TIMEOUT');assert.equal(timedOut.rxCount,1);
 m.values.command='stop';m.request();assert.equal(m.tick(0).mode,'STOPPED');
 const wrapper=new Simulation('uart',{linear:.15,angular:0,command:'twist'},()=>{});wrapper.request();assert.match(wrapper.response,/OK/);assert.ok(Math.abs((wrapper.tick(100).robot?.targetLeft??0)-44.1)<1);
});
test('BLE disconnect and ESP-NOW channel mismatch reject delivery without changing commands',()=>{
 const ble=new RobotSimulation('ble',{linkState:'disconnected',linear:.15,angular:0,command:'twist'},()=>{});ble.request();assert.equal(ble.tick(0).rxCount,0);assert.equal(ble.tick(0).targetLeft,0);
 ble.values.linkState='connected';ble.request();assert.equal(ble.tick(0).rxCount,1);advance(ble,500);ble.values.linkState='disconnected';ble.values.linear=.2;ble.request();assert.equal(ble.tick(0).targetLeft,0);assert.equal(ble.tick(0).dutyLeft,0);ble.values.linkState='connected';assert.equal(ble.tick(0).targetLeft,0);
 const radio=new RobotSimulation('espnow',{channel:6,peerChannel:1,linear:.15,angular:0,command:'twist'},()=>{});radio.request();assert.equal(radio.tick(0).txCount,1);assert.equal(radio.tick(0).rxCount,0);assert.equal(radio.tick(0).link,'CHANNEL_MISMATCH');
 radio.values.peerChannel=6;radio.request();const state=advance(radio,300);assert.equal(state.txCount,2);assert.equal(state.rxCount,1);assert.ok(state.rpmLeft>0);radio.request();assert.match(radio.response,/"targetLeft":[1-9]/);
});
test('robot integrates measured wheels into pose while driving and turning',()=>{
 const m=new RobotSimulation('robot',{distance:80,rangeMode:'valid',stopDistance:20,linear:.15,angular:0,command:'twist',linkState:'connected'},()=>{});
 for(let i=0;i<10;i++){m.request();advance(m,500);}
 const straight=m.tick(0);assert.ok(straight.x>.5);assert.ok(Math.abs(straight.y)<.02);assert.ok(Math.abs(straight.heading)<.05);
 m.values.linear=0;m.values.angular=1;
 for(let i=0;i<6;i++){m.request();advance(m,500);}
 const turn=m.tick(0);assert.ok(turn.heading>1.5);
 // 原地旋转仍会有小幅漂移：编码器量化和轮径误差会累积
 assert.ok(Math.abs(turn.x-straight.x)<.15);assert.ok(Math.abs(turn.y-straight.y)<.15);
});
test('robot stops on near obstacles or failed ranges, including reverse commands',()=>{
 const m=new RobotSimulation('robot',{distance:80,rangeMode:'valid',stopDistance:20,linear:.15,angular:0,command:'twist'},()=>{});m.request();assert.ok(advance(m,200).dutyLeft>0);
 m.values.distance=20;let state=m.tick(0);assert.equal(state.targetLeft,0);assert.equal(state.dutyLeft,0);assert.equal(state.mode,'BLOCKED');
 m.values.distance=80;assert.equal(m.tick(0).targetLeft,0);m.request();assert.ok(m.tick(0).targetLeft>40);m.values.rangeMode='timeout';state=m.tick(0);assert.equal(state.rangeValid,false);assert.equal(state.dutyLeft,0);
 m.values.linear=-.15;m.request();assert.equal(m.tick(0).targetLeft,0);m.values.rangeMode='valid';assert.equal(m.tick(0).targetLeft,0);m.request();assert.ok(m.tick(0).targetLeft<-40);
 assert.equal(advance(m,1000).targetLeft,0);
 const ranging=new Simulation('distance',{distance:10,stopDistance:20,rangeMode:'valid'},()=>{});assert.equal(ranging.tick(0).led,true);ranging.values.distance=50;assert.equal(ranging.tick(0).led,false);ranging.values.rangeMode='timeout';assert.equal(ranging.tick(0).led,true);
});
