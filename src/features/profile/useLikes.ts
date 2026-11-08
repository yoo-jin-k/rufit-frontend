/** 하트와 알림은 저장 성공 후 같은 상태를 갱신합니다. 기존 하트 자료도 읽을 수 있습니다. */
import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeLikes, likeKey, toggleLike, readLike, type Like } from './likeModel';
let state = { likes: [] as Like[], ready: false, busy: false, error: '' };
const listeners = new Set<() => void>();
let loading: Promise<void> | undefined;
const get = () => state;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function publish(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
async function load() {
  try {
    publish({ likes: decodeLikes(await AsyncStorage.getItem(likeKey)), ready: true });
  } catch {
    publish({ error: '하트를 불러오지 못했습니다.' });
  }
}
async function toggle(actor: string, post: string, markRead = false) {
  if (!state.ready || state.busy) return;
  publish({ busy: true });
  try {
    const likes = markRead
      ? readLike(state.likes, actor, post)
      : toggleLike(state.likes, actor, post);
    await AsyncStorage.setItem(likeKey, JSON.stringify(likes));
    publish({ likes, error: '' });
  } catch {
    publish({ error: '하트를 저장하지 못했습니다. 다시 시도해 주세요.' });
  } finally {
    publish({ busy: false });
  }
}
export function useLikes() {
  const value = useSyncExternalStore(subscribe, get, get);
  useEffect(() => {
    loading ??= load();
  }, []);
  return { ...value, toggle, markRead: (actor: string, post: string) => toggle(actor, post, true) };
}
