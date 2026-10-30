import { useEffect, useRef, useState } from 'react';

export function useExerciseResultAnnouncement(
  resultSignature: string,
  resultCount: number,
  announce: (message: string) => void,
) {
  const announcedResults = useRef<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (announcedResults.current === resultSignature) return;
      announcedResults.current = resultSignature;
      const nextMessage = `검색 결과 ${resultCount}개`;
      setMessage(nextMessage);
      announce(nextMessage);
    }, 300);
    return () => clearTimeout(timer);
  }, [announce, resultCount, resultSignature]);

  return message;
}
