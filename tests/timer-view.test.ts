import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  workoutViewport,
  restTimerView,
  wrappableTime,
} from '../src/features/workout/timerView.ts';
import { completeWithRest, adjustLocalRest } from '../src/features/workout/localRest.ts';
import { remember, emptyArchive } from '../src/features/workout/storage.ts';
import {
  startWorkout,
  addExercise,
  updateSet,
  pauseWorkout,
  elapsedWorkoutMs,
} from '../src/features/workout/model.ts';

test('타이머 배치는 실제 safe area와 글자 배율에 따라 바뀐다', () => {
  assert.equal(workoutViewport(320, 0, 0, 1).contentPadding, 16);
  assert.equal(workoutViewport(375, 0, 0, 1).contentPadding, 20);
  assert.equal(workoutViewport(768, 0, 0, 1).contentPadding, 24);
  assert.equal(workoutViewport(430, 40, 40, 1).contentPadding, 16);
  assert.equal(workoutViewport(320, 0, 0, 1.3).stackRestActions, true);
  assert.equal(workoutViewport(1024, 0, 0, 2).stackRestActions, true);
});
test('휴식 경계 버튼과 표시 초는 일치하며 만료 후 +10초만 다시 허용한다', () => {
  assert.deepEqual(restTimerView(6000, 1000), {
    seconds: 5,
    elapsedSeconds: 0,
    phase: 'active',
    canSubtract: true,
    canAdd: true,
  });
  assert.deepEqual(restTimerView(1000, 1000), {
    seconds: 0,
    elapsedSeconds: 0,
    phase: 'expired',
    canSubtract: false,
    canAdd: true,
  });
  assert.equal(restTimerView(3601000, 1000).canAdd, false);
  assert.equal(restTimerView(3601000, 1001).canAdd, false);
  assert.equal(restTimerView(3601000, 2000).canAdd, true);
});
test('정지된 운동에서 휴식 경계 조절은 시간·세트·개인설정을 유지한다', () => {
  let a = remember(
    emptyArchive(),
    updateSet(addExercise(startWorkout('w', 0), 'e', '스쿼트'), 'e', 'e-1', {
      weight: '1',
      reps: '2',
    }),
  );
  a = completeWithRest(a, 'e', 'e-1', true, 1000);
  a = remember(a, pauseWorkout(a.current!, 2000));
  const expired = adjustLocalRest(a, -10, a.rest!.endsAt - 5000);
  assert.equal(restTimerView(expired.rest!.endsAt, expired.rest!.endsAt).phase, 'expired');
  const added = adjustLocalRest(expired, 10, 999000);
  assert.equal(restTimerView(added.rest!.endsAt, 999000).seconds, 10);
  assert.deepEqual(added.current, a.current);
  assert.deepEqual(added.personalRest, a.personalRest);
  assert.equal(elapsedWorkoutMs(added.current!, 999000), 2000);
});
test('큰 시간 표시는 축소 없이 콜론 뒤에서 줄바꿈할 수 있다', () => {
  assert.equal(wrappableTime('123:45:06'), '123:\u200B45:\u200B06');
  assert.equal(wrappableTime('60:00').replaceAll('\u200B', ''), '60:00');
});

// 휴식 만료 경계에서 0:00을 표시한 뒤 다음 세트의 경과 시간을 올립니다.
test('휴식 종료 직후 세트 타이머가 0초부터 증가하며 늦은 재진입도 반영합니다', () => {
  assert.equal(restTimerView(10000, 9999).seconds, 1);
  assert.equal(restTimerView(10000, 10000).elapsedSeconds, 0);
  assert.equal(restTimerView(10000, 10999).elapsedSeconds, 0);
  assert.equal(restTimerView(10000, 11000).elapsedSeconds, 1);
  assert.equal(restTimerView(10000, 36000).elapsedSeconds, 26);
});
