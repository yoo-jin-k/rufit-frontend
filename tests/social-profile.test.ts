import assert from 'node:assert/strict';
import test from 'node:test';
import { testSocialProfiles } from '../src/features/profile/testSocialData.ts';
import {
  decodeLikes,
  toggleLike,
  receivedLikes,
  readLike,
} from '../src/features/profile/likeModel.ts';

import { countTestFriends } from '../src/features/profile/friendTestModel.ts';

import {
  addOwnSamplePosts,
  updateProfileDetails,
  emptyProfile,
  decodeProfile,
} from '../src/features/profile/journalModel.ts';
test('다섯 가상 프로필은 사진과 고유한 게시물 세 개씩을 가집니다', () => {
  assert.equal(testSocialProfiles.length, 5);
  assert.equal(new Set(testSocialProfiles.map((p) => p.avatar)).size, 5);
  const posts = testSocialProfiles.flatMap((p) => p.posts);
  assert.equal(posts.length, 15);
  assert.equal(new Set(posts.map((p) => p.id)).size, 15);
  for (const p of posts) {
    assert.match(p.date, /^2026-10-\d{2}$/);
    assert.ok(p.tile >= 0 && p.tile <= 8);
    assert.ok(p.sets > 0 && p.reps > 0 && p.minutes > 0);
  }
});
test('하트는 사용자별 하나이며 취소 시 다른 사용자와 게시물의 하트를 보존합니다', () => {
  let likes = toggleLike([], 'local-self', 'test:test-1-post-1');
  likes = toggleLike(likes, 'test-2', 'test:test-1-post-1');
  likes = toggleLike(likes, 'local-self', 'own:workout-1');
  assert.deepEqual(decodeLikes(JSON.stringify(likes)), likes);
  likes = toggleLike(likes, 'local-self', 'test:test-1-post-1');
  assert.equal(likes.length, 2);
  assert.ok(likes.some((l) => l.actor === 'test-2'));
  assert.ok(likes.some((l) => l.post === 'own:workout-1'));
});
test('손상되거나 중복된 하트 자료를 거부합니다', () => {
  assert.throws(() => decodeLikes('{broken'));
  assert.throws(() => decodeLikes('[{"actor": "a", "post": 3}]'));
  assert.throws(() =>
    decodeLikes(
      JSON.stringify([
        { actor: 'a', post: 'b' },
        { actor: 'a', post: 'b' },
      ]),
    ),
  );
  assert.throws(() => toggleLike([], '', 'post'));
});
test('내 하트와 타인 게시물 하트는 알림에서 제외하고 읽음은 대상 하나에만 적용합니다', () => {
  let likes = toggleLike([], 'test-1', 'own:w1');
  likes = toggleLike(likes, 'local-self', 'own:w1');
  likes = toggleLike(likes, 'test-2', 'test:test-3-post-1');
  assert.equal(receivedLikes(likes).length, 1);
  assert.equal(receivedLikes(likes)[0].read, false);
  likes = readLike(likes, 'test-1', 'own:w1');
  assert.equal(receivedLikes(likes)[0].read, true);
  likes = toggleLike(likes, 'test-1', 'own:w1');
  assert.equal(receivedLikes(likes).length, 0);
  likes = toggleLike(likes, 'test-1', 'own:w1');
  assert.equal(receivedLikes(likes)[0].read, false);
});
test('친구 수는 없으면 0이며 수락 관계만 양방향으로 집계합니다', () => {
  assert.equal(countTestFriends([], 'test-self'), 0);
  const records = [
    { from: 'test-1', to: 'test-self', status: 'accepted' as const },
    { from: 'test-2', to: 'test-self', status: 'pending' as const },
  ];
  assert.equal(countTestFriends(records, 'test-self'), 1);
  assert.equal(countTestFriends(records, 'test-1'), 1);
  assert.equal(countTestFriends(records, 'test-2'), 0);
});
test('내 샘플 게시물은 기존 기록을 보존하고 반복 추가해도 세 개만 생성합니다', () => {
  const original = {
    ...emptyProfile(),
    journals: [
      { workoutId: 'real-1', memo: '기존 기록', visibility: 'private' as const, createdAt: 1 },
    ],
  };
  const seeded = addOwnSamplePosts(original);
  assert.equal(seeded.journals.length, 4);
  assert.deepEqual(seeded.journals[0], original.journals[0]);
  assert.deepEqual(addOwnSamplePosts(seeded), seeded);
  assert.deepEqual(decodeProfile(JSON.stringify(seeded)), seeded);
});

 test('프로필 소개와 지점은 기존 기록을 보존하고 선택 항목 삭제 및 재로딩을 지원합니다', () => {
  const original = addOwnSamplePosts(emptyProfile());
  const edited = updateProfileDetails(original, ' 운동하는 나 ', ' 꾸준히 운동합니다 ', ' 루핏짐 강남점 ');
  assert.equal(edited.bio, '꾸준히 운동합니다');
  assert.equal(edited.gym, '루핏짐 강남점');
  assert.deepEqual(edited.journals, original.journals);
  assert.deepEqual(decodeProfile(JSON.stringify(edited)), edited);
  assert.equal(decodeProfile(JSON.stringify(original)).nickname, original.nickname);
  assert.equal(updateProfileDetails(edited, edited.nickname, '', '').gym, '');
  assert.throws(() => updateProfileDetails(original, '나', '가'.repeat(81), ''));
  assert.throws(() => decodeProfile(JSON.stringify({ ...original, gym: 123 })));
});
