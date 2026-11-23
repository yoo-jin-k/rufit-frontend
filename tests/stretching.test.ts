import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exerciseCatalog,
  isTimedExercise,
  searchExercises,
} from '../src/features/exercises/catalog.ts';
import { prepareWorkoutDraft } from '../src/features/workout/draftMapping.ts';
import type { Workout } from '../src/features/workout/model.ts';
import { recommendSet } from '../src/features/workout/setEditorModel.ts';
import { setFieldErrors } from '../src/features/workout/setRowView.ts';
import { fromServerCount, setValueText, toServerCount } from '../src/features/workout/setCount.ts';
import { muscleRecovery } from '../src/features/recovery/model.ts';

const HAMSTRING = '96c626c9-013d-5085-a0fc-42b9f1a01625';
const PLANK = 'be98d421-1e9d-5d87-bd98-530361afd8e4';
const SQUAT = '00000000-0000-4000-8000-000000000001';

test('스트레칭 탭과 시간 종목을 찾는다', () => {
  assert.equal(searchExercises('', 'STRETCH').length, 12);
  assert.equal(searchExercises('plank')[0]?.name, '플랭크');
  assert.ok(isTimedExercise(HAMSTRING));
  assert.ok(isTimedExercise(PLANK));
  assert.equal(isTimedExercise(SQUAT), false);
  assert.equal(isTimedExercise(undefined), false);
});

test('시간 종목은 서버에 durationSeconds로, 나머지는 reps로 보낸다', () => {
  assert.deepEqual(toServerCount(PLANK, '45'), { reps: null, durationSeconds: 45 });
  assert.deepEqual(toServerCount(SQUAT, '10'), { reps: 10 });
  assert.equal(fromServerCount({ reps: null, durationSeconds: 30 }), 30);
  assert.equal(fromServerCount({ reps: 8 }), 8);
  assert.equal(fromServerCount({}), undefined);
  assert.equal(setValueText(true, '0kg', '30'), '30초');
  assert.equal(setValueText(false, '60kg', '10'), '60kg × 10회');
});

test('운동 저장 요청에서 시간 세트는 무게 0·횟수 없이 시간만 담는다', () => {
  const workout: Workout = {
    id: 'w',
    startedAt: 0,
    exercises: [
      {
        id: 'e1',
        name: '플랭크',
        catalogId: PLANK,
        sets: [{ id: 's1', weight: '0', reps: '60', completed: true }],
      },
      {
        id: 'e2',
        name: '스쿼트',
        catalogId: SQUAT,
        sets: [{ id: 's2', weight: '60', reps: '10', completed: false }],
      },
    ],
  };
  const prepared = prepareWorkoutDraft(workout, {
    operationId: '00000000-0000-4000-8000-000000000000',
    version: 0,
    note: '',
    rest: null,
  });
  assert.equal(prepared.kind, 'ready');
  if (prepared.kind !== 'ready') return;
  assert.deepEqual(prepared.draft.sets[0]!.set, {
    exerciseId: PLANK,
    exerciseName: '플랭크',
    weight: 0,
    reps: null,
    durationSeconds: 60,
  });
  assert.equal(prepared.draft.sets[1]!.set.reps, 10);
  assert.equal(prepared.draft.sets[1]!.set.durationSeconds, undefined);
});

test('시간 종목 추천은 처음 30초, 지난 기록이 있으면 가장 긴 시간 + 5초', () => {
  const exercise = { id: 'e', name: '플랭크', catalogId: PLANK, sets: [] };
  assert.deepEqual(recommendSet([], exercise, 'BODYWEIGHT', true), {
    weight: '0',
    reps: '30',
    basis: 'starter',
  });
  const history: Workout[] = [
    {
      id: 'h',
      startedAt: 1,
      finishedAt: 2,
      exercises: [
        {
          id: 'p',
          name: '플랭크',
          catalogId: PLANK,
          sets: [
            { id: 'a', weight: '0', reps: '40', completed: true },
            { id: 'b', weight: '0', reps: '55', completed: true },
          ],
        },
      ],
    },
  ];
  assert.equal(recommendSet(history, exercise, 'BODYWEIGHT', true).reps, '60');
});

test('시간 세트의 입력 오류 문구는 초 단위다', () => {
  const set = { id: 's', weight: '0', reps: '', completed: false };
  assert.match(setFieldErrors(set, true).reps, /초/);
  assert.match(setFieldErrors(set).reps, /회/);
});

test('스트레칭은 근육 회복 계산에 넣지 않고, 플랭크는 복부에 넣는다', () => {
  const now = Date.parse('2026-11-23T12:00:00Z');
  const sets = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `s${i}`,
      weight: '0',
      reps: '30',
      completed: true,
    }));
  const history: Workout[] = [
    {
      id: 'w',
      startedAt: now - 3_600_000,
      finishedAt: now - 3_000_000,
      exercises: [
        { id: 'a', name: '햄스트링 스트레칭', catalogId: HAMSTRING, sets: sets(3) },
        { id: 'b', name: '플랭크', catalogId: PLANK, sets: sets(3) },
      ],
    },
  ];
  const result = muscleRecovery(history, exerciseCatalog, now);
  assert.equal(result.find((r) => r.part === 'LEGS')?.percent, 100);
  assert.ok((result.find((r) => r.part === 'CORE')?.percent ?? 100) < 100);
});

test('기기 기록 업로드는 종목 없이 시간만 남긴 기록을 빼고 시간 세트 기록은 올린다', async () => {
  const { uploadCandidates, workoutImportBody } = await import(
    '../src/features/sync/workoutTransfer.ts'
  );
  const timeOnly: Workout = { id: 'a', startedAt: 1, finishedAt: 2, exercises: [] };
  const plank: Workout = {
    id: 'b',
    startedAt: 3,
    finishedAt: 4,
    exercises: [
      {
        id: 'p',
        name: '플랭크',
        catalogId: PLANK,
        sets: [{ id: 's', weight: '0', reps: '30', completed: true }],
      },
    ],
  };
  const server: Workout = { ...plank, id: 'server:x' };
  assert.deepEqual(
    uploadCandidates([timeOnly, plank, server]).map((w) => w.id),
    ['b'],
  );
  assert.deepEqual(workoutImportBody(plank).sets[0]!.set, {
    exerciseId: PLANK,
    exerciseName: '플랭크',
    weight: 0,
    reps: null,
    durationSeconds: 30,
  });
});
