import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile, decodeProfile, updateProfileAvatar, upsertJournal } from '../src/features/profile/journalModel.ts';
test('프로필 사진 변경·삭제·재로딩은 소개와 게시물 사진을 보존합니다', () => {
  const image = 'data:image/jpeg;base64,YQ==';
  const original = upsertJournal({ ...emptyProfile(), bio: '소개', gym: '강남점' }, { workoutId: 'w', memo: '오늘', photos: [image], visibility: 'private', createdAt: 1 });
  const edited = updateProfileAvatar(original, image);
  assert.equal(decodeProfile(JSON.stringify(edited)).avatar, image);
  assert.equal(edited.bio, '소개');
  assert.equal(original.avatar, undefined);
  const removed = updateProfileAvatar(edited);
  assert.equal(removed.avatar, undefined);
  assert.deepEqual(removed.journals, original.journals);
  assert.deepEqual(decodeProfile(JSON.stringify(removed)), removed);
  assert.throws(() => updateProfileAvatar(original, 'not-an-image'));
  assert.throws(() => decodeProfile(JSON.stringify({ ...original, avatar: 123 })));
});
