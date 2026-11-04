import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorkoutStorage, emptyArchive, remember, type WorkoutArchive } from './storage';
import type { Workout } from './model';
const storage = createWorkoutStorage(AsyncStorage);
export function useWorkoutArchive() {
  const [archive, setArchive] = useState<WorkoutArchive>(emptyArchive);
  const latest = useRef(archive);
  const generation = useRef(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('기록 불러오는 중');
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    return storage.load().then(value => {
      latest.current = value; setArchive(value); setReady(true); setFailed(false); setStatus('기기에 저장됨');
    }, () => {
      setStatus('기록을 불러오지 못했습니다. 기존 기록은 보존되어 있습니다.'); setFailed(true);
    });
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = (value: WorkoutArchive) => {
    latest.current = value; setArchive(value);
    const current = ++generation.current;
    setStatus('기기에 저장 중'); setFailed(false);
    storage.save(value).then(() => { if (current === generation.current) setStatus('기기에 저장됨'); }, () => {
      if (current === generation.current) { setStatus('저장하지 못했습니다. 다시 저장해 주세요.'); setFailed(true); }
    });
  };
  const setWorkout = (workout: Workout | null) => { if (ready) save(remember(latest.current, workout)); };
  const retry = () => { if (ready) save(latest.current); else void load(); };
  return { workout: archive.current, history: archive.history, setWorkout, ready, status, failed, retry };
}
