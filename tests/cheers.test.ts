import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySafety } from '../src/features/profile/friendSafetyModel.ts';
import { decodeCheers, emptyCheers, heartbeat, receivedCheers, sendCheer, visibleFriends } from '../src/features/cheers/model.ts';
const social = emptySafety([{ from: 'me', to: 'friend', status: 'accepted' }, { from: 'me', to: 'waiting', status: 'pending' }]);
test('운동 중인 친구만 표시하고 만료·차단·미수락 관계는 숨깁니다', () => {
  let data = heartbeat(emptyCheers(), 'friend', 'workout-1', 1000);
  data = heartbeat(data, 'waiting', 'workout-2', 1000);
  assert.equal(visibleFriends(data, social, 'me', 1001).length, 1);
  assert.equal(visibleFriends(data, social, 'me', 121000).length, 0);
  assert.equal(visibleFriends(data, { ...social, blocks: [{ from: 'friend', to: 'me' }] }, 'me', 1001).length, 0);
});
test('같은 운동에는 한 번만 응원하고 새로운 운동에는 다시 보낼 수 있습니다', () => {
  const start = heartbeat(emptyCheers(), 'friend', 'one', 1000);
  const sent = sendCheer(start, social, 'me', 'friend', 'one', 1001);
  assert.equal(sendCheer(sent, social, 'me', 'friend', 'one', 1002).cheers.length, 1);
  const next = heartbeat(sent, 'friend', 'two', 2000);
  assert.equal(sendCheer(next, social, 'me', 'friend', 'two', 2001).cheers.length, 2);
  assert.equal(start.cheers.length, 0);
});
test('운동 종료·만료·친구 해제·차단 후 전송 및 본인 응원을 차단합니다', () => {
  const data = heartbeat(emptyCheers(), 'friend', 'one', 1000);
  assert.throws(() => sendCheer(heartbeat(data, 'friend', null, 2000), social, 'me', 'friend', 'one', 2001));
  assert.throws(() => sendCheer(data, social, 'me', 'friend', 'one', 121000));
  assert.throws(() => sendCheer(data, emptySafety(), 'me', 'friend', 'one', 1001));
  assert.throws(() => sendCheer(data, { ...social, blocks: [{ from: 'me', to: 'friend' }] }, 'me', 'friend', 'one', 1001));
  assert.throws(() => sendCheer(data, social, 'friend', 'friend', 'one', 1001));
});
test('받은 응원은 대상과 관계로 분리하며 손상된 저장자료는 거부합니다', () => {
  const data = sendCheer(heartbeat(emptyCheers(), 'friend', 'one', 1000), social, 'me', 'friend', 'one', 1001);
  assert.equal(receivedCheers(data, social, 'me').length, 0);
  assert.equal(receivedCheers(data, social, 'friend').length, 1);
  assert.equal(receivedCheers(data, emptySafety(), 'friend').length, 0);
  assert.deepEqual(decodeCheers(JSON.stringify(data)), data);
  assert.throws(() => decodeCheers(JSON.stringify({ ...data, cheers: [...data.cheers, ...data.cheers] })));
  assert.throws(() => decodeCheers('{broken'));
});
