/** 응원은 수락된 친구 사이에서 운동 한 번당 한 번만 허용합니다. 차단과 만료를 전송 시 다시 검사합니다. */
import { blockedPair, type FriendSafety } from '../profile/friendSafetyModel.ts';
export const presenceLifetime = 120_000;
export const cheerKey = 'rufit.test.cheers.v1';
export type Presence = { user: string; workout: string; updatedAt: number };
export type Cheer = { from: string; to: string; workout: string; createdAt: number; read: boolean };
export type CheerState = { version: 1; sharing: boolean; active: Presence[]; cheers: Cheer[] };
export const emptyCheers = (): CheerState => ({
  version: 1,
  sharing: true,
  active: [],
  cheers: [],
});
export function friends(social: FriendSafety, a: string, b: string) {
  return (
    a !== b &&
    !blockedPair(social, a, b) &&
    social.records.some(
      (r) =>
        r.status === 'accepted' && ((r.from === a && r.to === b) || (r.to === a && r.from === b)),
    )
  );
}
export function live(p: Presence, now: number) {
  return p.updatedAt <= now && now - p.updatedAt < presenceLifetime;
}
export function visibleFriends(
  data: CheerState,
  social: FriendSafety,
  viewer: string,
  now: number,
) {
  return data.active.filter((p) => live(p, now) && friends(social, viewer, p.user));
}
export function heartbeat(
  data: CheerState,
  user: string,
  workout: string | null,
  now: number,
): CheerState {
  return {
    ...data,
    active: [
      ...data.active.filter((p) => p.user !== user && live(p, now)),
      ...(workout ? [{ user, workout, updatedAt: now }] : []),
    ],
  };
}
export function sendCheer(
  data: CheerState,
  social: FriendSafety,
  from: string,
  to: string,
  workout: string,
  now: number,
): CheerState {
  if (!friends(social, from, to)) throw new Error('현재 친구에게만 응원할 수 있습니다.');
  if (!data.active.some((p) => p.user === to && p.workout === workout && live(p, now)))
    throw new Error('운동이 종료되었거나 상태가 만료되었습니다.');
  if (data.cheers.some((c) => c.from === from && c.to === to && c.workout === workout)) return data;
  return { ...data, cheers: [...data.cheers, { from, to, workout, createdAt: now, read: false }] };
}
export function receivedCheers(data: CheerState, social: FriendSafety, viewer: string) {
  return data.cheers.filter((c) => c.to === viewer && friends(social, viewer, c.from));
}
export function decodeCheers(raw: string | null): CheerState {
  if (raw === null) return emptyCheers();
  const d = JSON.parse(raw);
  const id = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 200;
  const time = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  if (
    d?.version !== 1 ||
    typeof d.sharing !== 'boolean' ||
    !Array.isArray(d.active) ||
    !Array.isArray(d.cheers) ||
    d.active.some((p: Presence) => !p || !id(p.user) || !id(p.workout) || !time(p.updatedAt)) ||
    d.cheers.some(
      (c: Cheer) =>
        !c ||
        !id(c.from) ||
        !id(c.to) ||
        c.from === c.to ||
        !id(c.workout) ||
        !time(c.createdAt) ||
        typeof c.read !== 'boolean',
    ) ||
    new Set(d.active.map((p: Presence) => p.user)).size !== d.active.length ||
    new Set(d.cheers.map((c: Cheer) => JSON.stringify([c.from, c.to, c.workout]))).size !==
      d.cheers.length
  )
    throw new Error('응원 기록을 읽지 못했습니다. 기존 기록은 보존됩니다.');
  return d;
}
