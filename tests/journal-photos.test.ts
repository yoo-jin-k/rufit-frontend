import test from 'node:test';
import assert from 'node:assert/strict';
import { journalDraftChanged, decodeProfile, emptyProfile, journalPhotos, upsertJournal, type Journal } from '../src/features/profile/journalModel.ts';
const one = 'data:image/jpeg;base64,YQ==';
const two = 'data:image/jpeg;base64,Yg==';
const old: Journal = { workoutId: 'w', memo: '기록', photo: one, visibility: 'private', createdAt: 1 };
test('한 장 형식과 여러 장 저장·대표 사진·전체 삭제를 호환하며 원본을 유지합니다', () => {
  assert.deepEqual(journalPhotos(old), [one]);
  const saved = upsertJournal(emptyProfile(), { ...old, photos: [two, one] });
  assert.equal(saved.journals[0].photo, two);
  assert.deepEqual(journalPhotos(decodeProfile(JSON.stringify(saved)).journals[0]), [two, one]);
  const cleared = upsertJournal(saved, { ...saved.journals[0], photos: [] });
  assert.deepEqual(journalPhotos(cleared.journals[0]), []);
  assert.equal(cleared.journals[0].photo, undefined);
  assert.equal(saved.journals[0].photos?.length, 2);
  assert.equal(old.photo, one);
});
test('사진 개수와 손상된 저장 형식을 검증합니다', () => {
  assert.throws(() => upsertJournal(emptyProfile(), { ...old, photos: Array(6).fill(one) }));
  assert.throws(() => decodeProfile(JSON.stringify({ ...emptyProfile(), journals: [{ ...old, photos: [12] }] })));
  assert.deepEqual(journalPhotos(decodeProfile(JSON.stringify({ ...emptyProfile(), journals: [old] })).journals[0]), [one]);
});


test('작성 취소 확인은 글 변경과 사진 추가·삭제·순서를 구분합니다', () => {
  assert.equal(journalDraftChanged(undefined, '', []), false);
  assert.equal(journalDraftChanged(undefined, '오늘 완료', []), true);
  assert.equal(journalDraftChanged(old, old.memo, [one]), false);
  assert.equal(journalDraftChanged(old, old.memo, []), true);
  const multiple = { ...old, photos: [one, two] };
  assert.equal(journalDraftChanged(multiple, old.memo, [two, one]), true);
});
