import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../src/api/client.ts';
import type { Draft, WorkoutSnapshot } from '../src/api/client.ts';
import { createRufitSession } from '../src/api/session.ts';
import { createDraftOutbox } from '../src/api/outbox.ts';

const scope = {server:'https://api.example.test', accountId:'alice'};
function storage() {
  const values = new Map<string, string>(); let failWrite = false;
  return {values, fail: (value: boolean) => {failWrite = value;},
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { if (failWrite) throw new Error('disk full'); values.set(key,value); }};
}
const draft = (): Draft => ({operationId:randomUUID(), version:0,
  sets:[{set:{exerciseName:'Squat', weight:20, reps:10}, completed:true}], restSetIndex:null, restEndsAt:null});
const snapshot = (id: string, version = 1): WorkoutSnapshot => ({id, version, startedAt:new Date().toISOString(), finishedAt:null,
  cancelledAt:null, sourceRoutineId:null, sets:[{exerciseName:'Squat', weight:20, reps:10}], completedSetIndexes:[0], restEndsAt:null, restSetIndex:null});
async function session(save: (body: Draft) => Response | Promise<Response>, accountId = 'alice') {
  return createRufitSession({baseUrl:scope.server, getAccessToken:() => 'token', fetch:async (url, init) =>
    String(url).endsWith('/me') ? Response.json({id:accountId}) : save(JSON.parse(String(init?.body)) as Draft)});
}

