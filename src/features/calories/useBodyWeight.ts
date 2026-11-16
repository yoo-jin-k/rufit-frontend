import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { decodeWeight, weightStorageKey } from '../bodyweight/model';
import { DEFAULT_BODY_KG, latestBodyKg } from './model';

/** 칼로리 계산에 쓸 체중입니다. 체중 기록이 없거나 읽지 못하면 기본 체중(70kg)을 씁니다. */
export function useBodyWeight(refresh?: unknown) {
  const [value, setValue] = useState({ kg: DEFAULT_BODY_KG, estimated: true });
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(weightStorageKey)
      .then((raw) => {
        if (active) setValue(latestBodyKg(decodeWeight(raw)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refresh]);
  return value;
}
