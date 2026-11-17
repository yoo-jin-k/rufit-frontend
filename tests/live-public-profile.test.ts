import test from 'node:test';
import assert from 'node:assert/strict';
import { groupLiveMembers } from '../src/features/cheers/liveGroups.ts';
import { createRufitApi } from '../src/api/client.ts';

test('운동 중 공개 범위·볼륨과 공개 프로필 요청 본문을 보냅니다', async () => {
  const calls: unknown[] = [];
  const api = createRufitApi({
    baseUrl: 'https://api.example.test',
    getAccessToken: () => 'token',
    fetch: async (url, init) => {
      calls.push([String(url), init?.method, init?.body ? JSON.parse(String(init.body)) : null]);
      return new Response(null, { status: 204 });
    },
  });
  await api.shareLiveWorkout(true, 'PUBLIC');
  await api.liveHeartbeat('session-1', true, 3240.5);
  await api.updatePublicProfile('스쿼트 좋아요', null);
  assert.deepEqual(calls, [
    [
      'https://api.example.test/api/v1/social/live/sharing',
      'PUT',
      { enabled: true, scope: 'PUBLIC' },
    ],
    [
      'https://api.example.test/api/v1/social/live/mine/session-1',
      'PUT',
      { active: true, volume: 3240.5 },
    ],
    [
      'https://api.example.test/api/v1/social/directory/me/profile',
      'PUT',
      { bio: '스쿼트 좋아요', avatar: null },
    ],
  ]);
});

test('운동 중 목록은 친구를 먼저 모으고 각 묶음을 볼륨 내림차순으로 정렬합니다', () => {
  const m = (memberId: string, friend: boolean | undefined, volume?: number) => ({
    memberId,
    nickname: memberId,
    workoutId: `w-${memberId}`,
    sent: false,
    friend,
    volume,
  });
  const groups = groupLiveMembers([
    m('a', true, 100),
    m('b', false, 9000),
    m('c', true, 5000),
    m('d', false, 300),
    m('old', undefined),
  ]);
  assert.deepEqual(
    groups.friends.map((x) => x.memberId),
    ['c', 'a', 'old'],
  );
  assert.deepEqual(
    groups.others.map((x) => x.memberId),
    ['b', 'd'],
  );
});
