import assert from 'node:assert/strict';
import test from 'node:test';
import { testSocialProfiles } from '../src/features/profile/testSocialData.ts';
import { decodeLikes, toggleLike } from '../src/features/profile/likeModel.ts';
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
