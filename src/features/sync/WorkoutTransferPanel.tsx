/** 완료 기록의 수동 업로드만 제공합니다. 기존 자료를 삭제하거나 진행 중인 운동을 업로드하지 않습니다. */
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { RufitSession } from '../../api/session';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import type { Workout } from '../workout/model';
import { uploadWorkout } from './workoutTransfer';
export function WorkoutTransferPanel({
  session,
  history,
  onBusy,
  disabled,
}: {
  session: RufitSession;
  disabled: boolean;
  history: Workout[];
  onBusy(value: boolean): void;
}) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const lock = useRef(false);
  const candidates = history.filter((w) => !w.id.startsWith('server:'));
  async function upload() {
    if (lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setConfirm(false);
    let count = 0;
    try {
      for (const workout of candidates) {
        await uploadWorkout(AsyncStorage, session, workout, Crypto.randomUUID);
        count++;
        setNotice(`${count}/${candidates.length}개 확인 완료`);
      }
      setNotice(`${count}개 기록 업로드 확인 완료. 서버 기록을 새로고침해 주세요.`);
    } catch (cause) {
      setNotice(
        `${count}개 확인 완료. ${cause instanceof Error ? cause.message : '업로드하지 못했습니다.'} 다시 눌러도 완료된 기록은 중복 저장하지 않습니다.`,
      );
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <View style={ui.card}>
      <Text style={ui.heading}>기기 운동 기록 업로드</Text>
      <Text style={ui.muted}>
        완료 기록 {candidates.length}개 · 사진과 진행 중인 운동은 제외됩니다. 기기 원본은
        유지됩니다.
      </Text>
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={ui.body}>
          {notice}
        </Text>
      )}
      {!confirm ? (
        <Button
          title="기기 기록 업로드"
          disabled={busy || disabled || !candidates.length}
          onPress={() => setConfirm(true)}
        />
      ) : (
        <>
          <Text style={ui.body}>
            이 기록을 현재 로그인한 내 계정에 연결할까요? 처음 연결한 계정 외에는 같은 기기 자료를
            업로드하지 않습니다.
          </Text>
          <Button
            title="내 계정에 연결하고 업로드"
            disabled={disabled}
            onPress={() => void upload()}
          />
          <Button title="취소" secondary onPress={() => setConfirm(false)} />
        </>
      )}
    </View>
  );
}
