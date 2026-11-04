import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addExercise, addSet, removeSet, startWorkout, updateSet, finishWorkout, pauseWorkout, elapsedWorkoutMs } from '../src/features/workout/model.ts';
import { remember, emptyArchive, createWorkoutStorage, decodeArchive } from '../src/features/workout/storage.ts';
import { completeWithRest, setPersonalRest, exerciseRest, adjustLocalRest } from '../src/features/workout/localRest.ts';
const squat='00000000-0000-4000-8000-000000000001';
const curl='00000000-0000-4000-8000-000000000009';
const incline='4e043528-5b74-5bd1-bb8f-e6dcceb15fbb';
function archive() {
  const workout=updateSet(addExercise(startWorkout('w',0),'e','스쿼트',squat),'e','e-1',{weight:'1',reps:'2'});
  return remember(emptyArchive(),workout);
}
test('종목별 추천이 다르고 개인 0초를 우선하며 추천 사용으로 복귀한다',()=>{
  const a=archive(),e=a.current!.exercises[0];
  assert.equal(exerciseRest(a,e).seconds,180);
  assert.equal(exerciseRest(a,{...e,catalogId:curl}).seconds,90);
  assert.equal(exerciseRest(a,{...e,catalogId:undefined}).source,'기본');
  const off=setPersonalRest(a,e,0);assert.equal(exerciseRest(off,e).seconds,0);
  assert.equal(exerciseRest(setPersonalRest(off,e,null),e).seconds,180);
  assert.equal(exerciseRest(off,{...e,catalogId:curl}).seconds,90);
  assert.deepEqual(a.personalRest,{});
});
test('추천값이 null인 신규 종목은 공통 기본값을 쓰고 개인 설정을 우선한다',()=>{
  const a=archive(),e={...a.current!.exercises[0],catalogId:incline,name:'바벨 인클라인 벤치 프레스'};
  const initial=exerciseRest(a,e);
  assert.deepEqual(initial,{seconds:90,source:'기본',recommended:undefined});
  const personal=setPersonalRest(a,e,45);
  assert.equal(exerciseRest(personal,e).seconds,45);
  assert.deepEqual(exerciseRest(setPersonalRest(personal,e,null),e),initial);
});
test('완료와 휴식 대상은 한 번에 저장되고 앱 재시작 후 절대시각을 그대로 복구한다',async()=>{
  let raw:string|null=null;const disk={getItem:async()=>raw,setItem:async(_:string,v:string)=>{raw=v;}};
  const a=completeWithRest(archive(),'e','e-1',true,1000);
  await createWorkoutStorage(disk).save(a);
  const reopened=await createWorkoutStorage(disk).load();
  assert.equal(reopened.current!.exercises[0].sets[0].completed,true);
  assert.deepEqual(reopened.rest,{workoutId:'w',exerciseId:'e',setId:'e-1',endsAt:181000});
  assert.equal(Math.max(0,reopened.rest!.endsAt-43200000),0);
  const changed=setPersonalRest(reopened,reopened.current!.exercises[0],45);
  assert.equal(changed.rest!.endsAt,181000);
  assert.equal(completeWithRest(changed,'e','e-1',true,10000).rest!.endsAt,181000);
  const cancelled=completeWithRest(changed,'e','e-1',false,10000);assert.equal(cancelled.rest,null);
  assert.equal(completeWithRest(cancelled,'e','e-1',true,11000).rest!.endsAt,56000);
});
test('정지 중에도 휴식은 흐르고 삭제 대상 외의 복제 세트에는 영향이 없다',()=>{
  let a=archive();a=remember(a,addSet(a.current!,'e','copy','e-1'));
  a=completeWithRest(a,'e','copy',true,1000);
  a=remember(a,pauseWorkout(a.current!,2000));
  assert.equal(elapsedWorkoutMs(a.current!,100000),2000);assert.equal(a.rest!.endsAt,181000);
  const deletedOther=remember(a,removeSet(a.current!,'e','e-1'));assert.equal(deletedOther.rest!.setId,'copy');
  assert.equal(remember(a,removeSet(a.current!,'e','copy')).rest,null);
  assert.equal(remember(deletedOther,finishWorkout(deletedOther.current!,100000)).rest,null);
});
test('새 운동에서도 같은 종목 개인 설정을 유지하고 미완료 입력에는 휴식을 시작하지 않는다',()=>{
  let a=archive();a=setPersonalRest(a,a.current!.exercises[0],45);
  a=remember(a,addExercise(startWorkout('next',1000),'new-e','스쿼트',squat));
  assert.equal(exerciseRest(a,a.current!.exercises[0]).seconds,45);
  assert.throws(()=>completeWithRest(a,'new-e','new-e-1',true,2000));assert.equal(a.rest,null);
  assert.equal(a.current!.exercises[0].sets[0].completed,false);
});
test('휴식 10초 조절은 해당 종료시각만 바꾸고 0~3600초 범위로 제한한다',()=>{
  const a=completeWithRest(archive(),'e','e-1',true,1000);
  assert.equal(adjustLocalRest(a,10,2000).rest!.endsAt,191000);
  assert.equal(adjustLocalRest(a,-10,2000).rest!.endsAt,171000);
  assert.equal(adjustLocalRest(a,-9999,2000).rest!.endsAt,2000);
  assert.equal(adjustLocalRest(a,9999,2000).rest!.endsAt,3602000);
  assert.deepEqual(adjustLocalRest(a,10,2000).current,a.current);
  assert.equal(adjustLocalRest(a,10,999000).rest!.endsAt,1009000);
  assert.equal(adjustLocalRest(a,-10,999000).rest!.endsAt,999000);
});
test('이전 저장 형식을 보존하고 손상된 설정이나 휴식 연결을 초기화하지 않는다',()=>{
  const a=archive();
  for(const schemaVersion of [1,2]) {
    const old={schemaVersion,current:a.current,history:[]};const read=decodeArchive(JSON.stringify(old));
    assert.equal(read.schemaVersion,3);assert.deepEqual(read.current,a.current);assert.deepEqual(read.personalRest,{});assert.equal(read.rest,null);
  }
  const completed=completeWithRest(a,'e','e-1',true,1000);
  for(const patch of [{personalRest:null},{personalRest:[]},{personalRest:{bad:-1}},{personalRest:{bad:3601}},
    {rest:{...completed.rest,setId:'missing'}},{rest:{...completed.rest,endsAt:-1}},{rest:{...completed.rest,endsAt:1.5}}])
    assert.throws(()=>decodeArchive(JSON.stringify({...completed,...patch})));
  for(const seconds of [-1,3601,1.5,NaN]) assert.throws(()=>setPersonalRest(a,a.current!.exercises[0],seconds));
});

