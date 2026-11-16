/**
 * 즐겨찾기 종목을 화면 전체에 나눠 줍니다. 기기에 먼저 저장하고, 로그인한 경우 서버와 맞춥니다.
 * 로그인하면 서버 목록과 기기 목록을 합치고, 기기에만 있던 종목은 서버에 올립니다.
 * 서버 저장이 실패해도 기기 목록은 유지하고 다음 로그인 때 다시 맞춥니다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RufitSession } from '../../api/session';
import { decodeFavorites, favoritesKey, mergeFavorites, toggleFavorite } from './model';

const Context = createContext<{
  ids: string[];
  isFavorite(id: string): boolean;
  toggle(id: string): void;
}>({
  ids: [],
  isFavorite: () => false,
  toggle: () => {},
});

export const useFavorites = () => useContext(Context);

export function FavoritesProvider({
  session,
  children,
}: {
  session: RufitSession | null;
  children: ReactNode;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const live = session?.isActive() ? session : null;
  const persist = (next: string[]) =>
    void AsyncStorage.setItem(favoritesKey, JSON.stringify(next)).catch(() => {});
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(favoritesKey)
      .then((raw) => {
        if (active) setIds(decodeFavorites(raw));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!live || !loaded) return;
    let active = true;
    void live.api
      .exerciseFavorites()
      .then(async ({ favorites }) => {
        if (!active) return;
        let upload: string[] = [];
        setIds((local) => {
          const result = mergeFavorites(
            favorites.map((f) => f.exerciseId),
            local,
          );
          upload = result.upload;
          persist(result.merged);
          return result.merged;
        });
        for (const id of upload) await live.api.addExerciseFavorite(id).catch(() => {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [live, loaded]);
  const toggle = useCallback(
    (id: string) => {
      setIds((current) => {
        let next: string[];
        try {
          next = toggleFavorite(current, id);
        } catch {
          return current;
        }
        persist(next);
        if (live) {
          const call = next.includes(id)
            ? live.api.addExerciseFavorite(id)
            : live.api.removeExerciseFavorite(id);
          void call.catch(() => {});
        }
        return next;
      });
    },
    [live],
  );
  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);
  return <Context.Provider value={{ ids, isFavorite, toggle }}>{children}</Context.Provider>;
}
