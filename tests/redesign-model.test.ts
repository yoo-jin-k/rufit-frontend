import { emptyArchive, decodeArchive } from '../src/features/workout/storage.ts';
import {
  setDefaultRest,
  setPersonalRest,
  exerciseRest,
} from '../src/features/workout/localRest.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarDays } from '../src/features/calendar/model.ts';
import {
  decodeProfile,
  emptyProfile,
  upsertJournal,
} from '../src/features/profile/journalModel.ts';

test('주간은 월요일부터 시작하고 월 경계를 보존합니다', () => {
  assert.deepEqual(calendarDays('2026-11-01', false), [
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
    '2026-11-01',
  ]);
});
test('월간 날짜는 윤년과 월요일 시작을 반영합니다', () => {
  const dates = calendarDays('2024-02-15', true);
  assert.equal(dates[0], '2024-01-29');
  assert.ok(dates.includes('2024-02-29'));
  assert.equal(dates.length % 7, 0);
});
test('사진 없는 오운완도 저장되며 동일 운동 재작성은 중복되지 않습니다', () => {
  const entry = { workoutId: 'workout-1', memo: '', visibility: 'private' as const, createdAt: 1 };
  const once = upsertJournal(emptyProfile(), entry);
  const twice = upsertJournal(once, { ...entry, memo: '다시 작성' });
  assert.equal(twice.journals.length, 1);
  assert.equal(twice.journals[0].memo, '다시 작성');
  assert.deepEqual(decodeProfile(JSON.stringify(twice)), twice);
});
test('손상된 저장 자료와 과도한 사진을 빈 프로필로 덮어쓰지 않습니다', () => {
  assert.throws(() => decodeProfile('{broken'));
  assert.throws(() =>
    decodeProfile(
      JSON.stringify({
        version: 1,
        nickname: '나',
        journals: [{ workoutId: '1', memo: '', visibility: 'public', createdAt: 1 }],
      }),
    ),
  );
  assert.throws(() =>
    upsertJournal(emptyProfile(), {
      workoutId: '1',
      memo: '',
      visibility: 'private',
      createdAt: 1,
      photo: 'a'.repeat(2_800_001),
    }),
  );
  assert.throws(() =>
    decodeProfile(
      JSON.stringify({
        version: 1,
        nickname: '나',
        journals: [
          {
            workoutId: '1',
            memo: '',
            visibility: 'private',
            createdAt: 1,
            photo: 'file://temporary',
          },
        ],
      }),
    ),
  );
});

test('공통 휴식값은 저장 후 복원되며 종목 개인값보다 우선하지 않습니다', () => {
  const exercise = { id: 'e', name: '검수 운동', sets: [] };
  let archive = setDefaultRest(emptyArchive(), 45);
  assert.equal(exerciseRest(archive, exercise).seconds, 45);
  archive = setPersonalRest(archive, exercise, 0);
  assert.equal(exerciseRest(archive, exercise).seconds, 0);
  assert.equal(decodeArchive(JSON.stringify(archive)).personalRest['defaults:rest'], 45);
  archive = setDefaultRest(archive, null);
  assert.equal(exerciseRest(archive, exercise).seconds, 0);
  assert.throws(() => setDefaultRest(archive, 3601));
});
