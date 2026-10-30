import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localDay,monthCells,shiftMonth,workoutsByDay} from '../src/features/calendar/model.ts';
import type {Workout} from '../src/features/workout/model.ts';
test('윤년과 달의 시작 요일, 연도 경계를 정확히 표시한다',()=>{
  const leap=monthCells('2024-02');
  assert.equal(leap.filter(Boolean).length,29);
  assert.equal(leap.indexOf('2024-02-01'),4);
  assert.equal(leap.length%7,0);
  assert.equal(monthCells('2025-02').filter(Boolean).length,28);
  assert.equal(shiftMonth('2026-01',-1),'2025-12');
  assert.equal(shiftMonth('2026-12',1),'2027-01');
});
test('시작한 로컬 날짜에 완료 기록만 묶고 하루 여러 세션을 유지한다',()=>{
  const start=new Date(2026,9,1,23,30).getTime();
  const a:Workout={id:'a',startedAt:start,finishedAt:start+3600000,exercises:[]};
  const b={...a,id:'b',startedAt:start-1000};
  const grouped=workoutsByDay([a,b,{id:'active',startedAt:start,exercises:[]}]);
  assert.equal(localDay(start),'2026-10-01');
  assert.deepEqual(grouped['2026-10-01'].map(w=>w.id),['b','a']);
  assert.equal(Object.keys(grouped).length,1);
});
