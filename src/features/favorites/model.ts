/** 즐겨찾기 종목 id 목록입니다. 기기 저장 형식을 검사하고, 기기와 서버 목록을 합칩니다. */
export const favoritesKey = 'rufit.favorites.v1';
export const FAVORITE_LIMIT = 500;

/** 기기에 저장된 값을 읽습니다. 형식이 맞지 않으면 빈 목록으로 봅니다(다음 저장 때 고쳐 씁니다). */
export function decodeFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === 'string'))].slice(
          0,
          FAVORITE_LIMIT,
        )
      : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  if (ids.length >= FAVORITE_LIMIT)
    throw new Error(`즐겨찾기는 ${FAVORITE_LIMIT}개까지 담을 수 있어요.`);
  return [id, ...ids];
}

/** 로그인할 때 서버 목록을 앞에 두고, 기기에만 있던 종목을 뒤에 붙입니다. 서버에 올릴 기기 전용 목록도 돌려줍니다. */
export function mergeFavorites(server: string[], local: string[]) {
  const onlyLocal = local.filter((id) => !server.includes(id));
  return { merged: [...server, ...onlyLocal].slice(0, FAVORITE_LIMIT), upload: onlyLocal };
}
