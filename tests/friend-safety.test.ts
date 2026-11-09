import assert from 'node:assert/strict';
import test from 'node:test';
import {
  changeSafety as change,
  decodeSafety,
  emptySafety,
} from '../src/features/profile/friendSafetyModel.ts';
import { testSelf } from '../src/features/profile/friendTestModel.ts';
test('차단은 기존 친구·신청을 제거하고 양쪽 재신청과 수락을 차단합니다', () => {
  let data = change(emptySafety(), testSelf, 'test-1', 'request');
  data = change(data, 'test-1', testSelf, 'accept');
  data = change(data, testSelf, 'test-1', 'block');
  assert.equal(data.records.length, 0);
  assert.throws(() => change(data, 'test-1', testSelf, 'request'));
  assert.throws(() => change(data, testSelf, 'test-1', 'accept'));
  assert.equal(change(data, 'test-1', testSelf, 'unblock').blocks.length, 1);
  data = change(data, testSelf, 'test-1', 'unblock');
  assert.equal(data.records.length, 0);
  assert.equal(change(data, testSelf, 'test-1', 'request').records.length, 1);
});
test('친구 해제는 친구인 상대에게만 가능하며 제삼자 관계를 변경하지 않습니다', () => {
  let data = change(emptySafety(), testSelf, 'test-1', 'request');
  assert.throws(() => change(data, testSelf, 'test-1', 'unfriend'));
  data = change(data, 'test-1', testSelf, 'accept');
  data = change(data, 'test-2', 'test-3', 'request');
  data = change(data, 'test-1', testSelf, 'unfriend');
  assert.deepEqual(data.records, [{ from: 'test-2', to: 'test-3', status: 'pending' }]);
});
test('신고는 사유를 검증하고 관계를 유지하며 중복 저장하지 않습니다', () => {
  const data = change(emptySafety(), 'test-2', testSelf, 'request');
  assert.throws(() => change(data, testSelf, 'test-2', 'report'));
  const reported = change(data, testSelf, 'test-2', 'report', '스팸·광고');
  assert.deepEqual(reported.records, data.records);
  assert.equal(change(reported, testSelf, 'test-2', 'report', '스팸·광고').reports.length, 1);
  assert.deepEqual(decodeSafety(JSON.stringify(reported)), reported);
  assert.throws(() => decodeSafety('{broken'));
  assert.throws(() => change(data, testSelf, testSelf, 'block'));
});
