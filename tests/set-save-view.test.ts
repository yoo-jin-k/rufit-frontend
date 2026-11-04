import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stackedSetRow, setFieldErrors} from '../src/features/workout/setRowView.ts';
import {localSaveView, saveAnnouncement, type LocalSaveInput} from '../src/features/workout/localSaveView.ts';
const input: LocalSaveInput = {state: 'saved', ready: true, retryPending: false, unsavedAfterFailure: false};
test('세트행은 실제 내부316 경계와 큰 글자에서만 두 행으로 전환한다', () => {
  for (const width of [0, 256, 303, 315]) assert.equal(stackedSetRow(width, 1), true);
  for (const width of [316, 358, 560]) assert.equal(stackedSetRow(width, 1), false);
  for (const scale of [1.3, 2]) assert.equal(stackedSetRow(560, scale), true);
});
test('필드 오류는 기존 도메인 규칙을 따르고 빈 초안·소수·상한을 보존한다', () => {
  const set = {id: 's', weight: '', reps: '', completed: false};
  assert.ok(setFieldErrors(set).weight);assert.ok(setFieldErrors(set).reps);
  for (const weight of ['0', '1.25', '1500', '0002']) assert.equal(setFieldErrors({...set, weight}).weight, '');
  for (const weight of ['-1', '1.234', '1500.01', 'a']) assert.ok(setFieldErrors({...set, weight}).weight);
  for (const reps of ['1', '1000', '0020']) assert.equal(setFieldErrors({...set, reps}).reps, '');
  for (const reps of ['0', '1001', '1.5', '-1']) assert.ok(setFieldErrors({...set, reps}).reps);
  assert.deepEqual(set, {id: 's', weight: '', reps: '', completed: false});
});
test('읽기 실패의 재시도와 쓰기 실패 이후 새 편집은 안내를 유지한다', () => {
  const reading = localSaveView({...input, ready: false, state: 'loading'});
  assert.equal(reading.warning, false);
  const retryRead = localSaveView({...input, ready: false, state: 'loading', retryPending: true});
  assert.equal(retryRead.warning, true);assert.equal(retryRead.retryLoading, true);assert.equal(retryRead.retryLabel, '다시 불러오기');
  const failed = localSaveView({...input, state: 'save-error', unsavedAfterFailure: true});
  const editing = localSaveView({...input, state: 'saving', unsavedAfterFailure: true});
  assert.equal(editing.description, failed.description);assert.equal(editing.warning, true);
  assert.equal(editing.retryLoading, false);assert.equal(editing.retryDisabled, true);
  const retry = localSaveView({...input, state: 'saving', unsavedAfterFailure: true, retryPending: true});
  assert.equal(retry.description, failed.description);assert.equal(retry.retryLoading, true);
});
test('평상시 저장을 낭독하지 않고 실패·재시도·복구 성공만 알린다', () => {
  const saved = localSaveView(input), saving = localSaveView({...input, state: 'saving'});
  assert.equal(saveAnnouncement(null, saved), '');assert.equal(saveAnnouncement(saved, saving), '');assert.equal(saveAnnouncement(saving, saved), '');
  const fail = localSaveView({...input, state: 'save-error', unsavedAfterFailure: true});
  const retry = localSaveView({...input, state: 'saving', retryPending: true, unsavedAfterFailure: true});
  assert.ok(saveAnnouncement(saved, fail));assert.equal(saveAnnouncement(fail, fail), '');assert.ok(saveAnnouncement(fail, retry));
  assert.equal(saveAnnouncement(retry, saved), '기기에 저장됨');assert.equal(saveAnnouncement(saved, saved), '');
});
