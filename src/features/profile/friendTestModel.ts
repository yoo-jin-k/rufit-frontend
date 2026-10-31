/** 개발용 친구 관계만 다룹니다. 실제 계정·인증·사진·운동 기록에는 접근하지 않습니다. */
export const testUsers = [
  { id: 'test-1', nickname: '루핏민준' },
  { id: 'test-2', nickname: '스쿼트서연' },
  { id: 'test-3', nickname: '벤치도윤' },
  { id: 'test-4', nickname: '데드지우' },
  { id: 'test-5', nickname: '오운완하린' },
] as const;
export const testSelf = 'test-self';
export const friendTestKey = 'rufit.test.friends.v1';
export type TestRelation = { from: string; to: string; status: 'pending' | 'accepted' };
export type TestAction = 'request' | 'cancel' | 'accept' | 'reject';
const validUser = (id: string) => id === testSelf || testUsers.some((u) => u.id === id);
export function decodeTestRelations(raw: string | null): TestRelation[] {
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (
    !Array.isArray(value) ||
    value.some(
      (r) =>
        !r ||
        !validUser(r.from) ||
        !validUser(r.to) ||
        r.from === r.to ||
        !['pending', 'accepted'].includes(r.status),
    )
  )
    throw new Error('테스트 친구 기록을 읽지 못했습니다.');
  const pairs = value.map((r) => [r.from, r.to].sort().join(':'));
  if (new Set(pairs).size !== pairs.length) throw new Error('중복된 테스트 관계가 있습니다.');
  return value;
}
/** 수락·거절은 받는 사용자만, 취소는 보낸 사용자만 할 수 있습니다. 중복 신청을 허용하지 않습니다. */
export function changeTestRelation(
  records: TestRelation[],
  actor: string,
  other: string,
  action: TestAction,
): TestRelation[] {
  if (!validUser(actor) || !validUser(other) || actor === other)
    throw new Error('테스트 사용자를 확인해 주세요.');
  const relation = records.find(
    (r) => (r.from === actor && r.to === other) || (r.to === actor && r.from === other),
  );
  if (action === 'request') {
    if (relation) throw new Error('이미 신청 중이거나 친구입니다.');
    return [...records, { from: actor, to: other, status: 'pending' }];
  }
  if (
    !relation ||
    relation.status !== 'pending' ||
    (action === 'cancel' ? relation.from !== actor : relation.to !== actor)
  )
    throw new Error('현재 사용자로 처리할 수 없는 신청입니다.');
  return action === 'accept'
    ? records.map((r) => (r === relation ? { ...r, status: 'accepted' } : r))
    : records.filter((r) => r !== relation);
}
