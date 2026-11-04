import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addExercise, finishWorkout, startWorkout, updateSet } from '../src/features/workout/model.ts';
import { routineFromWorkout } from '../src/features/routines/model.ts';
import { createRoutineStorage, decodeRoutineLibrary, emptyRoutineLibrary, MAX_ROUTINES, upsertRoutine } from '../src/features/routines/storage.ts';

function routine(id: string) {
  let workout = addExercise(startWorkout(`w-${id}`, 0), 'e', '스쿼트');
  workout = updateSet(workout, 'e', 'e-1', { weight: '60', reps: '10', completed: true });
  return routineFromWorkout(finishWorkout(workout, 1), id, 2, `루틴 ${id}`);
}

test('루틴을 저장하고 앱 재시작처럼 새 저장 객체에서 다시 읽는다', async () => {
  let raw: string | null = null;
  const adapter = { getItem: async () => raw, setItem: async (_: string, value: string) => { raw = value; } };
  const storage = createRoutineStorage(adapter);
  const library = upsertRoutine(emptyRoutineLibrary(), routine('r1'));
  await storage.save(library);
  assert.deepEqual(await createRoutineStorage(adapter).load(), library);
});

test('같은 ID 저장은 중복 생성 없이 최신 루틴으로 교체한다', () => {
  const first = routine('r1');
  const updated = { ...first, name: '수정 루틴', updatedAt: 3 };
  const library = upsertRoutine(upsertRoutine(emptyRoutineLibrary(), first), updated);
  assert.equal(library.routines.length, 1);
  assert.equal(library.routines[0].name, '수정 루틴');
});

test('느린 이전 저장이 최신 루틴을 덮어쓰지 않는다', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let began!: () => void;
  const started = new Promise<void>(resolve => { began = resolve; });
  let calls = 0;
  let raw: string | null = null;
  const storage = createRoutineStorage({ getItem: async () => raw, setItem: async (_key, value) => {
    if (++calls === 1) { began(); await gate; }
    raw = value;
  } });
  const first = storage.save(upsertRoutine(emptyRoutineLibrary(), routine('first')));
  const secondLibrary = upsertRoutine(upsertRoutine(emptyRoutineLibrary(), routine('first')), routine('second'));
  const second = storage.save(secondLibrary);
  await started;
  assert.equal(calls, 1);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(await storage.load(), secondLibrary);
});

test('손상 데이터·중복 ID·최대 개수 초과를 거부한다', () => {
  assert.throws(() => decodeRoutineLibrary('{'));
  assert.throws(() => decodeRoutineLibrary('{}'));
  const r = routine('r');
  assert.throws(() => decodeRoutineLibrary(JSON.stringify({ schemaVersion: 1, routines: [r, r] })));
  let library = emptyRoutineLibrary();
  for (let i = 0; i < MAX_ROUTINES; i++) library = upsertRoutine(library, routine(`r${i}`));
  assert.equal(library.routines.length, MAX_ROUTINES);
  assert.throws(() => upsertRoutine(library, routine('overflow')), /50/);
});
