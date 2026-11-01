/** 가져오기 전 날짜와 모든 세트 값을 보여주며 닫기만 하면 현재 운동을 바꾸지 않습니다. */
import { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { previousExercises } from './previousSetModel';
import type { Exercise, Workout } from './model';
export function PreviousSets({ history, target, onClose, onLoad }: {
  history: Workout[]; target: Exercise; onClose(): void; onLoad(source: Exercise, replace: boolean): void;
}) {
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [error, setError] = useState('');
  function load(replace: boolean) {
    if (!selected) return;
    try { onLoad(selected, replace); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '세트를 불러오지 못했습니다.'); }
  }
  const records = previousExercises(history, target);
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={ui.page}>
      <ScreenLayout title={`${target.name} 불러오기`} onBack={onClose}>
        <Text style={ui.muted}>이 기기에 저장된 같은 종목의 완료 기록입니다. 날짜를 선택한 뒤 가져올 방식을 골라 주세요.</Text>
        {!records.length && <Text style={ui.body}>불러올 이전 운동 기록이 없습니다.</Text>}
        {records.map(({ record, exercise }) => <View key={`${record.id}:${exercise.id}`} style={ui.card}>
          <Text style={ui.heading}>{record.recordDate ?? new Date(record.startedAt).toLocaleDateString('ko-KR')}</Text>
          {exercise.sets.map((set, index) => <Text key={set.id} style={ui.body}>{index + 1}세트 · {set.weight}kg × {set.reps}회</Text>)}
          <Button title={selected === exercise ? '선택됨' : '이 기록 선택'} secondary onPress={() => setSelected(exercise)} />
        </View>)}
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        {selected && <View style={{ gap: 12 }}>
          <Button title="기존 세트 뒤에 추가" onPress={() => load(false)} />
          <Text style={ui.muted}>아래 버튼은 현재 종목의 {target.sets.length}개 세트를 선택한 기록으로 교체합니다.</Text>
          <Button title="현재 세트를 이 기록으로 교체" secondary onPress={() => load(true)} />
        </View>}
        <Button title="닫기" secondary onPress={onClose} />
      </ScreenLayout>
    </SafeAreaView>
  </Modal>;
}
