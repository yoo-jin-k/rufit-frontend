/** 합성 사진과 가상 기록만 포함하는 테스트 픽스처입니다. 실제 운동 보관함에 삽입하지 않습니다. */
import { testUsers } from './friendTestModel.ts';
export type TestPost = {
  id: string;
  date: string;
  tile: number;
  caption: string;
  exercise: string;
  weight: number;
  reps: number;
  sets: number;
  minutes: number;
};
const bios = [
  '꾸준함이 가장 큰 기록입니다.',
  '하체 운동 후 스트레칭까지!',
  '오늘도 한 세트 더.',
  '기록하며 천천히 성장 중.',
  '운동으로 채우는 나의 하루.',
];
const exercises = ['벤치프레스', '스쿼트', '덤벨 벤치프레스', '데드리프트', '덤벨 숄더프레스'];
export const testSocialProfiles = testUsers.map((user, index) => ({
  ...user,
  avatar: index,
  bio: bios[index],
  posts: [0, 1, 2].map(
    (n): TestPost => ({
      id: `${user.id}-post-${n + 1}`,
      date: `2026-10-${31 - n * 2 - (index % 2)}`,
      tile: n === 0 ? index : 5 + ((index + n - 1) % 4),
      caption: [
        '오늘도 오운완! 꾸준히 기록해 봅니다.',
        '컨디션에 맞춰 차근차근 운동했어요.',
        '운동 마치고 스트레칭까지 완료!',
      ][n],
      exercise: exercises[index],
      weight: [60, 45, 22, 80, 12][index] + n * 2,
      reps: 10 + n,
      sets: 3 + (n % 2),
      minutes: 35 + index * 3 + n * 5,
    }),
  ),
}));
export const getTestProfile = (id: string) =>
  testSocialProfiles.find((profile) => profile.id === id);
