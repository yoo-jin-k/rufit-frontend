import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addExercise, addSet, finishWorkout, setLabels, setSetDetail, startWorkout, updateSet, type Workout } from '../src/features/workout/model.ts';
import { decodeArchive, emptyArchive, remember } from '../src/features/workout/storage.ts';
import { importPreviousSets } from '../src/features/workout/previousSetModel.ts';
import { recommendSet } from '../src/features/workout/setEditorModel.ts';

const SQUAT = '00000000-0000-4000-8000-000000000001';

function twoSets(): Workout {
  return addSet(addExercise(startWorkout('w', 0), 'e', '스쿼트', SQUAT), 'e', 's2');
}

test('세트 종류와 자각도를 저장하고, 자각도는 null로 지웁니다', () => {
  let w = twoSets();
  const first = w.exercises[0]!.sets[0]!.id;
  w = setSetDetail(w, 'e', first, { setType: 'WARMUP' });
  w = setSetDetail(w, 'e', first, { rpe: 8 });
  assert.deepEqual([w.exercises[0]!.sets[0]!.setType, w.exercises[0]!.sets[0]!.rpe], ['WARMUP', 8]);
  w = setSetDetail(w, 'e', first, { rpe: null, setType: 'NORMAL' });
  assert.equal('rpe' in w.exercises[0]!.sets[0]!, false);
  assert.equal('setType' in w.exercises[0]!.sets[0]!, false, '일반 세트는 예전 기록과 같은 모양');
  assert.throws(() => setSetDetail(w, 'e', first, { rpe: 4 }));
  assert.throws(() => setSetDetail(w, 'e', 'none', { rpe: 8 }));
});

test('번호 칸은 웜업 W·드롭 D·실패 F, 일반 세트끼리 1부터 셉니다', () => {
  const sets = [
    { id: 'a', weight: '', reps: '', completed: false, setType: 'WARMUP' as const },
    { id: 'b', weight: '', reps: '', completed: false },
    { id: 'c', weight: '', reps: '', completed: false, setType: 'DROP' as const },
    { id: 'd', weight: '', reps: '', completed: false },
    { id: 'e', weight: '', reps: '', completed: false, setType: 'FAILURE' as const },
  ];
  assert.deepEqual(setLabels(sets), ['W', '1', 'D', '2', 'F']);
});

test('세트 종류·자각도가 있는 기록을 저장했다 다시 읽고, 잘못된 값은 거절합니다', () => {
  let w = twoSets();
  w = setSetDetail(w, 'e', w.exercises[0]!.sets[0]!.id, { setType: 'DROP', rpe: 9 });
  const raw = JSON.stringify(remember(emptyArchive(), w));
  assert.deepEqual(decodeArchive(raw).current, w);
  const broken = JSON.parse(raw);
  broken.current.exercises[0].sets[0].rpe = 11;
  assert.throws(() => decodeArchive(JSON.stringify(broken)));
});

test('세트 복제와 지난 기록 불러오기는 종류를 이어받고 자각도는 비웁니다', () => {
  let w = twoSets();
  const first = w.exercises[0]!.sets[0]!.id;
  w = setSetDetail(w, 'e', first, { setType: 'DROP', rpe: 9 });
  w = addSet(w, 'e', 'copy', first);
  const copy = w.exercises[0]!.sets.find((s) => s.id === 'copy')!;
  assert.deepEqual([copy.setType, copy.rpe], ['DROP', undefined]);
  let n = 0;
  const loaded = importPreviousSets(w, 'e', { ...w.exercises[0]!, sets: [{ id: 'p', weight: '50', reps: '5', completed: true, setType: 'FAILURE', rpe: 10 }] }, () => `n${++n}`, true);
  assert.deepEqual([loaded.exercises[0]!.sets[0]!.setType, loaded.exercises[0]!.sets[0]!.rpe], ['FAILURE', undefined]);
});

test('추천값은 웜업 세트를 빼고 계산합니다', () => {
  let past = addSet(addExercise(startWorkout('p', 1_000), 'pe', '스쿼트', SQUAT), 'pe', 'pe-2');
  const [a, b] = past.exercises[0]!.sets.map((s) => s.id);
  past = updateSet(past, 'pe', a!, { weight: '100', reps: '3', completed: true });
  past = setSetDetail(past, 'pe', a!, { setType: 'WARMUP' });
  past = updateSet(past, 'pe', b!, { weight: '60', reps: '8', completed: true });
  past = finishWorkout(past, 2_000);
  const rec = recommendSet([past], twoSets().exercises[0]!, 'BARBELL');
  assert.deepEqual([rec.weight, rec.reps], ['60', '9']);
});
