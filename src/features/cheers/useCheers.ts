/** 현재 친구 기능과 같은 로컬 테스트 저장소입니다. 서버 회원에게 전송했다고 표시하지 않습니다. */
import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cheerKey, decodeCheers, emptyCheers, type CheerState } from './model';
let snapshot = { data: emptyCheers(), ready: false, busy: false, error: '' };
const listeners = new Set<() => void>();
let loading: Promise<void> | undefined;
const get = () => snapshot;
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
function publish(patch: Partial<typeof snapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((fn) => fn());
}
async function load() {
  if (!__DEV__) {
    publish({ ready: true });
    return;
  }
  try {
    publish({ data: decodeCheers(await AsyncStorage.getItem(cheerKey)), ready: true });
  } catch (e) {
    publish({ error: e instanceof Error ? e.message : '응원 기록을 읽지 못했습니다.' });
  }
}
async function update(change: (data: CheerState) => CheerState) {
  if (!__DEV__ || !snapshot.ready || snapshot.busy) return false;
  publish({ busy: true });
  try {
    const data = change(snapshot.data);
    await AsyncStorage.setItem(cheerKey, JSON.stringify(data));
    publish({ data, error: '' });
    return true;
  } catch (e) {
    publish({
      error: e instanceof Error ? e.message : '응원을 저장하지 못했습니다. 다시 시도해 주세요.',
    });
    return false;
  } finally {
    publish({ busy: false });
  }
}
export function useCheers() {
  const state = useSyncExternalStore(subscribe, get, get);
  useEffect(() => {
    loading ??= load();
  }, []);
  return { ...state, update };
}
