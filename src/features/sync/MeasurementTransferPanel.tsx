/** 다른 날짜의 값은 유지하며 같은 날짜의 차이만 사용자가 선택하도록 표시합니다. */
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RufitSession } from '../../api/session';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import {
  measurementComparisons,
  transferMeasurement,
  type MeasurementComparison,
  type LocalMeasurement,
} from './measurementTransfer';
export function measurementLabel(record: LocalMeasurement | null) {
  if (!record) return '기록 없음';
  return 'weight' in record
    ? `${record.weight}kg`
    : `벤치 ${record.bench} · 스쿼트 ${record.squat} · 데드 ${record.deadlift}kg`;
}
export function MeasurementTransferPanel({
  session,
  onBusy,
  onChanged,
  disabled,
}: {
  session: RufitSession;
  disabled: boolean;
  onBusy(value: boolean): void;
  onChanged(): void;
}) {
  const [rows, setRows] = useState<MeasurementComparison[]>([]),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [limit, setLimit] = useState(30);
  const lock = useRef(false);
  async function execute(action: () => Promise<void>) {
    if (lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '기록을 비교하지 못했습니다.');
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  async function compare() {
    const weight = await measurementComparisons(AsyncStorage, session, 'weight');
    const strength = await measurementComparisons(AsyncStorage, session, 'strength');
    if (!session.isActive()) return;
    setRows([...weight, ...strength].sort((a, b) => b.date.localeCompare(a.date)));
    setLoaded(true);
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.heading}>체중·삼대 측정 동기화</Text>
      <Text style={ui.muted}>
        같은 날짜에 다른 값이 있으면 기기 값과 서버 값을 비교해서 선택해 주세요.
      </Text>
      <Button
        title="측정 기록 비교·새로고침"
        secondary
        disabled={busy || disabled}
        onPress={() => void execute(compare)}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {loaded && !rows.length && <Text style={ui.muted}>기기와 서버에 측정 기록이 없습니다.</Text>}
      {rows.slice(0, limit).map((row) => (
        <View style={ui.card} key={`${row.kind}:${row.date}`}>
          <Text style={ui.heading}>
            {row.date} · {row.kind === 'weight' ? '체중' : '삼대'}
          </Text>
          <Text style={ui.body}>기기: {measurementLabel(row.local)}</Text>
          <Text style={ui.body}>
            서버:{' '}
            {row.remote
              ? row.kind === 'weight'
                ? `${row.remote.weight}kg`
                : `벤치 ${row.remote.bench} · 스쿼트 ${row.remote.squat} · 데드 ${row.remote.deadlift}kg`
              : '기록 없음'}
          </Text>
          {row.state === 'same' ? (
            <Text style={ui.muted}>같은 값입니다.</Text>
          ) : (
            <>
              {!!row.local && (
                <Button
                  title={row.remote ? '기기 값으로 서버 수정' : '기기 값을 서버에 저장'}
                  disabled={busy || disabled}
                  onPress={() =>
                    void execute(async () => {
                      await transferMeasurement(AsyncStorage, session, row, 'upload');
                      await compare();
                    })
                  }
                />
              )}
              {!!row.remote && (
                <Button
                  title={row.local ? '서버 값으로 기기 수정' : '서버 값을 기기로 가져오기'}
                  secondary
                  disabled={busy || disabled}
                  onPress={() =>
                    void execute(async () => {
                      await transferMeasurement(AsyncStorage, session, row, 'download');
                      onChanged();
                      await compare();
                    })
                  }
                />
              )}
            </>
          )}
        </View>
      ))}
      {limit < rows.length && (
        <Button
          title="측정 기록 더 보기"
          secondary
          disabled={busy || disabled}
          onPress={() => setLimit((current) => current + 30)}
        />
      )}
    </View>
  );
}
