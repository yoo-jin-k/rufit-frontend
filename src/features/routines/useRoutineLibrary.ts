import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Routine } from './model';
import { createRoutineStorage, emptyRoutineLibrary, upsertRoutine, type RoutineLibrary } from './storage';

const storage = createRoutineStorage(AsyncStorage);

export function useRoutineLibrary() {
  const [library, setLibrary] = useState<RoutineLibrary>(emptyRoutineLibrary);
  const latest = useRef(library);
  const generation = useRef(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('루틴 불러오는 중');
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => storage.load().then(value => {
    latest.current = value;
    setLibrary(value);
    setReady(true);
    setFailed(false);
    setStatus('루틴 저장됨');
  }, () => {
    setFailed(true);
    setStatus('루틴을 불러오지 못했습니다. 기존 루틴은 보존되어 있습니다.');
  }), []);

  useEffect(() => { void load(); }, [load]);

  const save = (value: RoutineLibrary) => {
    latest.current = value;
    setLibrary(value);
    const current = ++generation.current;
    setFailed(false);
    setStatus('루틴 저장 중');
    storage.save(value).then(() => {
      if (current === generation.current) setStatus('루틴 저장됨');
    }, () => {
      if (current === generation.current) {
        setFailed(true);
        setStatus('루틴을 저장하지 못했습니다. 다시 시도해 주세요.');
      }
    });
  };

  const saveRoutine = (routine: Routine) => {
    if (!ready) throw new Error('루틴을 불러오는 중입니다.');
    save(upsertRoutine(latest.current, routine));
  };
  const retry = () => { if (ready) save(latest.current); else void load(); };

  return { routines: library.routines, ready, status, failed, saveRoutine, retry };
}
