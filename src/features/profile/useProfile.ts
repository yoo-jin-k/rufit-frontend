/** 저장 성공 이후에만 프로필을 교체합니다. 읽기 실패 시 빈 데이터로 덮어쓰지 않습니다. */
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeProfile, emptyProfile, profileKey, type ProfileData } from './journalModel';
export function useProfile() {
  const [value, setValue] = useState(emptyProfile),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(profileKey)
      .then(decodeProfile)
      .then((v) => {
        if (active) {
          setValue(v);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setError('프로필을 불러오지 못했습니다. 기존 기록은 보존했습니다.');
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(next: ProfileData) {
    if (!ready || lock.current) throw new Error('저장 준비가 끝난 후 다시 시도해 주세요.');
    lock.current = true;
    setBusy(true);
    try {
      await AsyncStorage.setItem(profileKey, JSON.stringify(next));
      setValue(next);
      setError('');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { value, save, ready, error, busy };
}
