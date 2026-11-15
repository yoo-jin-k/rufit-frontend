/**
 * '운동 시작하기' 시트입니다. 최근 운동을 가로로 넘겨 고르고, 빈 운동으로 시작하거나 고른 운동을 불러와 시작합니다.
 * 로그인 직후와 앱을 다시 켰을 때(진행 중인 운동이 없을 때)도 이 시트가 먼저 열립니다.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { BottomSheet } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { findCatalogExercise } from '../exercises/catalog';
import { ExerciseMedia } from '../exercises/ExerciseMedia';
import type { Workout } from './model';
import { formatDay } from './recordFormat';
import { recentWorkouts, startCard } from './startSheetModel';
import { formatWeight } from '../units/model';
import { useWeightUnit } from '../units/UnitProvider';

const c = tokens.color;

export function StartWorkoutSheet({
  visible,
  history,
  onClose,
  onEmpty,
  onLoad,
}: {
  visible: boolean;
  history: Workout[];
  onClose(): void;
  onEmpty(): void;
  onLoad(source: Workout): void;
}) {
  const recent = recentWorkouts(history);
  const { unit } = useWeightUnit();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = recent.find((w) => w.id === selectedId) ?? recent[0];
  const card = selected ? startCard(selected) : null;
  return (
    <BottomSheet visible={visible} title={recent.length ? '이전 기록 불러오기' : '운동 시작'} onClose={onClose}>
      {recent.length ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cards}>
            {recent.map((w) => {
              const on = w.id === selected?.id;
              const info = startCard(w);
              return (
                <Pressable
                  key={w.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  aria-checked={on}
                  accessibilityLabel={`${formatDay(info.day, 'short')} ${info.parts} 운동 선택`}
                  onPress={() => setSelectedId(w.id)}
                  style={[s.card, on && s.cardOn]}
                >
                  <Text numberOfLines={1} style={[text.calloutBold, { color: on ? c.text.inverse : c.text.primary }]}>
                    {info.parts}
                  </Text>
                  <Text style={[text.label, { color: on ? c.text.inverse : c.text.secondary }]}>
                    {formatDay(info.day, 'short')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {card && (
            <>
              <Text style={[text.calloutBold, { color: c.text.primary }]}>{card.meta}</Text>
              <ScrollView style={s.rows} contentContainerStyle={{ gap: tokens.space[12] }}>
                {card.rows.map((row) => (
                  <View key={row.id} style={s.row}>
                    <ExerciseMedia exercise={findCatalogExercise(row.catalogId)} size={48} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={[text.bodyBold, { color: c.text.primary }]}>{row.name}</Text>
                      <Text style={[text.label, { color: c.text.secondary }]}>
                        {[`${row.sets}세트`, row.weight && formatWeight(row.weight, unit), row.reps && `${row.reps}회`].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </>
      ) : (
        <Text style={[text.body, { color: c.text.secondary }]}>
          아직 불러올 운동 기록이 없어요. 빈 운동으로 시작해 종목을 추가해 주세요.
        </Text>
      )}
      <View style={s.actions}>
        <Button title="빈 운동" variant="secondary" style={s.action} onPress={onEmpty} />
        {!!selected && (
          <Button title="불러오기" style={s.action} onPress={() => onLoad(selected)} />
        )}
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  cards: { gap: tokens.space[8] },
  card: {
    minWidth: 108,
    paddingHorizontal: tokens.space[16],
    paddingVertical: tokens.space[12],
    borderRadius: tokens.radius.md,
    backgroundColor: c.bg.surface,
    gap: 2,
  },
  cardOn: { backgroundColor: c.bg.inverse },
  rows: { maxHeight: 280 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  actions: { flexDirection: 'row', gap: tokens.space[8] },
  action: { flex: 1 },
});
