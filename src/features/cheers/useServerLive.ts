import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { RufitSession } from '../../api/session';
import type { LiveWorkouts } from '../../api/client';

/** 계정이 바뀐 뒤 도착한 응답을 버리고, 상태 신호 실패가 운동 저장을 막지 않게 분리합니다. */
export function useServerLive(session: RufitSession | null, workout: string | null) {
  const [snapshot, setSnapshot] = useState<{ session: RufitSession; data: LiveWorkouts } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const current = useRef(session);
  const sequence = useRef(0);
  const locked = useRef(false);
  const heartbeatQueue = useRef(Promise.resolve());
  useEffect(() => {
    current.current = session;
    return () => {
      current.current = null;
    };
  }, [session]);
  const data = snapshot?.session === session ? snapshot.data : null;
  const refresh = useCallback(async () => {
    if (!session?.isActive()) return;
    const request = ++sequence.current;
    try {
      const next = await session.api.liveWorkouts();
      if (current.current === session && session.isActive() && request === sequence.current) {
        setSnapshot({ session, data: next });
        setError('');
      }
    } catch (cause) {
      if (current.current === session && request === sequence.current) {
        setError(cause instanceof Error ? cause.message : '운동 중인 친구를 불러오지 못했습니다.');
        setSnapshot(null);
      }
    }
  }, [session]);
  useEffect(() => {
    const update = () => {
      if (AppState.currentState === 'active') void refresh();
    };
    update();
    const timer = setInterval(update, 30000);
    const listener = AppState.addEventListener('change', update);
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [refresh]);
  useEffect(() => {
    if (!session || !data?.sharing || !workout) return;
    let ended = false;

    // 활성/종료 신호를 순서대로 보내 늦은 갱신이 종료 상태를 되살리지 않도록 합니다.
    const send = (active: boolean) => {
      heartbeatQueue.current = heartbeatQueue.current.then(async () => {
        if (!session.isActive() || (active && ended)) return;
        try {
          await session.api.liveHeartbeat(workout, active);
        } catch (cause) {
          if (!ended && current.current === session)
            setError(cause instanceof Error ? cause.message : '운동 상태를 갱신하지 못했습니다.');
        }
      });
    };
    const update = () => send(AppState.currentState === 'active');
    update();
    const timer = setInterval(update, 30000);
    const listener = AppState.addEventListener('change', update);
    return () => {
      ended = true;
      clearInterval(timer);
      listener.remove();
      send(false);
    };
  }, [session, workout, data?.sharing]);
  const run = async (task: () => Promise<void>) => {
    if (!session?.isActive() || locked.current) return false;
    locked.current = true;
    setBusy(true);
    try {
      await task();
      if (current.current !== session || !session.isActive()) return false;
      await refresh();
      return true;
    } catch (cause) {
      if (current.current === session)
        setError(
          cause instanceof Error ? cause.message : '처리하지 못했습니다. 다시 시도해 주세요.',
        );
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return {
    data,
    error,
    busy,
    refresh,
    share: (enabled: boolean) => run(() => session!.api.shareLiveWorkout(enabled)),
    cheer: (memberId: string, workoutId: string) =>
      run(() => session!.api.cheerWorkout(memberId, workoutId)),
  };
}
