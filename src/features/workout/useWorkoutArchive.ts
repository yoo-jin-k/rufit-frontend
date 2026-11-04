import AsyncStorage from '@react-native-async-storage/async-storage';
import {createWorkoutStorage} from './storage';
import {useLocalWorkoutArchive} from './useLocalWorkoutArchive';

// 기기 어댑터의 순차 저장 큐를 유지한다. 화면과 테스트는 같은 상태/명령 훅을 사용한다.
const storage = createWorkoutStorage(AsyncStorage);
export function useWorkoutArchive() {
  return useLocalWorkoutArchive(storage);
}
