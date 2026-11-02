/** 서버 계정 기록은 기기 기록과 구분하여 조회합니다. 실패해도 기기 기록을 변경하지 않습니다. */
import { useEffect, useRef, useState } from 'react';
import { Modal, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RufitSession } from '../../api/session';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { WorkoutHistory } from './WorkoutHistory';
import type { Workout } from './model';
import { readServerHistory } from './serverHistory';
export function ServerHistoryScreen({ session, onClose }: { session: RufitSession; onClose(): void }) {
  const [records, setRecords] = useState<Workout[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const mounted = useRef(true), lock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function load(reset: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const next = reset ? 0 : page;
      const result = await readServerHistory(session, next);
      if (!mounted.current || !session.isActive()) return;
      setRecords((current) => [...new Map([...(reset ? [] : current), ...result.records].map((w) => [w.id, w])).values()]);
      setPage(next + 1); setHasNext(result.hasNext); setLoaded(true);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : '기록을 불러오지 못했습니다.');
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={ui.page}>
      <ScreenLayout title="계정의 서버 운동 기록" onBack={onClose}>
        <Text style={ui.muted}>현재 로그인한 계정으로 서버에 저장한 완료 기록입니다. 이 기기의 기록·사진·측정값은 자동 업로드되거나 합쳐지지 않습니다.</Text>
        <Button title={loaded ? '서버 기록 새로고침' : '서버 기록 불러오기'} loading={busy} onPress={() => void load(true)} />
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        {loaded && <WorkoutHistory records={records} />}
        {hasNext && <Button title="이전 기록 더 보기" secondary disabled={busy} onPress={() => void load(false)} />}
        <Button title="닫기" secondary onPress={onClose} />
      </ScreenLayout>
    </SafeAreaView>
  </Modal>;
}
