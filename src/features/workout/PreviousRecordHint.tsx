import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';
import type { Exercise, Workout } from './model';
import { findPreviousExerciseRecord, type PreviousExerciseRecord } from './previousRecord';

export function PreviousRecordHint({ history, exercise, disabled, onApply }: { history: Workout[]; exercise: Exercise; disabled: boolean; onApply(previous: PreviousExerciseRecord): void }) {
  const previous = findPreviousExerciseRecord(history, exercise);
  if (!previous) return null;
  const summary = previous.sets.map(set => `${set.weight}kg × ${set.reps}회`).join(' · ');
  return <View style={styles.box}>
    <View style={styles.copy}>
      <Text style={styles.label}>이전 기록</Text>
      <Text style={styles.value}>{summary}</Text>
      <Text style={styles.date}>{new Date(previous.finishedAt).toLocaleDateString()}</Text>
    </View>
    {!disabled && <Button title="불러오기" secondary onPress={() => onApply(previous)} />}
  </View>;
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.background, borderRadius: 12, padding: 10, gap: 8 },
  copy: { gap: 2 },
  label: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  value: { color: colors.text, fontSize: 14, fontWeight: '600' },
  date: { color: colors.muted, fontSize: 11 },
});
