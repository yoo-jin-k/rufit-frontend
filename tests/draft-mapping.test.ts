import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { addExercise, addSet, finishWorkout, removeSet, startWorkout, updateSet, type Workout } from '../src/features/workout/model.ts';
import { prepareWorkoutDraft, type DraftContext, type DraftPreparation } from '../src/features/workout/draftMapping.ts';
import { createDraftOutbox } from '../src/api/outbox.ts';
import { decodeArchive, emptyArchive, remember } from '../src/features/workout/storage.ts';

const squat = '00000000-0000-4000-8000-000000000001';
const context = (): DraftContext => ({operationId: randomUUID(), version: 7, note: '메모를 보존해요', rest: null});
const local = () => updateSet(addExercise(startWorkout('local-workout', 100), 'squat-instance', '스쿼트', squat), 'squat-instance', 'squat-instance-1', {weight: '01.00', reps: '02', completed: true});
function ready(result: DraftPreparation) { assert.equal(result.kind, 'ready'); if (result.kind !== 'ready') throw new Error('Expected ready'); return result; }
function blocked(result: DraftPreparation, code: string) { assert.equal(result.kind, 'blocked'); if (result.kind !== 'blocked') throw new Error('Expected blocked'); assert.ok(result.issues.some(i => i.code === code)); assert.equal('draft' in result, false); }

