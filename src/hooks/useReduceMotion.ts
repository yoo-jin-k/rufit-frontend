import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** 기기의 '동작 줄이기' 설정입니다. 켜져 있으면 회전·이동 같은 움직임을 생략합니다. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => alive && setReduce(value))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}
