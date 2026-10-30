/** 오운완은 운동 기록과 별도 저장합니다. 실패하거나 사진을 건너뛰어도 운동 원본은 보존합니다. */
export type Journal = {
  workoutId: string;
  memo: string;
  photo?: string;
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