test('1kg 2회 복제와 직접 입력 종목을 숫자·종목 UUID로 매핑하되 로컬 ID와 표기는 유지한다', () => {
  let w = addSet(local(), 'squat-instance', 'copy', 'squat-instance-1');
  w = updateSet(addExercise(w, 'custom', '내 운동'), 'custom', 'custom-1', {weight: '0', reps: '10'});
  const c = context();
  const result = ready(prepareWorkoutDraft(w, c));
  assert.deepEqual(result.draft, {operationId: c.operationId, version: 7, note: c.note, restSetIndex: null, restEndsAt: null, sets: [
    {set:{exerciseId:squat,exerciseName:'스쿼트',weight:1,reps:2},completed:true},
    {set:{exerciseId:squat,exerciseName:'스쿼트',weight:1,reps:2},completed:false},
    {set:{exerciseId:null,exerciseName:'내 운동',weight:0,reps:10},completed:false},
  ]});
  assert.deepEqual(result.rows, [{exerciseId:'squat-instance',setId:'squat-instance-1'},{exerciseId:'squat-instance',setId:'copy'},{exerciseId:'custom',setId:'custom-1'}]);
  assert.deepEqual(result.source, w);
  result.source.exercises[0].sets[0].weight = '999';
  w.exercises[0].sets[0].reps = '99';
  assert.equal(result.source.exercises[0].sets[0].reps, '02');
  assert.equal(result.draft.sets[0].set.weight, 1);
  assert.equal(w.exercises[0].sets[0].weight, '01.00');
});
test('빈 입력과 잘못된 숫자가 하나라도 있으면 전체 전송을 보류하고 원본을 바꾸지 않는다', () => {
  for (const [weight,reps] of [['','2'],['1',''],['1.','2'],['-1','2'],['1','0'],['1.001','2'],['1501','2'],['1','1001'],['Infinity','2'],['1','2.5']]) {
    const w = updateSet(addSet(local(), 'squat-instance', 'editing', 'squat-instance-1'), 'squat-instance', 'editing', {weight,reps});
    const before = JSON.stringify(w);
    const result = prepareWorkoutDraft(w, context());
    blocked(result, 'SET_INPUT');
    if (result.kind === 'blocked') assert.deepEqual(result.issues[0], {code:'SET_INPUT',exerciseId:'squat-instance',setId:'editing',message:'무게와 횟수 입력을 마친 뒤 서버에 저장할 수 있습니다.'});
    assert.equal(JSON.stringify(w), before);
    assert.deepEqual(decodeArchive(JSON.stringify(remember(emptyArchive(), w))).current, w);
  }
});
test('복제·삭제로 행이 움직여도 휴식은 같은 세트 ID를 따라가고 절대 종료시각은 유지한다', () => {
  let w = addSet(local(), 'squat-instance', 'resting', 'squat-instance-1');
  w = updateSet(w, 'squat-instance', 'resting', {completed:true});
  const c = {...context(), rest:{exerciseId:'squat-instance',setId:'resting',endsAt:'2030-01-02T03:04:05.123456Z'}};
  assert.equal(ready(prepareWorkoutDraft(w, c)).draft.restSetIndex, 1);
  w = addSet(w, 'squat-instance', 'inserted', 'squat-instance-1');
  const copied = ready(prepareWorkoutDraft(w, c));
  assert.equal(copied.draft.restSetIndex, 2);
  assert.equal(copied.draft.restEndsAt, c.rest.endsAt);
  w = removeSet(w, 'squat-instance', 'squat-instance-1');
  assert.equal(ready(prepareWorkoutDraft(w, c)).draft.restSetIndex, 1);
  w = removeSet(w, 'squat-instance', 'resting');
  blocked(prepareWorkoutDraft(w, c), 'REST_TARGET');
  assert.equal(ready(prepareWorkoutDraft(w, {...c,rest:null})).draft.restEndsAt, null);
});
test('잘못된 휴식 대상·시각과 미완료 대상은 명시적으로 거부한다', () => {
  const w = local();
  const rest = {exerciseId:'squat-instance',setId:'squat-instance-1',endsAt:'2030-01-02T03:04:05Z'};
  for (const endsAt of ['bad', '2030-02-30T00:00:00Z', '2030-01-02T25:00:00Z', '2030-01-02', ''])
    blocked(prepareWorkoutDraft(w, {...context(),rest:{...rest,endsAt}}), 'REST_TARGET');
  blocked(prepareWorkoutDraft(w, {...context(),rest:{...rest,exerciseId:'other'}}), 'REST_TARGET');
  blocked(prepareWorkoutDraft(updateSet(w,'squat-instance','squat-instance-1',{completed:false}), {...context(),rest}), 'REST_TARGET');
  assert.equal(ready(prepareWorkoutDraft(w, {...context(),rest:{...rest,endsAt:'2020-01-02T03:04:05Z'}})).draft.restEndsAt,'2020-01-02T03:04:05Z');
});
test('마지막 세트 삭제는 빈 서버 초안을 만들지만 로컬 종목과 이름은 보존한다', () => {
  const w = removeSet(local(), 'squat-instance', 'squat-instance-1');
  const result = ready(prepareWorkoutDraft(w, context()));
  assert.deepEqual(result.draft.sets, []);
  assert.equal(result.source.exercises[0].catalogId, squat);
  assert.equal(result.source.exercises[0].sets.length, 0);
});
test('모호한 ID, 끝난 기록, 초과 한도와 잘못된 서버 문맥은 전송하지 않는다', () => {
  const w = local();
  blocked(prepareWorkoutDraft({...w,exercises:[w.exercises[0],w.exercises[0]]},context()),'IDENTITY');
  blocked(prepareWorkoutDraft({...w,exercises:[{...w.exercises[0],sets:[w.exercises[0].sets[0],w.exercises[0].sets[0]]}]},context()),'IDENTITY');
  blocked(prepareWorkoutDraft({...w,exercises:[{...w.exercises[0],catalogId:'bad'}]},context()),'EXERCISE');
  blocked(prepareWorkoutDraft({...w,exercises:[{...w.exercises[0],name:' '}]},context()),'EXERCISE');
  blocked(prepareWorkoutDraft(finishWorkout(w,200),context()),'FINISHED');
  const full: Workout = {...w,exercises:[{...w.exercises[0],sets:Array.from({length:301},(_,i)=>({...w.exercises[0].sets[0],id:`row-${i}`}))}]};
  blocked(prepareWorkoutDraft(full,context()),'CAPACITY');
  assert.equal(ready(prepareWorkoutDraft({...full,exercises:[{...full.exercises[0],sets:full.exercises[0].sets.slice(0,300)}]},context())).draft.sets.length,300);
  for (const patch of [{version:-1},{version:0.5},{version:Number.MAX_SAFE_INTEGER+1},{operationId:'bad'},{note:'x'.repeat(2001)},{note:undefined},{rest:undefined},{rest:false},{rest:0},{rest:{}}])
    blocked(prepareWorkoutDraft(w, {...context(),...patch} as unknown as DraftContext),'CONTEXT');
});
test('준비한 초안을 계정별 대기 저장소에 보관해 재생성해도 순서·메모·휴식을 보존한다', async () => {
  const w = addSet(local(),'squat-instance','copy','squat-instance-1');
  const c = {...context(),rest:{exerciseId:'squat-instance',setId:'squat-instance-1',endsAt:'2030-01-02T03:04:05.123Z'}};
  const prepared = ready(prepareWorkoutDraft(w,c));
  const values = new Map<string,string>();
  const disk = {getItem:async (key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value);}};
  const scope = {server:'https://api.example.test',accountId:'verified-account'};
  const id = randomUUID();
  await createDraftOutbox(disk,scope).enqueue(id,prepared.draft);
  const queue = await createDraftOutbox(disk,scope).list();
  assert.deepEqual(queue[0].draft,prepared.draft);
  assert.equal(queue[0].workoutId,id);
  assert.notEqual(queue[0].workoutId,w.id);
  assert.equal((await createDraftOutbox(disk,{...scope,accountId:'other'}).list()).length,0);
});
