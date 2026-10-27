import type {RobotSnapshot} from './robot-shared.ts';

const states:Record<string,string>={MEASURING:'测距中',RANGE_TIMEOUT:'无回波 · 已停车',OPEN_LOOP:'开环控制',CLOSED_LOOP:'闭环控制',IDLE:'等待指令',DRIVE:'执行中',STOPPED:'已停车',TIMEOUT:'指令超时 · 已停车',BLOCKED:'障碍停车',CONNECTED:'已连接',DISCONNECTED:'已断开',CHANNEL_MISMATCH:'信道不匹配'};
export function robotState(value:string,english=false){return english?value:states[value]??value;}
export function robotReadout(id:string,s:RobotSnapshot,english=false){
 const t=(zh:string,en:string)=>english?en:zh;
 if(id==='distance')return '<strong>'+ (s.rangeValid?s.distanceCm.toFixed(0)+' cm':t('没有回波','No echo'))+'</strong>'+ (s.rangeValid?Math.round(s.distanceCm*2/.0343)+' µs':t('无效测量 ≠ 0 cm','Invalid ≠ 0 cm'));
 if(id==='motor'||id==='encoder')return '<strong>'+s.rpmLeft.toFixed(0)+' RPM · PWM '+s.dutyLeft+'</strong>'+ (id==='encoder'?s.ticksLeft+' counts · A '+Number(s.encoderA)+' / B '+Number(s.encoderB):t('改变负载，比较实测转速','Change load and compare measured speed'));
 if(id==='speed')return '<strong>'+t('目标','Target')+' '+s.targetLeft.toFixed(0)+' → '+s.rpmLeft.toFixed(0)+' RPM</strong><span>'+robotState(s.mode,english)+' · PWM '+s.dutyLeft+'</span>'+speedChart(s,english);
 const twist=s.linear.toFixed(2)+' m/s · '+s.angular.toFixed(2)+' rad/s';
 const pose='<br>'+t('位姿','Pose')+' X '+s.x.toFixed(2)+' m · Y '+s.y.toFixed(2)+' m · '+t('航向','Heading')+' '+(s.heading*180/Math.PI).toFixed(1)+'°';
 if(id==='differential')return '<strong>'+twist+'</strong>'+robotState(s.mode,english)+'<br>L '+s.rpmLeft.toFixed(0)+' · R '+s.rpmRight.toFixed(0)+' RPM'+pose;
 return '<strong>'+twist+'</strong>'+robotState(s.mode,english)+'<br>L '+s.rpmLeft.toFixed(0)+' · R '+s.rpmRight.toFixed(0)+' RPM · '+robotState(s.link,english)+' · TX '+s.txCount+' / RX '+s.rxCount+pose+(id==='robot'?'<br>'+t('障碍距离','Obstacle')+' '+(s.rangeValid?s.distanceCm+' cm':t('无回波','No echo')):'');
}
function speedChart(s:RobotSnapshot,english:boolean){
 const end=s.history.at(-1)?.time??0,start=Math.max(0,end-6),span=6;
 const points=(key:'target'|'actual'|'duty')=>s.history.map(p=>`${(25+(p.time-start)/span*205).toFixed(1)},${(44-p[key]/(key==='duty'?255:180)*32).toFixed(1)}`).join(' ');
 return '<svg class="speed-chart" viewBox="0 0 240 100" role="img" aria-label="'+(english?'Six seconds of target and measured RPM, plus PWM':'最近六秒目标转速、实测转速和 PWM 曲线')+'"><path d="M25 12V76H232M25 44H232" fill="none" stroke="#c8c7b6"/><text x="0" y="16">180</text><text x="10" y="47">0</text><text x="0" y="77">−180</text><polyline points="'+points('target')+'" fill="none" stroke="#c4825e" stroke-width="1.7" stroke-dasharray="4 3"/><polyline points="'+points('actual')+'" fill="none" stroke="#478b85" stroke-width="2"/><polyline points="'+points('duty')+'" fill="none" stroke="#8b78a2" stroke-width="1"/><text x="28" y="93" fill="#a66d4c">'+(english?'Target':'目标 RPM')+'</text><text x="102" y="93" fill="#478b85">'+(english?'Measured':'实测 RPM')+'</text><text x="177" y="93" fill="#8b78a2">PWM ±255</text></svg>';
}
