/**
 * Figma SetHeader·SetRow 세트 표입니다. 한 줄은 세트 번호 · 지난 기록 · kg · 회 · 완료 칸 순서이고 높이 46입니다.
 * 지금 입력할 세트(current)는 회색 바탕에 흰 입력칸, 나머지는 흰 바탕에 회색 입력칸입니다.
 * 번호를 위아래로 끌면 순서를 바꾸고, 줄을 길게 누르면 복제·삭제를 고릅니다.
 * 직접 입력(manual)에서는 완료 칸 대신 휴지통을 둡니다.
 */
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { BottomSheet, ListGroup, ListRow } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import type { WorkoutSet } from './model';
import { setFieldErrors } from './setRowView';
import { displayWeight, unitLabel } from '../units/model';
import { useWeightUnit } from '../units/UnitProvider';

const c = tokens.color;

/** 세트 표 머리입니다. onCompleteAll이 있으면 오른쪽에 '전체 세트 완료' 버튼을 둡니다. */
export function SetHeader({
  name,
  allCompleted,
  onCompleteAll,
  manual = false,
  noWeight = false,
  unitAware = false,
}: {
  name: string;
  allCompleted?: boolean;
  onCompleteAll?: () => void;
  manual?: boolean;
  /** 맨몸 운동은 kg 칸을 두지 않습니다. */
  noWeight?: boolean;
  /** 운동 기록 화면처럼 고른 무게 단위(kg·lbs)로 보여 줄지입니다. 직접 입력 화면은 kg로 받습니다. */
  unitAware?: boolean;
}) {
  const { unit } = useWeightUnit();
  return (
    <View style={s.header}>
      <Text style={[text.label, s.muted, s.center, { width: 28 }]}>세트</Text>
      <Text style={[text.label, s.muted, s.prevCol]}>지난 기록</Text>
      {!noWeight && <Text style={[text.label, s.muted, s.center, s.kgCol]}>{unitAware ? unitLabel(unit) : 'kg'}</Text>}
      <Text style={[text.label, s.muted, s.center, s.repsCol]}>회</Text>
      <View style={s.checkCol}>
        {!manual && onCompleteAll && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`${name} 전체 세트 완료`}
            accessibilityState={{ checked: !!allCompleted }}
            aria-checked={!!allCompleted}
            onPress={onCompleteAll}
            hitSlop={6}
            style={[s.allCheck, allCompleted && s.allCheckOn]}
          >
            <AppIcon name="check" color={allCompleted ? c.text.inverse : c.text.secondary} strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * 세트 수 조절과 이전 기록 불러오기 줄입니다(− 세트 N개 + | 불러오기).
 * −는 마지막 세트를 지우고, +는 마지막 세트를 복제해 뒤에 더합니다.
 */
export function SetCountControl({
  name,
  count,
  disabled = false,
  onAdd,
  onRemove,
  onLoad,
}: {
  name: string;
  count: number;
  disabled?: boolean;
  onAdd(): void;
  onRemove(): void;
  onLoad(): void;
}) {
  return (
    <View style={s.countRow}>
      <View style={[s.countBox, s.countStepper]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name} 마지막 세트 삭제`}
          disabled={disabled || count === 0}
          onPress={onRemove}
          hitSlop={6}
          style={s.countButton}
        >
          <Text style={[text.titleM, { color: count === 0 ? c.text.disabled : c.text.primary }]}>−</Text>
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={[text.callout, s.countLabel]}>세트 {count}개</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name} 마지막 세트 복제 추가`}
          disabled={disabled}
          onPress={onAdd}
          hitSlop={6}
          style={s.countButton}
        >
          <Text style={[text.titleM, { color: c.text.primary }]}>+</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} 이전 기록 불러오기`}
        disabled={disabled}
        onPress={onLoad}
        style={({ pressed }) => [s.countBox, s.countLoad, pressed && { opacity: 0.7 }]}
      >
        <Text style={[text.callout, { color: c.text.secondary }]}>불러오기</Text>
      </Pressable>
    </View>
  );
}

export function SetRow({
  set,
  index,
  exerciseName,
  previous,
  current = false,
  finished,
  manual = false,
  noWeight = false,
  onEdit,
  onChange,
  onComplete,
  onDelete,
  onDuplicate,
  dragHandle,
}: {
  set: WorkoutSet;
  index: number;
  exerciseName: string;
  /** 같은 종목의 지난 기록 같은 순서 세트(예: 60×10)입니다. */
  previous?: string;
  current?: boolean;
  finished: boolean;
  manual?: boolean;
  /** 맨몸 운동은 무게 칸 없이 횟수만 받습니다. */
  noWeight?: boolean;
  /** 있으면 무게·횟수 칸을 눌러 입력 시트를 엽니다(운동 기록 중). 없으면 칸에 바로 입력합니다(직접 입력). */
  onEdit?(kind: 'weight' | 'reps'): void;
  /** 예전 호출부 호환용입니다. 글자 확대는 줄 높이가 자동으로 늘어나 처리됩니다. */
  fontScale?: number;
  onChange(patch: Partial<Pick<WorkoutSet, 'weight' | 'reps'>>): void;
  onComplete(): void;
  onDelete(): void;
  onDuplicate(): void;
  /** 번호 칸입니다. SortableSets가 끌기 기능을 붙여 넘겨 줍니다. */
  dragHandle?: ReactNode;
}) {
  const [options, setOptions] = useState(false);
  const { unit } = useWeightUnit();
  const [attempted, setAttempted] = useState(false);
  const [focused, setFocused] = useState<'weight' | 'reps' | null>(null);
  const weightRef = useRef<TextInput>(null),
    repsRef = useRef<TextInput>(null);
  // 맨몸 운동은 무게를 받지 않으므로 0kg으로 보고 검사합니다.
  const checked = noWeight ? { ...set, weight: '0' } : set;
  const errors = attempted ? setFieldErrors(checked) : { weight: '', reps: '' };
  const prefix = `${exerciseName} ${index + 1}세트`;
  function complete() {
    if (!set.completed) {
      setAttempted(true);
      const next = setFieldErrors(checked);
      if (next.weight || next.reps) {
        if (onEdit) onEdit(next.weight ? 'weight' : 'reps');
        else (next.weight ? weightRef : repsRef).current?.focus();
        return;
      }
      if (noWeight && set.weight !== '0') onChange({ weight: '0' });
    }
    setAttempted(false);
    onComplete();
  }
  const cellBg = current ? c.bg.default : c.bg.surface;
  const field = (kind: 'weight' | 'reps') => onEdit ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${prefix} ${kind === 'weight' ? `무게 ${displayWeight(set.weight, unit) || '미입력'}${unit === 'LB' ? '파운드' : '킬로그램'}` : `횟수 ${set.reps || '미입력'}회`} 수정`}
      onPress={() => onEdit(kind)}
      style={[s.cell, s.cellButton, kind === 'weight' ? s.kgCol : s.repsCol, { backgroundColor: cellBg }, !!errors[kind] && s.cellError]}
    >
      <Text style={[text.headline, { color: set[kind] ? c.text.primary : c.text.disabled }]}>
        {(kind === 'weight' ? displayWeight(set.weight, unit) : set.reps) || (kind === 'weight' ? unitLabel(unit) : '회')}
      </Text>
    </Pressable>
  ) : (
    <TextInput
      ref={kind === 'weight' ? weightRef : repsRef}
      style={[
        text.headline,
        s.cell,
        kind === 'weight' ? s.kgCol : s.repsCol,
        { backgroundColor: cellBg },
        focused === kind && s.cellFocus,
        !!errors[kind] && s.cellError,
      ]}
      accessibilityLabel={`${prefix} ${kind === 'weight' ? '무게' : '횟수'}`}
      accessibilityHint={kind === 'weight' ? '킬로그램 단위' : '회 단위'}
      aria-invalid={!!errors[kind]}
      placeholder={manual ? '0' : kind === 'weight' ? 'kg' : '회'}
      placeholderTextColor={c.text.disabled}
      keyboardType={kind === 'weight' ? 'decimal-pad' : 'number-pad'}
      value={set[kind]}
      editable={!finished}
      maxLength={kind === 'weight' ? 7 : 4}
      selectTextOnFocus
      onFocus={() => setFocused(kind)}
      onBlur={() => setFocused(null)}
      onChangeText={(value) => onChange({ [kind]: value })}
    />
  );
  return (
    <View>
      <Pressable
        accessible={false}
        onLongPress={finished ? undefined : () => setOptions(true)}
        accessibilityActions={finished ? undefined : [
          { name: 'duplicate', label: '세트 복제' },
          { name: 'delete', label: '세트 삭제' },
        ]}
        onAccessibilityAction={(event) =>
          event.nativeEvent.actionName === 'delete' ? onDelete() : onDuplicate()
        }
        style={[s.row, current && s.rowCurrent]}
      >
        <View style={s.setCol}>
          {dragHandle ?? <Text style={[text.bodyBold, s.center, { color: c.text.primary }]}>{index + 1}</Text>}
        </View>
        <Text numberOfLines={1} style={[text.caption, s.muted, s.prevCol]}>
          {[previous, set.rpe ? `RPE ${set.rpe}` : ''].filter(Boolean).join(' · ')}
        </Text>
        {!noWeight && field('weight')}
        {field('reps')}
        <View style={s.checkCol}>
          {manual ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`${prefix} 삭제`} onPress={onDelete} hitSlop={6} style={s.trash}>
              <AppIcon name="trash" color={c.text.secondary} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${prefix} ${set.completed ? '완료 취소' : '완료'}`}
              disabled={finished}
              onPress={complete}
              hitSlop={4}
              style={[s.check, set.completed && s.checkOn, current && !set.completed && s.checkCurrent]}
            >
              {set.completed && <AppIcon name="check" color={c.text.inverse} strokeWidth={2} />}
            </Pressable>
          )}
        </View>
      </Pressable>
      {(!!errors.weight || !!errors.reps) && (
        <Text accessibilityLiveRegion="polite" style={[text.label, s.error]}>
          {errors.weight || errors.reps}
        </Text>
      )}
      <BottomSheet visible={options} title={`${index + 1}세트`} subtitle={exerciseName} onClose={() => setOptions(false)}>
        <ListGroup>
          <ListRow icon="plus" label="이 세트 복제" accessibilityLabel={`${prefix} 복제`} trailing="none"
            onPress={() => { setOptions(false); onDuplicate(); }} />
          <ListRow icon="trash" label="이 세트 삭제" accessibilityLabel={`${prefix} 삭제`} danger trailing="none"
            onPress={() => { setOptions(false); onDelete(); }} />
        </ListGroup>
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[8], minHeight: 36, paddingHorizontal: tokens.space[8] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[8],
    minHeight: 46,
    paddingHorizontal: tokens.space[8],
    borderRadius: tokens.radius.md,
  },
  rowCurrent: { backgroundColor: c.bg.surface },
  center: { textAlign: 'center' },
  muted: { color: c.text.muted },
  setCol: { width: 28, alignItems: 'center' },
  prevCol: { flex: 1, minWidth: 0 },
  kgCol: { width: 60 },
  repsCol: { width: 52 },
  checkCol: { width: 36, alignItems: 'center' },
  cell: {
    height: 36,
    borderRadius: tokens.radius.sm,
    textAlign: 'center',
    color: c.text.primary,
    padding: 0,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellFocus: { borderColor: c.text.primary },
  cellButton: { alignItems: 'center', justifyContent: 'center' },
  cellError: { borderColor: c.danger.default },
  check: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: c.line.input,
    backgroundColor: c.bg.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCurrent: { borderColor: c.line.strong },
  checkOn: { backgroundColor: c.bg.inverse, borderColor: c.bg.inverse },
  allCheck: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: c.line.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allCheckOn: { backgroundColor: c.bg.inverse, borderColor: c.bg.inverse },
  trash: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  error: { color: c.danger.default, paddingLeft: 44, paddingTop: 2 },
  countRow: { flexDirection: 'row', gap: tokens.space[8], marginTop: tokens.space[8] },
  countBox: { minHeight: tokens.size.buttonMd, borderRadius: tokens.radius.xl, backgroundColor: c.bg.surface },
  countStepper: { flex: 1.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countButton: { width: tokens.size.touch, height: tokens.size.buttonMd, alignItems: 'center', justifyContent: 'center' },
  countLabel: { color: c.text.secondary, flexShrink: 1, textAlign: 'center' },
  countLoad: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: tokens.space[12] },
});
