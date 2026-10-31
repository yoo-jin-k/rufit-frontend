/** 오운완은 운동 기록과 별도 저장합니다. 실패하거나 사진을 건너뛰어도 운동 원본은 보존합니다. */
export type Journal = {
  workoutId: string;
  memo: string;
  photo?: string;
  testPhotoTile?: number;
  visibility: 'private' | 'friends';
  createdAt: number;
};
export type ProfileData = { version: 1; nickname: string; journals: Journal[] };
export const profileKey = 'rufit.profile.v1';
export const emptyProfile = (): ProfileData => ({
  version: 1,
  nickname: '운동하는 나',
  journals: [],
});
export function decodeProfile(raw: string | null): ProfileData {
  if (!raw) return emptyProfile();
  const value = JSON.parse(raw);
  if (
    value?.version !== 1 ||
    typeof value.nickname !== 'string' ||
    !Array.isArray(value.journals) ||
    value.journals.some(
      (j: Journal) =>
        !j ||
        typeof j.workoutId !== 'string' ||
        typeof j.memo !== 'string' ||
        j.memo.length > 200 ||
        !['private', 'friends'].includes(j.visibility) ||
        !Number.isFinite(j.createdAt) ||
        (j.testPhotoTile !== undefined &&
          (!j.workoutId.startsWith('sample-own-') ||
            !Number.isInteger(j.testPhotoTile) ||
            j.testPhotoTile < 5 ||
            j.testPhotoTile > 8)) ||
        (j.photo !== undefined &&
          (typeof j.photo !== 'string' || !j.photo.startsWith('data:image/'))),
    )
  )
    throw new Error('프로필 기록을 읽을 수 없습니다. 기존 자료는 보존했습니다.');
  return value;
}
export function upsertJournal(profile: ProfileData, entry: Journal): ProfileData {
  if (entry.memo.length > 200) throw new Error('메모는 200자까지 입력해 주세요.');
  if (entry.photo && entry.photo.length > 2_800_000)
    throw new Error('사진이 큽니다. 2MB 이하 사진을 선택해 주세요.');
  return {
    ...profile,
    journals: [...profile.journals.filter((j) => j.workoutId !== entry.workoutId), entry],
  };
}

/** 사용자가 요청한 내 샘플 게시물만 추가합니다. 같은 샘플을 다시 추가하지 않고 기존 오운완을 보존합니다. */
export function addOwnSamplePosts(profile: ProfileData): ProfileData {
  const captions = [
    '[샘플] 상체 운동 완료 · 벤치프레스 60kg × 10회 × 3세트',
    '[샘플] 하체 운동 완료 · 스쿼트 50kg × 12회 × 3세트',
    '[샘플] 가볍게 걷고 스트레칭까지 완료',
  ];
  const samples: Journal[] = captions.map((memo, index) => ({
    workoutId: `sample-own-${index + 1}`,
    memo,
    testPhotoTile: 5 + index,
    visibility: 'private',
    createdAt: new Date(2026, 9, 31 - index, 18).getTime(),
  }));
  return {
    ...profile,
    journals: [
      ...profile.journals,
      ...samples.filter(
        (sample) => !profile.journals.some((j) => j.workoutId === sample.workoutId),
      ),
    ],
  };
}