// 저장 재시도는 이미 계산한 저장본을 다시 쓴다. 휴식 +10초를 다시 계산하면 안 된다.
test('만료 후 조절한 휴식을 저장 실패 뒤 재저장해도 한 번만 적용하고 재시작 복구한다', async () => {
  const completed = completeWithRest(archive(), 'e', 'e-1', true, 1000);
  const adjusted = adjustLocalRest(completed, 10, 999000);
  let raw = JSON.stringify(completed);
  let fail = true;
  const disk = {getItem: async () => raw, setItem: async (_: string, value: string) => {
    if (fail) { fail = false; throw new Error('disk full'); }
    raw = value;
  }};
  const storage = createWorkoutStorage(disk);
  await assert.rejects(storage.save(adjusted));
  assert.deepEqual(decodeArchive(raw), completed);
  await storage.save(adjusted);
  const reopened = await createWorkoutStorage(disk).load();
  assert.equal(reopened.rest!.endsAt, 1009000);
  assert.deepEqual(reopened.current, completed.current);
  assert.deepEqual(reopened.personalRest, completed.personalRest);
});

test('휴식 없는 상태와 닫힌 휴식은 조절만으로 새로 생기지 않는다', () => {
  const a = archive();
  assert.equal(adjustLocalRest(a, 10, 1000), a);
  const completed = completeWithRest(a, 'e', 'e-1', true, 1000);
  const closed = remember(completed, finishWorkout(completed.current!, 2000));
  assert.equal(adjustLocalRest(closed, 10, 3000).rest, null);
});
