import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addExercise,startWorkout,updateSet} from '../src/features/workout/model.ts';
import {appendManualWorkout,completeManualWorkout} from '../src/features/workout/manualWorkout.ts';
import {decodeArchive,emptyArchive,isWorkout} from '../src/features/workout/storage.ts';
import {workoutsByDay} from '../src/features/calendar/model.ts';
const draft=updateSet(addExercise(startWorkout('manual',100),'s','스쿼트'),'s','s-1',{weight:'80',reps:'5'});
test('과거 날짜로 기록하되 현재 운동과 휴식은 유지하며 재시작 뒤 같은 날짜로 복원한다',()=>{
  const record=completeManualWorkout(draft,'2026-01-05',200);
  const archive={...emptyArchive(),current:startWorkout('active',50),personalRest:{s:60}};
  const saved=appendManualWorkout(archive,record);
  assert.equal(saved.current,archive.current);
  assert.equal(saved.personalRest,archive.personalRest);
  assert.equal(record.startedAt,200);
  assert.equal(record.finishedAt,200);
  assert.equal(record.exercises[0].sets[0].completed,true);
  assert.equal(workoutsByDay(decodeArchive(JSON.stringify(saved)).history)['2026-01-05'][0].id,'manual');
  assert.equal(appendManualWorkout(saved,record).history.length,1);
  assert.equal(isWorkout({...record,recordDate:'2026-02-30'}),false);
});
test('미래·잘못된 날짜·빈 세트는 저장하지 않는다',()=>{
  for(const date of ['2099-01-01','2026-02-30',''])assert.throws(()=>completeManualWorkout(draft,date));
  assert.throws(()=>completeManualWorkout(startWorkout('empty',100),'2026-01-05'));
  assert.throws(()=>completeManualWorkout(addExercise(startWorkout('empty',100),'s','스쿼트'),'2026-01-05'));
});
