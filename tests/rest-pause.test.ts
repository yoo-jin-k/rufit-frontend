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
test('잘못된 정지 시각은 복구하지 않습니다', () => {
  const archive = fixture();
  for (const pausedAt of [null, '1000', -1, 1.5]) {
    assert.throws(() => decodeArchive(JSON.stringify({ ...archive, rest: { ...archive.rest, pausedAt } })));
  }
  assert.throws(() => resumeLocalRest(pauseLocalRest(archive, 11000), 10000));
});

test('휴식 후 세트 시간을 정지·복구·재개하고 다음 완료 시 새 휴식으로 전환합니다', () => {
  const archive = fixture();
  const end = archive.rest!.endsAt;
  const paused = decodeArchive(JSON.stringify(pauseLocalRest(archive, end + 26000)));
  assert.equal(restTimerView(paused.rest!.endsAt, paused.rest!.pausedAt!).elapsedSeconds, 26);
  const resumed = resumeLocalRest(paused, end + 60000);
  assert.equal(restTimerView(resumed.rest!.endsAt, end + 61000).elapsedSeconds, 27);
  const unchecked = completeWithRest(resumed, 'e', 'e-1', false, end + 62000);
  const next = completeWithRest(unchecked, 'e', 'e-1', true, end + 63000);
  assert.equal(restTimerView(next.rest!.endsAt, end + 63000).seconds, 90);
  assert.equal(next.rest!.pausedAt, undefined);
});
