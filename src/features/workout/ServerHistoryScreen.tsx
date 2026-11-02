import { WorkoutTransferPanel } from '../sync/WorkoutTransferPanel';
import { MeasurementTransferPanel } from '../sync/MeasurementTransferPanel';
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
export function ServerHistoryScreen({
  session,
  history,
  onChanged,
  onClose,
}: {
  session: RufitSession;
  history: Workout[];
  onChanged(): void;
  onClose(): void;
}) {
  const [transfers, setTransfers] = useState(0);
  const transferBusy = (value: boolean) =>
    setTransfers((count) => Math.max(0, count + (value ? 1 : -1)));
  const close = () => {
    if (!transfers && !busy) onClose();
  };
  const [records, setRecords] = useState<Workout[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const mounted = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function load(reset: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const next = reset ? 0 : page;
      const result = await readServerHistory(session, next);
      if (!mounted.current || !session.isActive()) return;
      setRecords((current) => [
        ...new Map([...(reset ? [] : current), ...result.records].map((w) => [w.id, w])).values(),
      ]);
      setPage(next + 1);
      setHasNext(result.hasNext);
      setLoaded(true);
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : '기록을 불러오지 못했습니다.');
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={ui.page}>
        <ScreenLayout title="계정 기록 동기화" onBack={close}>
          <Text style={ui.muted}>
            현재 로그인한 계정과 기기 기록을 비교합니다. 자동 전송하지 않으며, 업로드와 가져오기
            버튼으로 적용합니다. 사진은 아직 동기화하지 않습니다.
          </Text>
          <Button
            title={loaded ? '서버 기록 새로고침' : '서버 기록 불러오기'}
            loading={busy}
            disabled={transfers > 0}
            onPress={() => void load(true)}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          {loaded && <WorkoutHistory records={records} />}
          {hasNext && (
            <Button
              title="이전 기록 더 보기"
              secondary
              disabled={busy || transfers > 0}
              onPress={() => void load(false)}
            />
          )}
          <WorkoutTransferPanel
            session={session}
            history={history}
            onBusy={transferBusy}
            disabled={busy || transfers > 0}
          />
          <MeasurementTransferPanel
            session={session}
            onBusy={transferBusy}
            onChanged={onChanged}
            disabled={busy || transfers > 0}
          />
          <Button title="닫기" secondary disabled={busy || transfers > 0} onPress={close} />
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
}
