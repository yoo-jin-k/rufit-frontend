/**
 * 세트의 무게나 횟수를 누르면 열리는 입력 시트입니다.
 * 큰 숫자를 직접 고치거나 증감 버튼으로 조절하고, 최근·추천·이전 기록 값을 눌러 지금 세트에 넣습니다.
 * '남은 세트 통일'은 지금 세트와 그 뒤의 완료하지 않은 세트에만 같은 값을 넣습니다.
 * 맨몸 운동은 무게 영역 없이 횟수만 보여 줍니다.
 * 무게는 kg·lbs 중 고른 단위로 보여 주고 입력받되, 저장은 언제나 kg로 합니다.
 */
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { BottomSheet } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { localDay } from '../calendar/model';
import type { Exercise, Workout, WorkoutSet } from './model';
import {
  recentSet,
  recommendationNote,
  setHistory,
  stepReps,
  type Recommendation,
} from './setEditorModel';
import {
  displayWeight,
  formatWeight,
  otherUnitHint,
  stepWeightIn,
  toKg,
  unitLabel,
  weightSteps,
} from '../units/model';
import { useWeightUnit } from '../units/UnitProvider';
import { s } from './SetEditorSheet.styles';

const c = tokens.color;

type Patch = Partial<Pick<WorkoutSet, 'weight' | 'reps'>>;

