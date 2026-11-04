import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createConnectedWorkoutStorage, type ConnectedRecord } from '../src/features/workout/connectedStorage.ts';
import { addExercise, addSet, updateSet } from '../src/features/workout/model.ts';
import { createRufitSession } from '../src/api/session.ts';
import { ApiError, type Draft, type WorkoutSnapshot } from '../src/api/client.ts';
import { createDraftOutbox } from '../src/api/outbox.ts';
const clone = <T>(v:T):T=>JSON.parse(JSON.stringify(v));
const base = 'https://api.example.test';
const scope = {server:base,accountId:'alice'};
const squat = '00000000-0000-4000-8000-000000000001';
function disk() {
  const values=new Map<string,string>();
  let reject: ((key:string,value:string)=>boolean)|null=null;
  return {values,failOnce:(predicate:(key:string,value:string)=>boolean)=>{reject=predicate;},
    getItem:async(key:string)=>values.get(key)??null,
    setItem:async(key:string,value:string)=>{if (reject?.(key,value)) {reject=null;throw new Error('disk full');} values.set(key,value);}};
}
function snapshot(): WorkoutSnapshot {return {id:randomUUID(),version:0,startedAt:'2026-09-13T00:00:00.000Z',finishedAt:null,cancelledAt:null,sourceRoutineId:null,sets:[],completedSetIndexes:[],restEndsAt:null,restSetIndex:null,note:'서버 메모'};}
async function server(initial=snapshot(), accountId='alice', serverUrl=base) {
  let current=clone(initial); let writes=0; let draftCalls=0; let getCalls=0;
  const operations=new Map<string,number>(); const bodies:Draft[]=[];
  let intercept: ((body:Draft,response:unknown)=>Promise<Response>|Response)|null=null;
  const session=await createRufitSession({baseUrl:serverUrl,getAccessToken:()=>'test-only-token',fetch:async(url,init)=>{
    if (String(url).endsWith('/me')) return Response.json({id:accountId});
    if (!String(url).endsWith('/draft')) {getCalls++;return Response.json(current);}
    draftCalls++; const body=JSON.parse(String(init?.body)) as Draft; bodies.push(clone(body));
    const applied=operations.get(body.operationId);
    if (applied===undefined) {
      if (body.version!==current.version) return Response.json({code:'STATE_CONFLICT',detail:'changed'},{status:409});
      current={...current,version:current.version+1,sets:body.sets.map(s=>s.set),completedSetIndexes:body.sets.flatMap((s,i)=>s.completed?[i]:[]),note:body.note??current.note,restSetIndex:body.restSetIndex,restEndsAt:body.restEndsAt};
      writes++;operations.set(body.operationId,current.version);
    }
    const response={workout:clone(current),appliedVersion:operations.get(body.operationId),replayed:applied!==undefined};
    return intercept ? intercept(body,response) : Response.json(response);
  }});
  return {session,bodies,id:initial.id,counts:()=>({writes,draftCalls,getCalls}),intercept:(fn:typeof intercept)=>{intercept=fn;},changeVersion:()=>{current.version++;},current:()=>clone(current)};
}
function edited(record:ConnectedRecord) {
  const original=record.form.workout;
  const withSet=updateSet(addExercise(original,'local-exercise','스쿼트',squat),'local-exercise','local-exercise-1',{weight:'01.00',reps:'02',completed:true});
  return {workout:addSet(withSet,'local-exercise','copy','local-exercise-1'),note:'로컬 메모',rest:{exerciseId:'local-exercise',setId:'local-exercise-1',endsAt:'2030-01-01T00:00:00.123Z'}};
}
async function staged() {
  const storage=disk(); const api=await server(); const store=createConnectedWorkoutStorage(storage,scope);
  const linked=await store.link(api.session,api.id);
  await store.edit(api.id,linked.revision,edited(linked));
  const operation=randomUUID(); await store.queueLatest(api.id,operation);
  return {storage,api,store,operation};
}

