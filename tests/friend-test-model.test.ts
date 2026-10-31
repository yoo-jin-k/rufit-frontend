import assert from 'node:assert/strict';
import test from 'node:test';
import {
  changeTestRelation as change,
  decodeTestRelations,
  testSelf,
  testUsers,
} from '../src/features/profile/friendTestModel.ts';
test('테스트 유저는 중복 없이 다섯 명이며 자신·알 수 없는 사용자는 신청할 수 없습니다', () => {
  assert.equal(testUsers.length, 5);
  assert.equal(new Set(testUsers.map((u) => u.nickname)).size, 5);
  assert.throws(() => change([], testSelf, testSelf, 'request'));
  assert.throws(() => change([], testSelf, 'real-user', 'request'));
});
test('신청·수락은 양방향 친구 한 건으로 보존되며 중복과 잘못된 권한을 거부합니다', () => {
  const pending = change([], testSelf, 'test-1', 'request');
  assert.throws(() => change(pending, 'test-1', testSelf, 'request'));
  assert.throws(() => change(pending, testSelf, 'test-1', 'accept'));
  assert.throws(() => change(pending, 'test-1', testSelf, 'cancel'));
  const accepted = change(pending, 'test-1', testSelf, 'accept');
  assert.equal(accepted[0].status, 'accepted');
  assert.deepEqual(decodeTestRelations(JSON.stringify(accepted)), accepted);
  assert.throws(() => change(accepted, testSelf, 'test-1', 'cancel'));
});
test('신청 취소와 거절 이후 다시 신청할 수 있으며 손상된 자료는 거부합니다', () => {
  const pending = change([], testSelf, 'test-2', 'request');
  assert.deepEqual(change(pending, testSelf, 'test-2', 'cancel'), []);
  assert.deepEqual(change(pending, 'test-2', testSelf, 'reject'), []);
  assert.equal(change([], testSelf, 'test-2', 'request').length, 1);
  assert.throws(() => decodeTestRelations(JSON.stringify([...pending, ...pending])));
  assert.throws(() => decodeTestRelations('[{"from":"unknown"}]'));
});
