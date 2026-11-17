import type { LiveWorkouts } from '../../api/client.ts';

export type LiveMember = LiveWorkouts['items'][number];

/** 친구를 먼저 모으고, 각 묶음은 지금 운동 볼륨이 큰 순서입니다. 서버 정렬이 기준이고 화면에서도 한 번 더 맞춥니다. */
export function groupLiveMembers(items: LiveMember[]) {
  const byVolume = (a: LiveMember, b: LiveMember) => (b.volume ?? 0) - (a.volume ?? 0);
  return {
    friends: items.filter((m) => m.friend !== false).sort(byVolume),
    others: items.filter((m) => m.friend === false).sort(byVolume),
  };
}