test('확인한 서버 운동을 계정별로 연결하고 연속 그룹·휴식 대상을 로컬 ID로 복구한다', async()=>{
  const initial=snapshot(); initial.sets=[{exerciseId:squat,exerciseName:'스쿼트',weight:1,reps:2},{exerciseId:squat,exerciseName:'스쿼트',weight:2,reps:3},{exerciseId:null,exerciseName:'직접 종목',weight:0,reps:10},{exerciseId:squat,exerciseName:'스쿼트',weight:3,reps:4}];
  initial.completedSetIndexes=[0,3];initial.restSetIndex=3;initial.restEndsAt='2030-01-01T00:00:00.123Z';
  const api=await server(initial);const storage=disk();const store=createConnectedWorkoutStorage(storage,scope);
  const linked=await store.link(api.session,api.id);
  assert.equal(linked.form.workout.exercises.length,3);
  assert.equal(linked.form.workout.exercises[0].sets.length,2);
  assert.equal(linked.form.rest?.setId,`${api.id}:set:3`);
  assert.equal(linked.form.workout.exercises[2].sets[0].completed,true);
  assert.deepEqual(await createConnectedWorkoutStorage(storage,scope).load(api.id),linked);
  assert.equal((await store.queueLatest(api.id,randomUUID())).kind,'idle');
  assert.equal(await createConnectedWorkoutStorage(storage,{...scope,accountId:'bob'}).load(api.id),null);
  assert.equal(await createConnectedWorkoutStorage(storage,{...scope,server:'https://other.example.test'}).load(api.id),null);
  const other=await server(initial,'bob');
  await assert.rejects(store.link(other.session,api.id),(e:unknown)=>e instanceof ApiError && e.code==='ACCOUNT_CHANGED');
  await assert.rejects(store.flush(other.session),(e:unknown)=>e instanceof ApiError && e.code==='ACCOUNT_CHANGED');
  assert.equal(other.counts().getCalls,0);assert.equal(other.counts().draftCalls,0);
});
test('늦은 저장 응답을 기다리는 동안에도 입력을 저장하고 과거 응답이 최신 폼을 덮어쓰지 않는다',{timeout:5000},async()=>{
  const {storage,api,store}=await staged();
  let signal!:()=>void;const started=new Promise<void>(r=>{signal=r;});
  let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
  api.intercept(async(_body,response)=>{signal();await gate;return Response.json(response);});
  const sending=store.flush(api.session);await started;
  const before=(await store.load(api.id))!;
  const latest={...before.form,note:'응답 대기 중 바꾼 메모',rest:null,workout:updateSet(before.form.workout,'local-exercise','copy',{weight:'3',reps:'4'})};
  await store.edit(api.id,before.revision,latest);
  release();assert.equal((await sending).kind,'saved');
  const restored=(await createConnectedWorkoutStorage(storage,scope).load(api.id))!;
  assert.equal(restored.revision,2);assert.equal(restored.confirmedRevision,1);assert.equal(restored.version,1);
  assert.deepEqual(restored.form,latest);assert.equal(restored.pending,null);
  assert.equal(api.bodies[0].sets[1].set.weight,1);
  assert.equal((await store.pending()).length,0);
  api.intercept(null);await store.queueLatest(api.id,randomUUID());await store.flush(api.session);
  assert.equal(api.bodies[1].version,1);assert.equal(api.bodies[1].sets[1].set.weight,3);
  assert.equal((await store.load(api.id))!.confirmedRevision,2);
});
test('초안 연결 저장 실패는 전송 대기에 넣지 않고 대기 저장 실패는 같은 작업으로 복구한다',async()=>{
  const storage=disk();const api=await server();const store=createConnectedWorkoutStorage(storage,scope);
  const linked=await store.link(api.session,api.id);await store.edit(api.id,0,edited(linked));
  storage.failOnce((key,value)=>key.includes('connected-workouts') && JSON.parse(value).records[0].pending!==null);
  await assert.rejects(store.queueLatest(api.id,randomUUID()),/disk full/);
  assert.equal((await store.pending()).length,0);assert.equal((await store.load(api.id))!.pending,null);
  const operation=randomUUID();storage.failOnce(key=>key.includes('draft-outbox'));
  await assert.rejects(store.queueLatest(api.id,operation),/disk full/);
  assert.equal((await store.load(api.id))!.pending!.draft.operationId,operation);
  const restarted=createConnectedWorkoutStorage(storage,scope);await restarted.recover();
  assert.equal((await restarted.pending())[0].draft.operationId,operation);
  assert.equal(api.counts().draftCalls,0);await restarted.flush(api.session);
  assert.equal(api.counts().writes,1);
});
test('서버 성공 후 로컬 확인 저장 실패에도 원문과 같은 요청을 남겨 재시작 후 재전송한다',async()=>{
  const {storage,api,store,operation}=await staged();
  storage.failOnce((key,value)=>key.includes('connected-workouts') && JSON.parse(value).records[0].pending?.acknowledgedVersion!==null);
  await assert.rejects(store.flush(api.session),/disk full/);
  const saved=(await store.load(api.id))!;
  assert.equal(saved.pending!.acknowledgedVersion,null);assert.equal(saved.form.workout.exercises[0].sets[0].weight,'01.00');
  assert.equal((await store.pending())[0].draft.operationId,operation);
  const restarted=createConnectedWorkoutStorage(storage,scope);assert.equal((await restarted.flush(api.session)).kind,'saved');
  assert.equal(api.counts().writes,1);assert.equal(api.counts().draftCalls,2);
  assert.equal((await restarted.load(api.id))!.pending,null);
});
test('확인 저장 후 대기 삭제 실패를 재생해도 확인 버전과 로컬 ID를 보존한다',async()=>{
  const {storage,api,store,operation}=await staged();
  storage.failOnce((key,value)=>key.includes('draft-outbox') && JSON.parse(value).entries.length===0);
  await assert.rejects(store.flush(api.session),/disk full/);
  const acknowledged=(await store.load(api.id))!;
  assert.equal(acknowledged.pending!.acknowledgedVersion,1);assert.equal(acknowledged.confirmedRevision,1);
  assert.equal((await store.pending())[0].draft.operationId,operation);
  const restarted=createConnectedWorkoutStorage(storage,scope);await restarted.flush(api.session);
  assert.equal(api.counts().writes,1);assert.equal((await restarted.load(api.id))!.form.workout.exercises[0].sets[1].id,'copy');
});
test('대기 삭제 후 마지막 정리가 실패하면 네트워크 없이 확인된 연결을 복구한다',async()=>{
  const {storage,api,store}=await staged();
  storage.failOnce((key,value)=>key.includes('connected-workouts') && JSON.parse(value).records[0].pending===null);
  await assert.rejects(store.flush(api.session),/disk full/);
  assert.equal((await store.pending()).length,0);assert.equal((await store.load(api.id))!.pending!.acknowledgedVersion,1);
  const restarted=createConnectedWorkoutStorage(storage,scope);await restarted.recover();
  assert.equal((await restarted.load(api.id))!.pending,null);assert.equal(api.counts().draftCalls,1);
});
test('입력 중인 빈칸은 복구하면서 전송을 보류하고 오래된 화면 수정은 거부한다',async()=>{
  const storage=disk();const api=await server();const store=createConnectedWorkoutStorage(storage,scope);const linked=await store.link(api.session,api.id);
  const form=edited(linked);form.workout=updateSet(form.workout,'local-exercise','copy',{weight:''});
  const [first,second]=await Promise.allSettled([store.edit(api.id,0,form),createConnectedWorkoutStorage(storage,scope).edit(api.id,0,edited(linked))]);
  assert.equal(first.status,'fulfilled');assert.equal(second.status,'rejected');
  assert.equal((await store.queueLatest(api.id,randomUUID())).kind,'blocked');
  assert.equal((await store.pending()).length,0);assert.equal((await createConnectedWorkoutStorage(storage,scope).load(api.id))!.form.workout.exercises[0].sets[1].weight,'');
  await assert.rejects(store.edit(api.id,1,{...form,workout:{...form.workout,id:'other'}}));
  assert.equal(api.counts().draftCalls,0);
});
test('서버 충돌은 원본과 대기 요청을 보존하고 자동 덮어쓰기나 재전송을 막는다',async()=>{
  const {api,store}=await staged();api.changeVersion();
  assert.equal((await store.flush(api.session)).kind,'conflict');
  assert.equal((await store.queueLatest(api.id,randomUUID())).kind,'conflict');
  assert.equal((await store.flush(api.session)).kind,'idle');
  assert.equal(api.counts().draftCalls,1);assert.equal((await store.load(api.id))!.form.workout.exercises[0].sets[0].weight,'01.00');
  assert.equal((await store.pending())[0].status,'conflict');
});
test('손상되거나 서로 다른 원본/대기 요청은 그대로 보존하고 전송하지 않는다',async()=>{
  const {storage,api,store}=await staged();
  const key=[...storage.values.keys()].find(k=>k.includes('connected-workouts'))!;
  const original=storage.values.get(key)!;const corrupt=JSON.parse(original);
  corrupt.records[0].pending.form.workout.exercises[0].sets[0].weight='999';
  storage.values.set(key,JSON.stringify(corrupt));const damaged=storage.values.get(key);
  await assert.rejects(store.load(api.id));await assert.rejects(store.flush(api.session));assert.equal(storage.values.get(key),damaged);assert.equal(api.counts().draftCalls,0);
  storage.values.set(key,original);
  const outboxKey=[...storage.values.keys()].find(k=>k.includes('draft-outbox'))!;const queue=JSON.parse(storage.values.get(outboxKey)!);queue.entries[0].draft.sets[0].set.weight=999;
  storage.values.set(outboxKey,JSON.stringify(queue));await assert.rejects(store.recover(),/다릅니다/);assert.equal(api.counts().draftCalls,0);
  const orphanStorage=disk();const orphan=createConnectedWorkoutStorage(orphanStorage,scope);
  await createDraftOutbox(orphanStorage,scope).enqueue(api.id,{operationId:randomUUID(),version:0,note:'',sets:[],restSetIndex:null,restEndsAt:null});
  await assert.rejects(orphan.flush(api.session),/연결 정보/);assert.equal(api.counts().draftCalls,0);
});
test('잘못된 성공 응답과 응답 유실 모두 대기 원본을 보존한다',async()=>{
  const {api,store}=await staged();let first=true;
  api.intercept((_body,response)=>{if (first) {first=false;throw new Error('lost acknowledgement');}return Response.json(response);});
  await assert.rejects(store.flush(api.session),(e:unknown)=>e instanceof ApiError && e.outcomeUnknown);
  assert.equal((await store.pending()).length,1);
  api.intercept((_body,response)=>{const bad=clone(response) as {workout:WorkoutSnapshot};bad.workout.sets[0].weight=999;return Response.json(bad);});
  await assert.rejects(store.flush(api.session),/저장 응답/);assert.equal((await store.pending()).length,1);
  api.intercept(null);await store.flush(api.session);assert.equal(api.counts().writes,1);assert.equal((await store.load(api.id))!.form.workout.exercises[0].sets[0].weight,'01.00');
});

test('대기 목록이 가득 차도 기존 요청을 처리한 뒤 원문에서 다음 요청을 복구한다',async()=>{
  const {storage,api,store}=await staged();
  const key=[...storage.values.keys()].find(k=>k.includes('connected-workouts'))!;
  const archive=JSON.parse(storage.values.get(key)!) as {records:ConnectedRecord[]};
  const outbox=createDraftOutbox(storage,scope);
  let lastId='';
  for (let i=1;i<=100;i++) {
    const record=clone(archive.records[0]);record.remoteId=randomUUID();lastId=record.remoteId;
    record.form.workout.id=`server:${record.remoteId}`;record.pending!.form.workout.id=record.form.workout.id;
    record.pending!.draft.operationId=randomUUID();archive.records.push(record);
    if (i<100) await outbox.enqueue(record.remoteId,record.pending!.draft);
  }
  storage.values.set(key,JSON.stringify(archive));
  await store.recover();assert.equal((await store.pending()).length,100);
  assert.equal((await store.flush(api.session)).kind,'saved');
  const pending=await store.pending();assert.equal(pending.length,100);assert.ok(pending.some(p=>p.workoutId===lastId));
  assert.equal((await store.load(api.id))!.pending,null);
});
