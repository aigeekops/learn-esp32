export const robotLessonIds=['distance','motor','encoder','speed','differential','uart','ble','espnow','robot'] as const;
export const isRobotLesson=(id:string)=>robotLessonIds.includes(id as typeof robotLessonIds[number]);
export interface RobotSnapshot {
 distanceCm:number;rangeValid:boolean;targetLeft:number;targetRight:number;rpmLeft:number;rpmRight:number;
 dutyLeft:number;dutyRight:number;angleLeft:number;angleRight:number;ticksLeft:number;ticksRight:number;
 x:number;y:number;heading:number;linear:number;angular:number;link:string;mode:string;txCount:number;rxCount:number;
 response:string;encoderA:boolean;encoderB:boolean;history:{time:number;target:number;actual:number;duty:number}[];
}