export function SetEditorSheet({
  exercise,
  set,
  index,
  history,
  noWeight,
  recommendation,
  error,
  onChange,
  onFillRemaining,
  onComplete,
  onClose,
}: {
  exercise: Exercise;
  set: WorkoutSet;
  index: number;
  history: Workout[];
  noWeight: boolean;
  recommendation: Recommendation;
  error?: string;
  onChange(patch: Patch): void;
  onFillRemaining(): void;
  onComplete(): void;
  onClose(): void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const { unit, setUnit } = useWeightUnit();
  // 입력 중인 글자(예: '45.')를 그대로 보여 주기 위해, 칸을 고치는 동안만 따로 들고 있습니다.
  const [typing, setTyping] = useState<string | null>(null);
  const [small, large] = weightSteps(unit);
  const u = unitLabel(unit);
  const recent = recentSet(history, exercise, index);
  const records = showHistory ? setHistory(history, exercise) : [];
  const label = (w: string, r: string) =>
    noWeight ? `${r}회` : `${formatWeight(w, unit)} × ${r}회`;
  const apply = (source: Pick<WorkoutSet, 'weight' | 'reps'>) => {
    setTyping(null);
    onChange(
      noWeight ? { weight: '0', reps: source.reps } : { weight: source.weight, reps: source.reps },
    );
  };
  const step = (delta: number) => {
    setTyping(null);
    onChange({ weight: stepWeightIn(set.weight, delta, unit) });
  };
  return (
    <BottomSheet visible title={`${index + 1}세트`} subtitle={exercise.name} onClose={onClose}>
      <View style={s.fields}>
        {!noWeight && (
          <View style={s.field}>
            <View style={s.unitRow}>
              <Text style={[text.captionBold, { color: c.text.secondary }]}>무게</Text>
              <View
                style={s.unitToggle}
                accessibilityRole="radiogroup"
                accessibilityLabel="무게 단위"
              >
                {(['KG', 'LB'] as const).map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityLabel={option === 'KG' ? '킬로그램' : '파운드'}
                    accessibilityState={{ checked: unit === option }}
                    aria-checked={unit === option}
                    hitSlop={6}
                    onPress={() => {
                      setTyping(null);
                      setUnit(option);
                    }}
                    style={[s.unitOption, unit === option && s.unitOptionOn]}
                  >
                    <Text
                      style={[
                        text.label,
                        { color: unit === option ? c.text.primary : c.text.muted },
                      ]}
                    >
                      {unitLabel(option)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <TextInput
              accessibilityLabel={`${exercise.name} ${index + 1}세트 무게 ${unit === 'LB' ? '파운드' : '킬로그램'}`}
              style={[text.display, s.value]}
              keyboardType="decimal-pad"
              value={typing ?? displayWeight(set.weight, unit)}
              maxLength={7}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={c.text.disabled}
              onChangeText={(value) => {
                setTyping(value);
                onChange({ weight: toKg(value, unit) });
              }}
              onBlur={() => setTyping(null)}
            />
            <Text style={[text.label, s.hint]}>{otherUnitHint(set.weight, unit)}</Text>
            <Stepper
              label={`${small}${u}`}
              name={`무게 ${small}${u}`}
              onStep={(sign) => step(sign * small)}
            />
            <Stepper
              label={`${large}${u}`}
              name={`무게 ${large}${u}`}
              onStep={(sign) => step(sign * large)}
            />
          </View>
        )}
        <View style={s.field}>
          <View style={s.unitRow}>
            <Text style={[text.captionBold, { color: c.text.secondary }]}>횟수</Text>
          </View>
          <TextInput
            accessibilityLabel={`${exercise.name} ${index + 1}세트 횟수`}
            style={[text.display, s.value]}
            keyboardType="number-pad"
            value={set.reps}
            maxLength={4}
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={c.text.disabled}
            onChangeText={(reps) => onChange({ reps })}
          />
          <Text style={[text.label, s.hint]} />
          <Stepper
            label="1회"
            name="횟수 1회"
            onStep={(sign) => onChange({ reps: stepReps(set.reps, sign) })}
          />
          <Stepper
            label="5회"
            name="횟수 5회"
            onStep={(sign) => onChange({ reps: stepReps(set.reps, sign * 5) })}
          />
        </View>
      </View>

      {showHistory ? (
        <View style={s.history}>
          <View style={s.historyHead}>
            <Text style={[text.captionBold, { color: c.text.primary, flex: 1 }]}>
              선택한 기록을 지금 세트에 넣어요
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 기록 닫기"
              hitSlop={10}
              onPress={() => setShowHistory(false)}
            >
              <AppIcon name="close" color={c.text.secondary} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ gap: tokens.space[12] }}>
            {!records.length && (
              <Text style={[text.caption, { color: c.text.secondary }]}>
                이 종목의 이전 기록이 아직 없어요
              </Text>
            )}
            {records.map(({ record, exercise: past }) => {
              const day = record.recordDate ?? localDay(record.startedAt);
              const [y, m, d] = day.split('-').map(Number);
              return (
                <View key={`${record.id}:${past.id}`} style={{ gap: 2 }}>
                  <Text
                    style={[text.label, { color: c.text.muted }]}
                  >{`${y}년 ${m}월 ${d}일`}</Text>
                  {past.sets.map((row, i) => (
                    <Pressable
                      key={row.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${m}월 ${d}일 ${i + 1}세트 ${label(row.weight, row.reps)} 넣기`}
                      onPress={() => apply(row)}
                      style={({ pressed }) => [
                        s.historyRow,
                        pressed && { backgroundColor: c.bg.default },
                      ]}
                    >
                      <Text style={[text.caption, s.historyIndex]}>{i + 1}</Text>
                      {!noWeight && (
                        <Text style={[text.bodyBold, s.historyValue]}>
                          {formatWeight(row.weight, unit)}
                        </Text>
                      )}
                      <Text style={[text.bodyBold, s.historyValue]}>{row.reps}회</Text>
                      <Text style={[text.label, { color: c.text.secondary }]}>넣기</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <View style={{ gap: tokens.space[8] }}>
          <View style={s.chipRow}>
            <Text style={[text.caption, s.chipLabel]}>최근</Text>
            {recent ? (
              <Chip
                label={label(recent.weight, recent.reps)}
                name={`최근 기록 ${label(recent.weight, recent.reps)} 넣기`}
                onPress={() => apply(recent)}
              />
            ) : (
              <Text style={[text.caption, { color: c.text.muted }]}>기록 없음</Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${exercise.name} 이전 기록 보기`}
              hitSlop={8}
              onPress={() => setShowHistory(true)}
              style={s.more}
            >
              <Text style={[text.caption, { color: c.text.secondary }]}>이전 기록</Text>
              <AppIcon name="chevron-right" color={c.text.secondary} size={16} />
            </Pressable>
          </View>
          <View style={s.chipRow}>
            <Text style={[text.caption, s.chipLabel]}>추천</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="추천 기준 보기"
              hitSlop={8}
              onPress={() => setShowNote((v) => !v)}
            >
              <AppIcon name="help" color={c.text.muted} size={16} />
            </Pressable>
            <Chip
              label={label(recommendation.weight, recommendation.reps)}
              name={`추천 ${label(recommendation.weight, recommendation.reps)} 넣기`}
              onPress={() => apply(recommendation)}
            />
          </View>
          {showNote && (
            <Text style={[text.label, { color: c.text.secondary }]}>{recommendationNote}</Text>
          )}
        </View>
      )}

      {!!error && (
        <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>
          {error}
        </Text>
      )}
      <View style={s.actions}>
        <Button
          title="남은 세트 통일"
          variant="secondary"
          style={s.action}
          onPress={onFillRemaining}
        />
        <Button
          title={set.completed ? '완료 취소' : '세트 완료'}
          style={s.action}
          onPress={onComplete}
        />
      </View>
    </BottomSheet>
  );
}

function Stepper({
  label,
  name,
  onStep,
}: {
  label: string;
  name: string;
  onStep(sign: 1 | -1): void;
}) {
  return (
    <View style={s.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} 빼기`}
        hitSlop={6}
        onPress={() => onStep(-1)}
        style={s.stepButton}
      >
        <Text style={[text.titleM, { color: c.text.secondary }]}>−</Text>
      </Pressable>
      <Text style={[text.callout, { color: c.text.primary }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} 더하기`}
        hitSlop={6}
        onPress={() => onStep(1)}
        style={s.stepButton}
      >
        <Text style={[text.titleM, { color: c.text.secondary }]}>+</Text>
      </Pressable>
    </View>
  );
}

function Chip({ label, name, onPress }: { label: string; name: string; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}
    >
      <Text style={[text.captionBold, { color: c.text.primary }]}>{label}</Text>
    </Pressable>
  );
}
