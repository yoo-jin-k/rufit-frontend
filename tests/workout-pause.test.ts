import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startWorkout, pauseWorkout, resumeWorkout, elapsedWorkoutMs, formatWorkoutTime, addExercise, updateSet, finishWorkout } from '../src/features/workout/model.ts';
import { createWorkoutStorage, decodeArchive, emptyArchive, remember } from '../src/features/workout/storage.ts';

test('앱을 닫았다가 복구해도 정지하지 않은 시간은 계속 흐른다', async () => {
  let raw: string | null = null;
  const disk = {getItem: async () => raw, setItem: async (_: string, v: string) => {raw=v;}};
  await createWorkoutStorage(disk).save(remember(emptyArchive(),startWorkout('w',1000)));
  const restored=(await createWorkoutStorage(disk).load()).current!;
  assert.equal(elapsedWorkoutMs(restored,43201000),43200000);
  assert.equal(formatWorkoutTime(elapsedWorkoutMs(restored,43201000)),'12:00:00');
});
test('명시적으로 정지하면 저장과 재시작 이후에도 진행을 누를 때까지 멈춘다', async () => {
  let raw: string | null = null;
  const disk = {getItem: async () => raw, setItem: async (_: string, v: string) => {raw=v;}};
  const paused=pauseWorkout(startWorkout('w',1000),61000);
  assert.equal(pauseWorkout(paused,999000),paused);
  await createWorkoutStorage(disk).save(remember(emptyArchive(),paused));
  const restored=(await createWorkoutStorage(disk).load()).current!;
  assert.equal(elapsedWorkoutMs(restored,43201000),60000);
  const resumed=resumeWorkout(restored,43201000);
  assert.equal(resumed.pausedAt,undefined);
  assert.equal(resumed.pausedDurationMs,43140000);
  assert.equal(resumeWorkout(resumed,43211000),resumed);
  assert.equal(elapsedWorkoutMs(resumed,43211000),70000);
});
test('여러 번 정지한 뒤 정지 상태로 종료해도 기록에는 실제 진행한 시간만 남는다', () => {
  let w=updateSet(addExercise(startWorkout('w',0),'e','스쿼트'),'e','e-1',{weight:'1',reps:'2',completed:true});
  w=resumeWorkout(pauseWorkout(w,10000),40000);
  w=pauseWorkout(w,60000);
  const finished=finishWorkout(w,100000);
  assert.equal(finished.pausedAt,undefined);
  assert.equal(finished.pausedDurationMs,70000);
  assert.equal(elapsedWorkoutMs(finished,999000),30000);
  assert.equal(formatWorkoutTime(elapsedWorkoutMs(finished,999000)),'00:00:30');
  assert.throws(()=>pauseWorkout(finished,110000));assert.throws(()=>resumeWorkout(finished,110000));
  assert.equal(w.pausedAt,60000);
});
test('이전 기록 형식을 보존해 읽고 새 저장에서는 정지 정보를 이해하는 형식을 쓴다', () => {
  const old={schemaVersion:1,current:startWorkout('w',0),history:[]};
  const archive=decodeArchive(JSON.stringify(old));
  assert.equal(archive.schemaVersion,3);assert.deepEqual(archive.current,old.current);
  assert.equal(elapsedWorkoutMs(archive.current!,60000),60000);
});
test('잘못된 정지 정보와 역행한 시각을 거부하고 원본을 유지한다', () => {
  const w=pauseWorkout(startWorkout('w',1000),61000);
  assert.throws(()=>resumeWorkout(w,60000));assert.throws(()=>pauseWorkout(startWorkout('x',1000),0));
  for (const patch of [{pausedAt:0},{pausedAt:null},{pausedAt:'61000'},{pausedDurationMs:-1},{pausedDurationMs:60001},
    {pausedDurationMs:1.5},{finishedAt:70000},{pausedAt:undefined,finishedAt:70000,pausedDurationMs:70001}]) {
    assert.throws(()=>decodeArchive(JSON.stringify({schemaVersion:2,current:{...w,...patch},history:[]})));
  }
  assert.equal(w.pausedAt,61000);assert.equal(w.pausedDurationMs,undefined);
});
