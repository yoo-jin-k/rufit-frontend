/**
 * 세트 번호를 누르면 열리는 시트입니다. 세트 종류(일반·웜업·드롭·실패)와 운동 자각도(RPE 5~10)를 고릅니다.
 * 누르는 즉시 저장하고, 같은 자각도를 다시 누르면 지웁니다.
 */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { BottomSheet } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { RPE_VALUES, SET_TYPES, type SetType, type WorkoutSet } from './model';
import { s } from './SetDetailSheet.styles';

const c = tokens.color;

export const setTypeInfo: Record<
  SetType,
  { mark: string; label: string; color: string; note: string }
> = {
  NORMAL: {
    mark: '',
    label: '일반 세트',
    color: c.text.secondary,
    note: '기록과 추천의 기준이 되는 세트예요.',
  },
  WARMUP: {
    mark: 'W',
    label: '웜업 세트',
    color: '#C99A00',
    note: '가벼운 무게로 몸을 푸는 세트예요. 최고 기록·추천 계산에서 빠져요.',
  },
  DROP: {
    mark: 'D',
    label: '드롭 세트',
    color: '#7A5AF8',
    note: '쉬지 않고 무게를 줄여 이어 하는 세트예요.',
  },
  FAILURE: {
    mark: 'F',
    label: '실패 세트',
    color: c.danger.default,
    note: '더 이상 반복할 수 없을 때까지 한 세트예요.',
  },
};

/** RPE는 "몇 회 더 할 수 있었는지"로 고르면 쉬워요. */
const rpeNotes: Record<number, string> = {
  5: '가벼움 · 5회 이상 더 가능',
  6: '4회 이상 더 가능',
  7: '3회 더 가능',
  8: '2회 더 가능',
  9: '1회 더 가능',
  10: '한계 · 더는 못 함',
};
const rpeColors: Record<number, string> = {
  5: '#D7F5EA',
  6: '#D7F5EA',
  7: '#FBF3C8',
  8: '#FDE3CC',
  9: '#FDDCDC',
  10: '#FBC9C9',
};

export function SetDetailSheet({
  exerciseName,
  label,
  set,
  onChange,
  onClose,
}: {
  exerciseName: string;
  /** 세트 번호 칸의 표시(1, W 등)입니다. */
  label: string;
  set: WorkoutSet;
  onChange(detail: { setType?: SetType; rpe?: number | null }): void;
  onClose(): void;
}) {
  const [note, setNote] = useState<'type' | 'rpe' | null>(null);
  const type = set.setType ?? 'NORMAL';
  return (
    <BottomSheet
      visible
      title="세트 타입"
      subtitle={`${exerciseName} · ${/^\d+$/.test(label) ? `${label}세트` : setTypeInfo[type].label}`}
      onClose={onClose}
    >
      <View style={s.head}>
        <Text style={[text.captionBold, { color: c.text.secondary, flex: 1 }]}>종류</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="세트 종류 설명 보기"
          hitSlop={8}
          onPress={() => setNote(note === 'type' ? null : 'type')}
        >
          <AppIcon name="help" color={c.text.muted} size={18} />
        </Pressable>
      </View>
      <View style={s.grid}>
        {SET_TYPES.map((option) => {
          const info = setTypeInfo[option];
          const on = option === type;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              accessibilityLabel={info.label}
              onPress={() => onChange({ setType: option })}
              style={[s.type, on && s.typeOn]}
            >
              <Text style={[text.bodyBold, { color: on ? c.text.inverse : info.color, width: 18 }]}>
                {info.mark || (option === type ? label : '#')}
              </Text>
              <Text style={[text.bodyBold, { color: on ? c.text.inverse : c.text.primary }]}>
                {info.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {note === 'type' && (
        <View style={{ gap: 4 }}>
          {SET_TYPES.map((option) => (
            <Text key={option} style={[text.label, { color: c.text.secondary }]}>
              {setTypeInfo[option].label}: {setTypeInfo[option].note}
            </Text>
          ))}
        </View>
      )}

      <View style={s.head}>
        <Text style={[text.captionBold, { color: c.text.secondary, flex: 1 }]}>
          운동 자각도 (RPE)
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="운동 자각도 설명 보기"
          hitSlop={8}
          onPress={() => setNote(note === 'rpe' ? null : 'rpe')}
        >
          <AppIcon name="help" color={c.text.muted} size={18} />
        </Pressable>
      </View>
      <View style={s.scale}>
        <Text style={[text.label, { color: c.text.secondary }]}>쉬워요</Text>
        <Text style={[text.label, { color: c.text.secondary }]}>한계예요</Text>
      </View>
      <View style={s.rpeRow}>
        {RPE_VALUES.map((value) => {
          const on = set.rpe === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              accessibilityLabel={`자각도 ${value}, ${rpeNotes[value]}${on ? ', 다시 누르면 지움' : ''}`}
              onPress={() => onChange({ rpe: on ? null : value })}
              style={[s.rpe, { backgroundColor: rpeColors[value] }, on && s.rpeOn]}
            >
              <Text style={[text.bodyBold, { color: c.text.primary }]}>{value}</Text>
            </Pressable>
          );
        })}
      </View>
      {note === 'rpe' ? (
        <View style={{ gap: 4 }}>
          {RPE_VALUES.map((value) => (
            <Text key={value} style={[text.label, { color: c.text.secondary }]}>
              {value}: {rpeNotes[value]}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={[text.label, { color: c.text.muted }]}>
          {set.rpe
            ? `${set.rpe} · ${rpeNotes[set.rpe]} (다시 누르면 지워요)`
            : '세트를 마친 뒤 얼마나 힘들었는지 골라 주세요.'}
        </Text>
      )}
    </BottomSheet>
  );
}
