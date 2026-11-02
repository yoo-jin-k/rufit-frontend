import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addExercise, startWorkout, updateSet, elapsedWorkoutMs } from '../src/features/workout/model.ts';
import { emptyArchive, remember, decodeArchive, finishArchivedWorkout } from '../src/features/workout/storage.ts';
import { completeWithRest, pauseLocalRest, resumeLocalRest, adjustLocalRest, applyRestSettings } from '../src/features/workout/localRest.ts';
import { restTimerView } from '../src/features/workout/timerView.ts';
function fixture() {
  const w = updateSet(addExercise(startWorkout('rest-test', 0), 'e', '테스트'), 'e', 'e-1', { weight: '20', reps: '10' });
  return completeWithRest(remember(emptyArchive(), w), 'e', 'e-1', true, 1000);
}
test('휴식 정지 상태를 복구하고 시간을 조절해도 운동 경과 시간은 계속 흐릅니다', () => {
  const paused = pauseLocalRest(fixture(), 11000);
  assert.equal(pauseLocalRest(paused, 21000), paused);
  const restored = decodeArchive(JSON.stringify(paused));
  assert.equal(restTimerView(restored.rest!.endsAt, restored.rest!.pausedAt!).seconds, 80);
  assert.equal(elapsedWorkoutMs(restored.current!, 61000), 61000);
  const adjusted = adjustLocalRest(restored, 10, 61000);
  assert.equal(restTimerView(adjusted.rest!.endsAt, adjusted.rest!.pausedAt!).seconds, 90);
  const resumed = resumeLocalRest(adjusted, 61000);
  assert.equal(resumed.rest!.pausedAt, undefined);
  assert.equal(restTimerView(resumed.rest!.endsAt, 62000).seconds, 89);
  assert.equal(resumeLocalRest(resumed, 63000), resumed);
});
test('정지 중 설정 적용은 새 시간으로 시작하고 운동 완료는 휴식을 제거합니다', () => {
  const paused = pauseLocalRest(fixture(), 11000);
  const changed = applyRestSettings(paused, paused.current!.exercises[0], 120, false, 61000);
  assert.equal(changed.rest!.pausedAt, undefined);
  assert.equal(restTimerView(changed.rest!.endsAt, 61000).seconds, 120);
  assert.equal(finishArchivedWorkout(paused, 'rest-test', 61000).rest, null);
});
test('만료된 휴식은 정지하지 않고 잘못된 정지 시각은 복구하지 않습니다', () => {
  const archive = fixture();
  assert.equal(pauseLocalRest(archive, 100000), archive);
  for (const pausedAt of [null, '1000', -1, 100000, 1.5]) {
    assert.throws(() => decodeArchive(JSON.stringify({ ...archive, rest: { ...archive.rest, pausedAt } })));
  }
  assert.throws(() => resumeLocalRest(pauseLocalRest(archive, 11000), 10000));
});
