/** 하트는 사용자·게시물 쌍으로 한 번만 저장하며 다시 누르면 취소합니다. 서버 집계와 구분되는 기기 저장입니다. */
export type Like = { actor: string; post: string; createdAt?: number; read?: boolean };
export const likeKey = 'rufit.local.post-likes.v1';
export function decodeLikes(raw: string | null): Like[] {
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (
    !Array.isArray(data) ||
    data.some(
      (x) =>
        !x ||
        typeof x.actor !== 'string' ||
        !x.actor ||
        typeof x.post !== 'string' ||
        !x.post ||
        x.post.length > 500 ||
        (x.createdAt !== undefined && !Number.isFinite(x.createdAt)) ||
        (x.read !== undefined && typeof x.read !== 'boolean'),
    )
  )
    throw new Error('하트 기록을 읽지 못했습니다.');
  if (new Set(data.map((x) => JSON.stringify([x.actor, x.post]))).size !== data.length)
    throw new Error('중복된 하트 기록입니다.');
  return data;
}
export function toggleLike(likes: Like[], actor: string, post: string): Like[] {
  if (!actor || !post || post.length > 500) throw new Error('게시물을 확인해 주세요.');
  const found = likes.some((x) => x.actor === actor && x.post === post);
  return found
    ? likes.filter((x) => x.actor !== actor || x.post !== post)
    : [...likes, { actor, post, createdAt: Date.now(), read: false }];
}

/** 내 게시물에 다른 사용자가 누른 하트만 알림으로 반환합니다. 직접 누른 하트는 제외합니다. */
export function receivedLikes(likes: Like[]): Like[] {
  return likes
    .filter(
      (like) =>
        like.actor !== 'local-self' &&
        (like.post.startsWith('own:') || like.post === 'demo-own:post-1'),
    )
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
export function readLike(likes: Like[], actor: string, post: string): Like[] {
  return likes.map((like) =>
    like.actor === actor && like.post === post ? { ...like, read: true } : like,
  );
}
