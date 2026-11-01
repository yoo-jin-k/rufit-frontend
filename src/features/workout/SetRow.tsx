import { useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { Button } from '../../components/Button';
import type { WorkoutSet } from './model';
import { setFieldErrors, stackedSetRow } from './setRowView';
import { setRowStyles as s } from './SetRow.styles';
import { setInputStyles as fieldStyles } from './SetInput.styles';

// 배치만 바꾸고 입력 문자열·커서·ID는 같은 노드에서 유지합니다.
export function SetRow({
  set,
  index,
  exerciseName,
  fontScale,
  finished,
  onChange,
  onComplete,
  onDelete,
  onDuplicate,
  dragHandle,
}: {
  dragHandle?: ReactNode;
  set: WorkoutSet;
  index: number;
  exerciseName: string;
  fontScale: number;
  finished: boolean;
  onChange(patch: Partial<Pick<WorkoutSet, 'weight' | 'reps'>>): void;
  onComplete(): void;
  onDelete(): void;
  onDuplicate(): void;
}) {
  const [width, setWidth] = useState(0);
  const [options, setOptions] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [focused, setFocused] = useState<'weight' | 'reps' | null>(null);
  const weightRef = useRef<TextInput>(null),
    repsRef = useRef<TextInput>(null);
  const stacked = dragHandle ? width < 250 || fontScale >= 2 : stackedSetRow(width, fontScale);
  const errors = attempted ? setFieldErrors(set) : { weight: '', reps: '' };
  const prefix = `${exerciseName} ${index + 1}세트`;
  function complete() {
    if (!set.completed) {
      setAttempted(true);
      const next = setFieldErrors(set);
      if (next.weight || next.reps) {
        (next.weight ? weightRef : repsRef).current?.focus();
        return;
      }
    }
    setAttempted(false);
    onComplete();
  }
  return (
    <View style={s.row} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {!dragHandle && <Text style={s.label}>{index + 1}세트 · 무게 kg / 횟수</Text>}
      <View style={[s.controls, stacked && s.stacked]}>
        {dragHandle}
        <View style={[s.inputs, stacked && s.inputsStacked]}>
          <View style={s.field}>
            <TextInput
              ref={weightRef}
              style={[
                fieldStyles.input,
                !!dragHandle && { borderWidth: 0, fontSize: 20, padding: 4 },
                focused === 'weight' && fieldStyles.focus,
                !!errors.weight && fieldStyles.invalid,
              ]}
              accessibilityLabel={`${prefix} 무게`}
              accessibilityHint="킬로그램 단위"
              aria-invalid={!!errors.weight}
              placeholder="kg"
              keyboardType="decimal-pad"
              value={set.weight}
              editable={!finished}
              maxLength={7}
              onFocus={() => setFocused('weight')}
              onBlur={() => setFocused(null)}
              onChangeText={(weight) => onChange({ weight })}
            />
            {!!errors.weight && (
              <Text style={fieldStyles.error} accessibilityLiveRegion="polite">
                {errors.weight}
              </Text>
            )}
          </View>
          <View style={s.field}>
            <TextInput
              ref={repsRef}
              style={[
                fieldStyles.input,
                !!dragHandle && { borderWidth: 0, fontSize: 20, padding: 4 },
                focused === 'reps' && fieldStyles.focus,
                !!errors.reps && fieldStyles.invalid,
              ]}
              accessibilityLabel={`${prefix} 횟수`}
              accessibilityHint="회 단위"
              aria-invalid={!!errors.reps}
              placeholder="회"
              keyboardType="number-pad"
              value={set.reps}
              editable={!finished}
              maxLength={4}
              onFocus={() => setFocused('reps')}
              onBlur={() => setFocused(null)}
              onChangeText={(reps) => onChange({ reps })}
            />
            {!!errors.reps && (
              <Text style={fieldStyles.error} accessibilityLiveRegion="polite">
                {errors.reps}
              </Text>
            )}
          </View>
        </View>
        <View style={[s.actions, !!dragHandle && { width: 48 }, stacked && s.actionsStacked]}>
          <View style={s.action}>
            {dragHandle ? <Pressable accessibilityRole="button"
              accessibilityLabel={`${prefix} ${set.completed ? '완료 취소' : '완료'}`}
              disabled={finished} onPress={complete}
              style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: set.completed ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.onPrimary }}>✓</Text>
            </Pressable> : <Button
              compact
              title={set.completed || dragHandle ? '✓' : '완료'}
              accessibilityLabel={`${prefix} ${set.completed ? '완료 취소' : '완료'}`}
              secondary={!set.completed}
              disabled={finished}
              onPress={complete}
            />}
          </View>
          {!dragHandle && <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${prefix} 추가 옵션`}
            onPress={() => setOptions(!options)}
            style={{ width: 32, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text>⋮</Text>
          </Pressable>}
        </View>
      </View>
      {options && !finished && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="삭제"
              secondary
              accessibilityLabel={`${prefix} 삭제`}
              onPress={onDelete}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="복제"
              secondary
              accessibilityLabel={`${prefix} 복제`}
              onPress={onDuplicate}
            />
          </View>
        </View>
      )}
    </View>
  );
}
