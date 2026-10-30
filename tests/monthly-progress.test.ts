import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthlyProgress} from '../src/features/calendar/monthlyProgress.ts';
import type {Workout} from '../src/features/workout/model.ts';
const record=(date:string,id=date):Workout=>({id,recordDate:date,startedAt:1,finishedAt:2,exercises:[]});
test('월 전체 날짜 대비 운동한 고유 날짜를 백분율로 계산한다',()=>{
  const records=[record('2026-10-01'),record('2026-10-02'),record('2026-10-02','duplicate'),record('2026-09-30')];
  assert.deepEqual(monthlyProgress(records,'2026-10'),{month:'2026-10',workoutDays:2,totalDays:31,percent:6.5});
  assert.equal(monthlyProgress(records,'2026-09').percent,3.3);
  assert.equal(monthlyProgress([], '2024-02').totalDays,29);
  assert.equal(monthlyProgress([], '2025-02').totalDays,28);
});
test('진행 중 운동은 제외하고 매일 운동한 달은 정확히100%',()=>{
  const records=Array.from({length:30},(_,i)=>record(`2026-09-${String(i+1).padStart(2,'0')}`));
  assert.equal(monthlyProgress(records,'2026-09').percent,100);
  assert.equal(monthlyProgress([{...record('2026-10-01'),finishedAt:undefined}],'2026-10').percent,0);
});
