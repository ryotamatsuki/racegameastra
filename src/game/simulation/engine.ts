import {derive,standard,type Setup,type Stats} from '../../data/catalog';
import {tracks,sample,atU,add,sub,mul,dot,length,type V,type Track,type Frame} from './track';
export const DT=1/120;
export const tuning={gravity:9.81,airDensity:1.225,recoverySeconds:2,maxOuts:3,maxTime:180,overloadSeconds:.32,voltageSag:.25,capacityScale:8};
export type CarState='onTrack'|'airborne'|'recovering'|'finished'|'dnf';
export type Event={time:number;kind:'corner'|'landing'|'out'|'loop';detail:string};
export type Car={id:number;machine:number;setup:Setup;stats:Stats;lane:number;s:number;previousS:number;v:number;lap:number;lapTimes:number[];lastLap:number;finish:number|null;state:CarState;charge:number;overload:number;outs:number;recover:number;safeS:number;p:V;previousP:V;velocity:V;airTime:number;airStartU:number;events:Event[];wheel:number;progress:number};
export type Race={track:Track;cars:Car[];time:number;phase:'loading'|'ready'|'countdown'|'running'|'paused'|'finished';seed:number;countdown:number;mode:'race'|'time';};
export function driveForce(s:Stats,v:number,charge=1){const voltage=s.voltage/2.8*(1-tuning.voltageSag*(1-charge));const omega=v/s.radius*s.ratio,free=s.rpm*Math.PI/30*voltage;return s.torque*voltage*Math.max(0,1-omega/free)*s.ratio*s.efficiency/s.radius;}
export function contactAcceleration(f:Frame,v:number){return v*v*dot(f.k,f.n)+tuning.gravity*f.n.y;}
export function createRace(machine:number,setup:Setup,course:number,seed=731,mode:'race'|'time'='race'):Race{
 const track=tracks[course],cars:Car[]=[];const shift=((seed%4)+4)%4;
 for(let id=0;id<(mode==='race'?4:1);id++){const m=id===0?machine:(id+seed)%4,conf=id===0?{...setup}:standard(m),lane=mode==='time'?1:(id+shift)%4;const f=sample(track,lane,0);cars.push({id,machine:m,setup:conf,stats:derive(conf),lane,s:0,previousS:0,v:0,lap:0,lapTimes:[],lastLap:0,finish:null,state:'onTrack',charge:1,overload:0,outs:0,recover:0,safeS:0,p:{...f.p},previousP:{...f.p},velocity:{x:0,y:0,z:0},airTime:0,airStartU:0,events:[],wheel:0,progress:0});}
 return {track,cars,time:0,phase:'ready',seed,countdown:3,mode};
}
function event(c:Car,time:number,kind:Event['kind'],detail:string){if(c.events.length<200&&(!c.events.length||time-c.events[c.events.length-1].time>.4||kind==='out'||detail.startsWith('着地')))c.events.push({time,kind,detail});}
function out(c:Car,time:number,detail:string){c.outs++;event(c,time,'out',detail);c.v=0;c.recover=tuning.recoverySeconds;c.state=c.outs>=tuning.maxOuts?'dnf':'recovering';}
function fly(c:Car,f:Frame,time:number,reason:string){c.state='airborne';c.p={...f.p};c.velocity=mul(f.t,c.v);c.airTime=0;c.airStartU=f.u;event(c,time,reason==='loop'?'loop':'landing',reason==='loop'?'ループ支持力が不足し離脱':'ジャンプ離陸');}
export function stepCar(c:Car,track:Track,time:number,dt=DT){
 if(c.state==='finished'||c.state==='dnf')return;
 c.previousS=c.s;c.previousP={...c.p};
 const len=track.lengths[c.lane],s=c.stats;
 if(c.state==='recovering'){c.recover-=dt;if(c.recover<=0){c.s=c.safeS;c.p=sample(track,c.lane,c.s).p;c.previousP={...c.p};c.previousS=c.s;c.state='onTrack';c.overload=0;}return;}
 let f=sample(track,c.lane,c.s);
 if(c.state==='airborne'){
  c.airTime+=dt;const next=add(c.p,add(mul(c.velocity,dt),{x:0,y:-.5*tuning.gravity*dt*dt,z:0}));c.velocity.y-=tuning.gravity*dt;
  // Intersect a swept point segment with forward, lane-specific surface quads. No global-height landing.
  const start=f.u, arr=track.lanes[c.lane];let hit:Frame|null=null,hitP:V|null=null;
  for(let i=Math.max(0,Math.floor(start*2400)-4);i<Math.min(2400,Math.floor(start*2400)+200);i++){
   const a=arr[i];if(a.gap||c.airTime<DT*2||a.s<(c.s%len)-.04||(c.airStartU<.13&&a.u<.135))continue;const d0=dot(sub(c.p,a.p),a.n),d1=dot(sub(next,a.p),a.n);
   if(d0>=-.00001&&d1<=0&&d0>d1){const q=d0/(d0-d1),p=add(c.p,mul(sub(next,c.p),q)),off=sub(p,a.p);if(Math.abs(dot(off,a.side))<.069&&Math.abs(dot(off,a.t))<.035){hit=a;hitP=p;break;}}
  }
  c.p=next;
  if(hit&&hitP){const impact=Math.abs(dot(c.velocity,hit.n)),forward=dot(c.velocity,hit.t),alignment=forward/(length(c.velocity)||1);if(impact>4.6*s.stability||alignment<.35){out(c,time,'着地衝撃または姿勢超過');return;}c.v=Math.max(0,forward*(1-Math.min(.55,impact/(14*s.stability))));c.s=Math.floor(c.s/len)*len+hit.s;c.p=hit.p;c.state='onTrack';event(c,time,'landing',`着地衝撃 ${impact.toFixed(2)} m/s`);}
  else if(c.airTime>1.5||c.p.y<-.8)out(c,time,'着地面を逸脱');
  // Progress in flight is projection onto the same lane, bounded to a local forward region.
  if(c.state==='airborne'){let best=Infinity,bestS=c.s;for(let i=Math.floor(start*2400);i<Math.min(2400,Math.floor(start*2400)+120);i++){const d=length(sub(c.p,arr[i].p));if(d<best){best=d;bestS=Math.floor(c.s/len)*len+arr[i].s;}}c.s=Math.max(c.s,bestS);}
 }else{
  if(!f.gap&&!f.loop&&!f.brake&&Math.abs(f.t.y)<.15)c.safeS=Math.floor(c.s/len)*len+atU(track,c.lane,Math.floor(f.u*20)/20).s;
  const normal=contactAcceleration(f,c.v);
  if(f.loop)c.safeS=Math.floor(c.s/len)*len+atU(track,c.lane,.49).s;
  if(f.loop&&normal<-.05&&c.v>.15){fly(c,f,time,'loop');return;}
  const lateral=Math.abs(dot(f.k,f.side))*c.v*c.v;
  const allowed=s.grip*Math.max(2,normal)+s.support/s.mass*(.022/s.cg);
  const excess=Math.max(0,lateral-allowed);
  c.overload=excess>8?c.overload+dt:Math.max(0,c.overload-dt*2);
  if(c.overload>tuning.overloadSeconds){out(c,time,'横支持限界を超過');return;}
  const cornerDrag=excess*s.mass*.9+s.contact*lateral*.035;
  if(excess>2)event(c,time,'corner','カーブで支持限界に達し減速');
  const drive=driveForce(s,c.v,c.charge),roll=s.rolling*s.mass*Math.max(1,normal),air=.5*tuning.airDensity*s.drag*c.v*c.v,brake=f.brake&&c.v>3.5?s.brake:0;
  const acceleration=(drive-roll-air-cornerDrag-brake)/s.mass-tuning.gravity*f.t.y;
  const oldV=c.v;c.v=Math.max(0,Math.min(20,c.v+acceleration*dt));c.s+=(oldV+c.v)*.5*dt;c.wheel+=(c.s-c.previousS)/s.radius;
  const mechanical=drive*c.v/Math.max(.3,s.efficiency);c.charge=Math.max(0,c.charge-(.18+mechanical)*dt/(s.capacity*tuning.capacityScale));
  const next=sample(track,c.lane,c.s);c.p=next.p;
  if(next.gap&&!f.gap){const takeoff=atU(track,c.lane,.12-1/2400);fly(c,takeoff,time,'jump');}
  if(c.v<.015&&time>15&&Math.abs(f.t.y)>.2){out(c,time,'登坂で停止');return;}
 }
 const lap=Math.floor(c.s/len);
 if(lap>c.lap){const fraction=(lap*len-c.previousS)/(c.s-c.previousS||1);const crossing=time-dt+Math.max(0,Math.min(1,fraction))*dt;c.lapTimes.push(crossing-c.lastLap);c.lastLap=crossing;c.lap=lap;if(c.lap>=3){c.state='finished';c.finish=crossing;c.v=0;}}
 c.progress=c.lap+sample(track,c.lane,c.s).u;
}
export function tick(r:Race,dt=DT){if(r.phase==='countdown'){r.countdown-=dt;if(r.countdown<=0)r.phase='running';return;}if(r.phase!=='running')return;r.time+=dt;for(const c of r.cars)stepCar(c,r.track,r.time,dt);if(r.time>=tuning.maxTime)for(const c of r.cars)if(c.state!=='finished')c.state='dnf';if(r.cars.every(c=>c.state==='finished'||c.state==='dnf'))r.phase='finished';}
export function ranking(r:Race){return [...r.cars].sort((a,b)=>{if(a.finish!==null&&b.finish!==null)return a.finish-b.finish||a.id-b.id;if(a.finish!==null)return -1;if(b.finish!==null)return 1;return b.progress-a.progress||a.id-b.id;});}
export function rankOf(r:Race,c:Car){return 1+r.cars.filter(a=>a.id!==c.id&&(c.finish!==null?(a.finish!==null&&a.finish<c.finish):(a.finish!==null||a.progress>c.progress))).length;}
export function runBench(setup:Setup,course:number){const r=createRace(0,setup,course,731,'time');r.phase='running';while(r.phase==='running')tick(r);return r.cars[0];}
export class Clock {accumulator=0;advance(seconds:number,fn:()=>void){if(seconds>.25){this.accumulator=0;return false;}this.accumulator+=seconds;let n=0;while(this.accumulator+1e-12>=DT&&n<30){fn();this.accumulator-=DT;n++;}return true;}get alpha(){return this.accumulator/DT;}}
