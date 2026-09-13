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
  let current=clone(initial); let writes=0; let draftCalls=0; let getCalls=0; let closeCalls=0;
  const operations=new Map<string,number>(); const bodies:Draft[]=[];
  let intercept: ((body:Draft,response:unknown)=>Promise<Response>|Response)|null=null;
  let closeIntercept: ((response:WorkoutSnapshot)=>Promise<Response>|Response)|null=null;
  const session=await createRufitSession({baseUrl:serverUrl,getAccessToken:()=>'test-only-token',fetch:async(url,init)=>{
    if (String(url).endsWith('/me')) return Response.json({id:accountId});
    if (/\/(finish|cancel)$/.test(String(url))) {
      closeCalls++;
      const body=JSON.parse(String(init?.body));
      if (body.version!==current.version || current.finishedAt || current.cancelledAt) return Response.json({code:'STATE_CONFLICT'},{status:409});
      const finish=String(url).endsWith('/finish');
      if (finish) {
        current.sets=current.sets.filter((_,i)=>current.completedSetIndexes.includes(i));
        current.completedSetIndexes=current.sets.map((_,i)=>i);
      }
      current={...current,version:current.version+1,finishedAt:finish?'2026-09-13T01:00:00Z':null,cancelledAt:finish?null:'2026-09-13T01:00:00Z',restEndsAt:null,restSetIndex:null};
      return closeIntercept ? closeIntercept(clone(current)) : Response.json(current);
    }
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
  return {session,bodies,id:initial.id,counts:()=>({writes,draftCalls,getCalls,closeCalls}),closeIntercept:(fn:typeof closeIntercept)=>{closeIntercept=fn;},intercept:(fn:typeof intercept)=>{intercept=fn;},changeVersion:()=>{current.version++;},current:()=>clone(current)};
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

async function conflicted() {
  const result=await staged();result.api.changeVersion();await result.store.flush(result.api.session);
  return result;
}
function decision(operationId:string|null,expectedRevision:number,remoteVersion:number,choice:'keep-local'|'use-server'|'archive') {
  return {operationId,expectedRevision,remoteVersion,choice,confirmed:true as const};
}
test('충돌 비교는 원문을 유지하고 로컬 선택은 새 작업으로만 재전송한다',async()=>{
  const {store,api,operation}=await conflicted();
  const compared=await store.review(api.session,api.id);
  assert.equal(compared.local.form.note,'로컬 메모');assert.equal(compared.remote.note,'서버 메모');
  const kept=await store.resolve(api.session,api.id,decision(operation,1,1,'keep-local'));
  assert.equal(kept.form.workout.exercises[0].sets[0].weight,'01.00');
  assert.equal(kept.pending,null);assert.equal(kept.backups![0].record.pending!.draft.operationId,operation);
  assert.equal(kept.backups![0].remote.note,'서버 메모');assert.equal((await store.pending()).length,0);
  assert.ok(kept.revision>kept.confirmedRevision);assert.equal(api.counts().writes,0);
  await assert.rejects(store.queueLatest(api.id,operation),/새 작업/);
  const next=randomUUID();await store.queueLatest(api.id,next);await store.flush(api.session);
  assert.equal(api.bodies[1].operationId,next);assert.equal(api.bodies[1].version,1);assert.equal(api.current().version,2);
});
for (const step of ['choice','discard','cleanup'] as const) test(`명시적 서버 선택 ${step} 실패 뒤 재시작해 폐기 요청이 되살아나지 않는다`,async()=>{
  const {store,storage,api,operation}=await conflicted();
  const original=(await store.load(api.id))!.form;
  storage.failOnce((key,value)=>step==='discard' ? key.includes('draft-outbox') && JSON.parse(value).entries.length===0 :
    key.includes('connected-workouts') && (step==='choice' ? JSON.parse(value).records[0].resolution!=null : JSON.parse(value).records[0].backups?.length===1));
  await assert.rejects(store.resolve(api.session,api.id,decision(operation,1,1,'use-server')),/disk full/);
  const restarted=createConnectedWorkoutStorage(storage,scope);
  if (step==='choice') {
    await restarted.recover();assert.equal((await restarted.pending()).length,1);
    assert.deepEqual((await restarted.load(api.id))!.form,original);
    await restarted.resolve(api.session,api.id,decision(operation,1,1,'use-server'));
  } else await restarted.recover();
  const resolved=(await restarted.load(api.id))!;
  assert.equal(resolved.resolution,null);assert.equal(resolved.pending,null);assert.equal(resolved.backups!.length,1);
  assert.deepEqual(resolved.backups![0].record.form,original);assert.equal(resolved.form.note,'서버 메모');
  assert.equal((await restarted.pending()).length,0);await restarted.recover();assert.equal((await restarted.queueLatest(api.id,randomUUID())).kind,'idle');
  assert.equal(api.counts().draftCalls,1);
});
test('변경된 로컬/서버 비교와 계정 변경, 확인 없는 충돌 선택은 거부한다',async()=>{
  const {store,api,operation}=await conflicted();
  const other=await server(snapshot(),'bob');
  await assert.rejects(store.resolve(other.session,api.id,decision(operation,1,1,'use-server')),(e:unknown)=>e instanceof ApiError && e.code==='ACCOUNT_CHANGED');
  await assert.rejects(store.resolve(api.session,api.id,{...decision(operation,1,1,'use-server'),confirmed:false as unknown as true}));
  api.changeVersion();await assert.rejects(store.resolve(api.session,api.id,decision(operation,1,1,'use-server')),/서버 기록이 다시/);
  const record=(await store.load(api.id))!;await store.edit(api.id,record.revision,{...record.form,note:'선택 전 추가 입력'});
  await assert.rejects(store.resolve(api.session,api.id,decision(operation,1,2,'use-server')),/로컬 기록이 변경/);
  assert.equal((await store.pending()).length,1);assert.equal((await store.load(api.id))!.form.note,'선택 전 추가 입력');
});
test('정리 도중 편집을 막고 손상된 선택 원문은 보존한다',async()=>{
  const {store,storage,api,operation}=await conflicted();
  storage.failOnce(key=>key.includes('draft-outbox'));
  await assert.rejects(store.resolve(api.session,api.id,decision(operation,1,1,'use-server')),/disk full/);
  const record=(await store.load(api.id))!;
  await assert.rejects(store.edit(api.id,record.revision,{...record.form,note:'수정'}),/처리 중/);
  const key=[...storage.values.keys()].find(k=>k.includes('connected-workouts'))!;
  const corrupt=JSON.parse(storage.values.get(key)!);corrupt.records[0].resolution.remote.id=randomUUID();
  const raw=JSON.stringify(corrupt);storage.values.set(key,raw);
  await assert.rejects(store.recover(),/기존 데이터는 보존/);assert.equal(storage.values.get(key),raw);assert.equal((await store.pending()).length,1);
});
test('종료는 최신 저장과 미완료 제외 확인을 요구하고 보관 원문을 수정하지 않는다',async()=>{
  const {store,storage,api}=await staged();
  const options={action:'finish' as const,confirmed:true as const,discardIncomplete:true};
  await assert.rejects(store.close(api.session,api.id,1,options),/저장 대기/);
  await store.flush(api.session);
  await assert.rejects(store.close(api.session,api.id,1,{...options,discardIncomplete:false}),/완료 세트/);
  const original=(await store.load(api.id))!.form;
  assert.equal((await store.close(api.session,api.id,1,options)).kind,'closed');
  const restarted=createConnectedWorkoutStorage(storage,scope);const closed=(await restarted.load(api.id))!;
  assert.equal(closed.closed!.sets.length,1);assert.equal(closed.form.workout.exercises[0].sets.length,2);assert.deepEqual(closed.form,original);
  await assert.rejects(restarted.edit(api.id,1,original),/종료된 운동/);await assert.rejects(restarted.queueLatest(api.id,randomUUID()),/종료된 운동/);
  assert.equal((await restarted.resumeClose(api.session,api.id)).kind,'closed');assert.equal(api.counts().closeCalls,1);
});
for (const step of ['intent','response','receipt'] as const) test(`취소 ${step} 실패 후 서버 상태를 읽고 중복 취소 없이 복구한다`,async()=>{
  const storage=disk();const api=await server();const store=createConnectedWorkoutStorage(storage,scope);await store.link(api.session,api.id);
  if (step==='response') api.closeIntercept(()=>{throw new Error('reply lost');});
  else storage.failOnce((key,value)=>key.includes('connected-workouts') && (step==='intent' ? JSON.parse(value).records[0].closing!=null : JSON.parse(value).records[0].closed!=null));
  await assert.rejects(store.close(api.session,api.id,0,{action:'cancel',confirmed:true,discardIncomplete:false}),(error:unknown)=>step==='response' ? error instanceof ApiError && error.code==='NETWORK_ERROR' : error instanceof Error && error.message==='disk full');
  const restarted=createConnectedWorkoutStorage(storage,scope);await restarted.recover();
  if (step==='intent') {assert.equal(api.counts().closeCalls,0);await restarted.close(api.session,api.id,0,{action:'cancel',confirmed:true,discardIncomplete:false});}
  else {
    assert.ok((await restarted.load(api.id))!.closing);await assert.rejects(restarted.queueLatest(api.id,randomUUID()),/처리 중/);
    assert.equal((await restarted.resumeClose(api.session,api.id)).kind,'closed');
  }
  assert.equal(api.counts().closeCalls,1);assert.ok((await restarted.load(api.id))!.closed!.cancelledAt);
});
test('종료 대기 중 다른 기기 변경은 덮어쓰지 않고 비교 후 선택으로만 해제한다',async()=>{
  const storage=disk();const api=await server();const store=createConnectedWorkoutStorage(storage,scope);await store.link(api.session,api.id);api.changeVersion();
  assert.equal((await store.close(api.session,api.id,0,{action:'cancel',confirmed:true,discardIncomplete:false})).kind,'conflict');
  assert.equal(api.counts().closeCalls,0);
  const resolved=await store.resolve(api.session,api.id,decision(null,0,1,'use-server'));
  assert.equal(resolved.closing,null);assert.equal(resolved.backups![0].closing!.action,'cancel');
  await store.close(api.session,api.id,resolved.revision,{action:'cancel',confirmed:true,discardIncomplete:false});
  assert.equal(api.counts().closeCalls,1);
});
test('다른 기기에서 닫은 운동은 명시적 보관 선택 후 대기를 제거하고 원문을 읽기 전용으로 남긴다',async()=>{
  const {store,api,operation}=await staged();
  await api.session.api.cancel(api.id,0,true);
  await assert.rejects(store.resolve(api.session,api.id,decision(operation,1,1,'keep-local')),/종료된 기록/);
  const record=await store.resolve(api.session,api.id,decision(operation,1,1,'archive'));
  assert.ok(record.closed!.cancelledAt);assert.equal(record.form.workout.exercises[0].sets[0].weight,'01.00');
  assert.equal(record.backups![0].record.pending!.draft.operationId,operation);assert.equal((await store.pending()).length,0);
  await assert.rejects(store.edit(api.id,record.revision,record.form),/종료된 운동/);
  assert.equal(api.counts().draftCalls,0);
});

test('저장 확인 후 요청 삭제 실패와 다른 기기 변경이 겹쳐도 원문을 보관하고 충돌을 해결한다',async()=>{
  const {storage,api,store,operation}=await staged();
  storage.failOnce((key,value)=>key.includes('draft-outbox') && JSON.parse(value).entries.length===0);
  await assert.rejects(store.flush(api.session),/disk full/);api.changeVersion();
  assert.equal((await store.flush(api.session)).kind,'conflict');
  const record=await store.resolve(api.session,api.id,decision(operation,1,2,'use-server'));
  assert.equal(record.backups![0].record.pending!.acknowledgedVersion,1);assert.equal(record.version,2);assert.equal(record.pending,null);
});

test('이전 연결 자료를 읽고 첫 저장 때 새 형식으로 기록해 구버전의 잘못된 재편집을 막는다',async()=>{
  const storage=disk();const api=await server();const store=createConnectedWorkoutStorage(storage,scope);
  const linked=await store.link(api.session,api.id);
  const key=[...storage.values.keys()].find(k=>k.includes('connected-workouts'))!;
  const legacy=JSON.parse(storage.values.get(key)!);legacy.schemaVersion=1;storage.values.set(key,JSON.stringify(legacy));
  const restarted=createConnectedWorkoutStorage(storage,scope);assert.deepEqual(await restarted.load(api.id),linked);
  assert.equal(JSON.parse(storage.values.get(key)!).schemaVersion,1);
  await restarted.edit(api.id,0,edited(linked));assert.equal(JSON.parse(storage.values.get(key)!).schemaVersion,2);
  const future=JSON.parse(storage.values.get(key)!);future.schemaVersion=99;const raw=JSON.stringify(future);storage.values.set(key,raw);
  await assert.rejects(restarted.load(api.id),/기존 데이터는 보존/);assert.equal(storage.values.get(key),raw);
});
