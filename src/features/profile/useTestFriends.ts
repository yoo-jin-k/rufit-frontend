/** 친구 목록과 알림이 같은 저장 상태를 구독합니다. 저장을 직렬화하여 두 화면의 동시 처리로 기록이 유실되지 않도록 합니다. */
import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  changeTestRelation,
  decodeTestRelations,
  friendTestKey,
  type TestAction,
  type TestRelation,
} from './friendTestModel';
let snapshot = { records: [] as TestRelation[], ready: false, busy: false, error: '' };
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();
function publish(patch: Partial<typeof snapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => snapshot;
async function load() {
  if (!__DEV__) {
    publish({ ready: true });
    return;
  }
  try {
    publish({
      records: decodeTestRelations(await AsyncStorage.getItem(friendTestKey)),
      ready: true,
      error: '',
    });
  } catch {
    publish({ error: '친구 테스트 기록을 불러오지 못했습니다. 기존 자료는 보존됩니다.' });
  }
}
async function act(actor: string, other: string, action: TestAction) {
  if (!__DEV__ || !snapshot.ready || snapshot.busy) return;
  publish({ busy: true });
  try {
    const records = changeTestRelation(snapshot.records, actor, other, action);
    await AsyncStorage.setItem(friendTestKey, JSON.stringify(records));
    publish({ records, error: '' });
  } catch (e) {
    publish({ error: e instanceof Error ? e.message : '신청 처리에 실패했습니다.' });
  } finally {
    publish({ busy: false });
  }
}
export function useTestFriends() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loading ??= load();
  }, []);
  return { ...state, act };
}
