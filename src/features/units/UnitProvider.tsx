/**
 * 무게 단위 설정을 화면 전체에 나눠 줍니다.
 * 기기에 먼저 저장하고, 로그인한 경우 서버 설정(/preferences/units)과 맞춥니다.
 * 서버가 다른 기기에서 먼저 바뀌었으면(409) 다시 읽고 한 번 더 저장합니다. 실패해도 기기 설정은 유지합니다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { WeightUnit } from '../../api/client';
import type { RufitSession } from '../../api/session';

const key = 'rufit.units.v1';
const Context = createContext<{ unit: WeightUnit; setUnit(unit: WeightUnit): void }>({
  unit: 'KG',
  setUnit: () => {},
});

export const useWeightUnit = () => useContext(Context);

export function UnitProvider({
  session,
  children,
}: {
  session: RufitSession | null;
  children: ReactNode;
}) {
  const [unit, setLocal] = useState<WeightUnit>('KG');
  const version = useRef(0);
  const live = session?.isActive() ? session : null;
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key)
      .then((value) => {
        if (active && (value === 'KG' || value === 'LB')) setLocal(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!live) return;
    let active = true;
    void live.api
      .unitPreferences()
      .then((server) => {
        if (!active) return;
        version.current = server.version;
        // 서버에 저장한 적이 있으면 서버 값을 따릅니다. 없으면 기기 값을 그대로 씁니다.
        if (server.version > 0) {
          setLocal(server.weightUnit);
          void AsyncStorage.setItem(key, server.weightUnit).catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [live]);
  const setUnit = useCallback(
    (next: WeightUnit) => {
      setLocal(next);
      void AsyncStorage.setItem(key, next).catch(() => {});
      if (!live) return;
      const save = () =>
        live.api.saveUnitPreferences(version.current, next).then((saved) => {
          version.current = saved.version;
        });
      void save().catch(async () => {
        try {
          version.current = (await live.api.unitPreferences()).version;
          await save();
        } catch {
          // 다음 앱 실행 때 다시 맞춥니다.
        }
      });
    },
    [live],
  );
  return <Context.Provider value={{ unit, setUnit }}>{children}</Context.Provider>;
}
