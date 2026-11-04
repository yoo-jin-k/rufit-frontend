import {useRef, useState} from 'react';
import {Text, TextInput, View} from 'react-native';
import {Button} from '../../components/Button';
import type {WorkoutSet} from './model';
import {setFieldErrors, stackedSetRow} from './setRowView';
import {setRowStyles as s} from './SetRow.styles';
import {setInputStyles as fieldStyles} from './SetInput.styles';

// 배치만 바꾸고 입력 문자열·커서·ID는 같은 노드에서 유지한다.
export function SetRow({set, index, exerciseName, fontScale, finished, onChange, onComplete, onDelete, onDuplicate}: {
  set: WorkoutSet; index: number; exerciseName: string; fontScale: number; finished: boolean;
  onChange(patch: Partial<Pick<WorkoutSet, 'weight' | 'reps'>>): void;
  onComplete(): void; onDelete(): void; onDuplicate(): void;
}) {
  const [width, setWidth] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [focused, setFocused] = useState<'weight' | 'reps' | null>(null);
  const weightRef = useRef<TextInput>(null), repsRef = useRef<TextInput>(null);
  const stacked = stackedSetRow(width, fontScale);
  const errors = attempted ? setFieldErrors(set) : {weight: '', reps: ''};
  const prefix = `${exerciseName} ${index + 1}세트`;
  function complete() {
    if (!set.completed) {
      setAttempted(true);
      const next = setFieldErrors(set);
      if (next.weight || next.reps) { (next.weight ? weightRef : repsRef).current?.focus(); return; }
    }
    setAttempted(false); onComplete();
  }
  return <View style={s.row} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <Text style={s.label}>{index + 1}세트 · 무게 kg / 횟수</Text>
    <View style={[s.controls, stacked && s.stacked]}>
      <View style={[s.inputs, stacked && s.inputsStacked]}>
        <View style={s.field}><TextInput ref={weightRef} style={[fieldStyles.input, focused === 'weight' && fieldStyles.focus, !!errors.weight && fieldStyles.invalid]}
          accessibilityLabel={`${prefix} 무게`} accessibilityHint="킬로그램 단위" aria-invalid={!!errors.weight}
          placeholder="0" keyboardType="decimal-pad" value={set.weight} editable={!finished} maxLength={7}
          onFocus={() => setFocused('weight')} onBlur={() => setFocused(null)} onChangeText={weight => onChange({weight})} />
          {!!errors.weight && <Text style={fieldStyles.error} accessibilityLiveRegion="polite">{errors.weight}</Text>}</View>
        <View style={s.field}><TextInput ref={repsRef} style={[fieldStyles.input, focused === 'reps' && fieldStyles.focus, !!errors.reps && fieldStyles.invalid]}
          accessibilityLabel={`${prefix} 횟수`} accessibilityHint="회 단위" aria-invalid={!!errors.reps}
          placeholder="0" keyboardType="number-pad" value={set.reps} editable={!finished} maxLength={4}
          onFocus={() => setFocused('reps')} onBlur={() => setFocused(null)} onChangeText={reps => onChange({reps})} />
          {!!errors.reps && <Text style={fieldStyles.error} accessibilityLiveRegion="polite">{errors.reps}</Text>}</View>
      </View>
      <View style={[s.actions, stacked && s.actionsStacked]}>
        <View style={s.action}><Button compact title={set.completed ? '✓' : '완료'} accessibilityLabel={`${prefix} ${set.completed ? '완료 취소' : '완료'}`} secondary={!set.completed} disabled={finished} onPress={complete} /></View>
        <View style={s.action}><Button compact title="삭제" accessibilityLabel={`${prefix} 삭제`} secondary disabled={finished} onPress={onDelete} /></View>
        <View style={s.action}><Button compact title="복제" accessibilityLabel={`${prefix} 복제`} secondary disabled={finished} onPress={onDuplicate} /></View>
      </View>
    </View>
  </View>;
}
