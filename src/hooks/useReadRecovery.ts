import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** 조회 실패 동안만 재조회합니다. 저장·삭제는 중복 실행 위험이 있어 자동 재시도하지 않습니다. */
export function useReadRecovery(failed: boolean, read: () => Promise<unknown>) {
  const latest = useRef(read);
  useEffect(() => { latest.current = read; }, [read]);
  useEffect(() => {
    if (!failed) return;
    let running = false;
    let stopped = false;
    const retry = async () => {
      if (stopped || running || AppState.currentState === 'background') return;
      running = true;
      try { await latest.current(); } catch { /* 기존 오류 안내를 유지하며 다음 조회를 기다립니다. */ }
      finally { running = false; }
    };
    const timer = setInterval(() => void retry(), 5000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void retry(); });
    return () => { stopped = true; clearInterval(timer); listener.remove(); };
  }, [failed]);
}
