/**
 * Figma 03-10 이전 기록 불러오기 시트입니다. 같은 종목의 지난 기록을 골라 지금 세트를 채우거나 뒤에 더합니다.
 * 고르기만 하고 닫으면 현재 운동을 바꾸지 않습니다. 실패하면 시트와 오류를 그대로 둡니다.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { CheckMark } from '../../components/kit/Controls';
import { BottomSheet, EmptyCard } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { localDay } from '../calendar/model';
import { previousExercises } from './previousSetModel';
import { formatDay } from './recordFormat';
import type { Exercise, Workout } from './model';

const c = tokens.color;

export function PreviousSets({ history, target, onClose, onLoad }: {
  history: Workout[]; target: Exercise; onClose(): void; onLoad(source: Exercise, replace: boolean): void;
}) {
  const records = previousExercises(history, target).slice(0, 10);
  const [selected, setSelected] = useState<Exercise | null>(records[0]?.exercise ?? null);
  const [error, setError] = useState('');
  function load(replace: boolean) {
    if (!selected) return;
    try { onLoad(selected, replace); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '세트를 불러오지 못했습니다.'); }
  }
  const hasInput = target.sets.some((set) => set.weight || set.reps);
  return (
    <BottomSheet
      visible
      title="이전 기록 불러오기"
      subtitle={`${target.name} · 최근 ${records.length}번`}
      onClose={onClose}
    >
      {!records.length && <EmptyCard icon="refresh" title="불러올 이전 기록이 없어요" body="이 종목을 한 번 기록하면 다음부터 불러올 수 있어요" />}
      {records.map(({ record, exercise }) => {
        const on = selected === exercise;
        const day = formatDay(record.recordDate ?? localDay(record.startedAt), 'short');
        return (
          <Pressable
            key={`${record.id}:${exercise.id}`}
            accessibilityRole="radio"
            accessibilityLabel={`${day} 기록 선택`}
            accessibilityState={{ checked: on }}
            aria-checked={on}
            onPress={() => setSelected(exercise)}
            style={[s.item, on && s.itemOn]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[text.calloutBold, { color: c.text.primary }]}>{day}</Text>
              <Text style={[text.label, { color: c.text.secondary }]}>
                {exercise.sets.map((set) => `${set.weight}×${set.reps}`).join(' · ')}
              </Text>
            </View>
            <CheckMark checked={on} />
          </Pressable>
        );
      })}
      {!!error && <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>{error}</Text>}
      {!!records.length && (
        <>
          <Button title="이 기록으로 채우기" disabled={!selected} onPress={() => load(true)} />
          {hasInput && (
            <Button title="기존 세트 뒤에 추가" variant="soft" size="md" disabled={!selected} onPress={() => load(false)} />
          )}
          {hasInput && (
            <Text style={[text.label, { color: c.text.muted, textAlign: 'center' }]}>
              채우기는 지금 입력한 {target.sets.length}개 세트를 고른 기록으로 바꿔요
            </Text>
          )}
        </>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  item: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: tokens.space[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[12],
  },
  itemOn: { backgroundColor: c.bg.default, borderColor: c.text.primary },
});
