/** 차단·신고는 로컬 테스트 전용입니다. 차단과 관계 변경을 한 저장 단위로 처리합니다. */
import {
  changeTestRelation,
  decodeTestRelations,
  testSelf,
  testUsers,
  type TestAction,
  type TestRelation,
} from './friendTestModel.ts';
export const safetyKey = 'rufit.test.friends.v2';
export const reportReasons = ['스팸·광고', '욕설·괴롭힘', '부적절한 프로필', '기타'] as const;
export type FriendSafety = {
  version: 2;
  records: TestRelation[];
  blocks: { from: string; to: string }[];
  reports: { from: string; to: string; reason: string; createdAt: number }[];
};
export type SafetyAction = TestAction | 'block' | 'unblock' | 'unfriend' | 'report';
export const emptySafety = (records: TestRelation[] = []): FriendSafety => ({
  version: 2,
  records,
  blocks: [],
  reports: [],
});
const user = (id: string) => id === testSelf || testUsers.some((u) => u.id === id);
const pair = (r: { from: string; to: string }, a: string, b: string) =>
  (r.from === a && r.to === b) || (r.from === b && r.to === a);
export const blockedPair = (data: FriendSafety, a: string, b: string) =>
  data.blocks.some((r) => pair(r, a, b));
export function decodeSafety(raw: string): FriendSafety {
  const d = JSON.parse(raw);
  const validPair = (r: { from: string; to: string }) =>
    r && user(r.from) && user(r.to) && r.from !== r.to;
  if (
    d?.version !== 2 ||
    !Array.isArray(d.records) ||
    !Array.isArray(d.blocks) ||
    !Array.isArray(d.reports) ||
    d.blocks.some((r: { from: string; to: string }) => !validPair(r)) ||
    d.reports.some(
      (r: FriendSafety['reports'][number]) =>
        !validPair(r) ||
        !reportReasons.includes(r.reason as (typeof reportReasons)[number]) ||
        !Number.isFinite(r.createdAt),
    )
  )
    throw new Error('테스트 친구 자료를 읽을 수 없습니다.');
  decodeTestRelations(JSON.stringify(d.records));
  if (d.records.some((r: TestRelation) => blockedPair(d, r.from, r.to)))
    throw new Error('차단된 관계의 자료가 일치하지 않습니다.');
  return d;
}
export function changeSafety(
  data: FriendSafety,
  actor: string,
  other: string,
  action: SafetyAction,
  reason?: string,
): FriendSafety {
  if (!user(actor) || !user(other) || actor === other)
    throw new Error('테스트 사용자를 확인해 주세요.');
  if (action === 'block')
    return {
      ...data,
      records: data.records.filter((r) => !pair(r, actor, other)),
      blocks: [
        ...data.blocks.filter((r) => !(r.from === actor && r.to === other)),
        { from: actor, to: other },
      ],
    };
  if (action === 'unblock')
    return { ...data, blocks: data.blocks.filter((r) => !(r.from === actor && r.to === other)) };
  if (action === 'report') {
    if (!reportReasons.includes(reason as (typeof reportReasons)[number]))
      throw new Error('신고 사유를 선택해 주세요.');
    if (data.reports.some((r) => r.from === actor && r.to === other && r.reason === reason))
      return data;
    return {
      ...data,
      reports: [
        ...data.reports,
        { from: actor, to: other, reason: reason!, createdAt: Date.now() },
      ],
    };
  }
  if (blockedPair(data, actor, other))
    throw new Error('차단된 사용자와는 친구 신청을 처리할 수 없습니다.');
  if (action === 'unfriend') {
    if (!data.records.some((r) => pair(r, actor, other) && r.status === 'accepted'))
      throw new Error('친구 관계가 아닙니다.');
    return { ...data, records: data.records.filter((r) => !pair(r, actor, other)) };
  }
  return { ...data, records: changeTestRelation(data.records, actor, other, action) };
}
