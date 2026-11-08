/** 친구 목록과 알림이 같은 저장 상태를 구독합니다. 저장을 직렬화하여 두 화면의 동시 처리로 기록이 유실되지 않도록 합니다. */
import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeTestRelations, friendTestKey } from './friendTestModel';
import {
  changeSafety,
  decodeSafety,
  emptySafety,
  safetyKey,
  type SafetyAction,
} from './friendSafetyModel';
let snapshot = { ...emptySafety(), ready: false, busy: false, error: '' };
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
    // 기존 친구·신청을 보존하여 새 형식으로 읽습니다. 손상된 자료를 빈 값으로 덮어쓰지 않습니다.
    const raw = await AsyncStorage.getItem(safetyKey);
    const data =
      raw === null
        ? emptySafety(decodeTestRelations(await AsyncStorage.getItem(friendTestKey)))
        : decodeSafety(raw);
    publish({
      ...data,
      ready: true,
      error: '',
    });
  } catch {
    publish({ error: '친구 테스트 기록을 불러오지 못했습니다. 기존 자료는 보존됩니다.' });
  }
}
async function act(actor: string, other: string, action: SafetyAction, reason?: string) {
  if (!__DEV__ || !snapshot.ready || snapshot.busy) return false;
  publish({ busy: true });
  try {
    const next = changeSafety(snapshot, actor, other, action, reason);
    const data = {
      version: next.version,
      records: next.records,
      blocks: next.blocks,
      reports: next.reports,
    };
    await AsyncStorage.setItem(safetyKey, JSON.stringify(data));
    publish({ ...data, error: '' });
    return true;
  } catch (e) {
    publish({ error: e instanceof Error ? e.message : '신청 처리에 실패했습니다.' });
    return false;
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