test('전송 전 영구 저장, 재생성 후 같은 작업 ID로 복구하고 폼 변경과 분리한다', async () => {
  const disk = storage(); const id = randomUUID(); const original = draft(); const operationId = original.operationId;
  const queue = createDraftOutbox(disk, scope);
  const saving = queue.enqueue(id, original); original.sets[0].set.weight = 100; await saving;
  const recreated = createDraftOutbox(disk, scope);
  const active = await session(body => { assert.equal(body.operationId, operationId); assert.equal(body.sets[0].set.weight,20);
    assert.equal(disk.values.size,1); return Response.json({workout:snapshot(id), appliedVersion:1, replayed:false}); });
  assert.equal((await recreated.flushOne(active)).kind,'saved');
  assert.equal((await recreated.list()).length,0);
});
test('전송 전 디스크 저장 실패는 대기 목록과 네트워크를 바꾸지 않는다', async () => {
  const disk = storage(); const queue = createDraftOutbox(disk,scope); disk.fail(true);
  await assert.rejects(queue.enqueue(randomUUID(),draft()), /disk full/); disk.fail(false);
  assert.equal((await queue.list()).length,0);
  const active = await session(() => {throw new Error('must not send');});
  assert.equal((await queue.flushOne(active)).kind,'idle');
});
test('응답 유실과 서버 확인 후 로컬 저장 실패 모두 같은 작업으로 재시도한다', async () => {
  const disk = storage(); const queue = createDraftOutbox(disk,scope); const id = randomUUID(); const item = draft();
  await queue.enqueue(id,item); let count = 0;
  const active = await session(body => { assert.equal(body.operationId,item.operationId); count++;
    if (count === 1) throw new Error('lost acknowledgement');
    return Response.json({workout:snapshot(id),appliedVersion:1,replayed:true}); });
  await assert.rejects(queue.flushOne(active), (e:unknown) => e instanceof ApiError && e.outcomeUnknown);
  assert.equal((await queue.list()).length,1);
  disk.fail(true); await assert.rejects(queue.flushOne(active), /disk full/); disk.fail(false);
  assert.equal((await queue.list()).length,1);
  assert.equal((await queue.flushOne(active)).kind,'saved'); assert.equal(count,3);
});
test('다른 계정과 서버의 대기 기록은 전송하지 않고 로그아웃한 세션도 거부한다', async () => {
  const disk = storage(); const queue = createDraftOutbox(disk,scope); await queue.enqueue(randomUUID(),draft());
  const other = await session(() => {throw new Error('must not send');},'bob');
  await assert.rejects(queue.flushOne(other), (e:unknown) => e instanceof ApiError && e.code === 'ACCOUNT_CHANGED');
  assert.equal((await createDraftOutbox(disk,{...scope,accountId:'bob'}).list()).length,0);
  assert.equal((await createDraftOutbox(disk,{...scope,server:'https://other.example.test'}).list()).length,0);
  const active = await session(() => {throw new Error('must not send');}); active.close();
  await assert.rejects(queue.flushOne(active), (e:unknown) => e instanceof ApiError && e.status === 401);
  assert.equal((await queue.list()).length,1);
});
test('계정 확인 뒤 전역 토큰이 바뀌어도 확인된 세션의 토큰만 사용한다', async () => {
  let token = 'alice-token'; const seen: string[] = [];
  const active = await createRufitSession({baseUrl:scope.server,getAccessToken:() => token,fetch:async (url,init) => {
    seen.push(new Headers(init?.headers).get('Authorization')!);
    return String(url).endsWith('/me') ? Response.json({id:'alice'}) : Response.json({});
  }});
  token = 'bob-token'; await active.saveDraft(randomUUID(),draft());
  assert.deepEqual(seen,['Bearer alice-token','Bearer alice-token']);
});
test('버전 충돌과 뒤늦은 재시도는 로컬 내용을 보존하고 자동 재전송하지 않는다', async () => {
  for (const afterReplay of [false,true]) {
    const disk = storage(); const queue = createDraftOutbox(disk,scope); const id = randomUUID(); const item = draft();
    await queue.enqueue(id,item); let count = 0;
    const active = await session(() => {count++; return afterReplay ? Response.json({workout:snapshot(id,3),appliedVersion:1,replayed:true}) :
      Response.json({code:'STATE_CONFLICT',detail:'conflict'},{status:409});});
    assert.equal((await queue.flushOne(active)).kind,'conflict');
    assert.deepEqual((await queue.list())[0].draft,item);
    assert.equal((await queue.list())[0].status,'conflict');
    assert.equal((await queue.flushOne(active)).kind,'idle'); assert.equal(count,1);
    await queue.discard(item.operationId,true); assert.equal((await queue.list()).length,0);
  }
});
test('동일 저장소의 여러 인스턴스가 직렬화되고 미전송 내용을 덮어쓰지 않는다', async () => {
  const disk = storage(); const first = createDraftOutbox(disk,scope); const second = createDraftOutbox(disk,scope);
  const id = randomUUID(); const item = draft();
  await Promise.all([first.enqueue(id,item),second.enqueue(id,item)]);
  assert.equal((await first.list()).length,1);
  await assert.rejects(second.enqueue(id,{...item,sets:[]}), /먼저 처리/);
  await first.enqueue(randomUUID(),draft()); assert.equal((await second.list()).length,2);
});
test('손상된 저장과 잘못된 입력 및 잘못된 서버 확인은 기록을 지우지 않는다', async () => {
  const disk = storage(); const queue = createDraftOutbox(disk,scope); const id = randomUUID();
  await assert.rejects(queue.enqueue(id,{...draft(),sets:[{set:{exerciseName:'',weight:0,reps:0},completed:false}]}));
  await queue.enqueue(id,draft()); const key = [...disk.values.keys()][0]; const original = disk.values.get(key)!;
  disk.values.set(key,'{broken'); await assert.rejects(queue.list()); assert.equal(disk.values.get(key),'{broken');
  disk.values.set(key,original);
  const active = await session(() => Response.json({workout:snapshot(randomUUID()),appliedVersion:1,replayed:false}));
  await assert.rejects(queue.flushOne(active), (e:unknown) => e instanceof ApiError && e.code === 'INVALID_RESPONSE');
  assert.equal((await queue.list()).length,1);
});
