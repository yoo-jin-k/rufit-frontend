import AsyncStorage from '@react-native-async-storage/async-storage';
import { createWorkoutStorage } from './storage';
import { useLocalWorkoutArchive } from './useLocalWorkoutArchive';

// 기기 어댑터의 순차 저장 큐를 유지합니다. 화면과 테스트는 같은 상태/명령 훅을 사용합니다.
const storage = createWorkoutStorage(AsyncStorage, true);
export function useWorkoutArchive() {
  return useLocalWorkoutArchive(storage);
}
/** 진행 중인 운동 화면이 켜져 있음을 남겨, 앱을 껐다 켜면 이 시각에 운동을 멈춥니다. */
export function markWorkoutActive(now: number) {
  return storage.touch(now);
}
