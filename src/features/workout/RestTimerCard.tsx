/** 휴식은 운동 타이머와 별개입니다. 좁은 화면과 큰 글자에서는 조절 버튼만 다음 줄로 배치합니다. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { wrappableTime } from './timerView';
export function RestTimerCard({
  phase,
  remainingLabel,
  exerciseName,
  canSubtract,
  canAdd,
  stackActions,
  onAdjust,
  onSkip,
}: {
  phase: 'active' | 'expired';
  remainingLabel: string;
  exerciseName: string;
  canSubtract: boolean;
  canAdd: boolean;
  stackActions: boolean;
  onAdjust: (n: -10 | 10) => void;
  onSkip: () => void;
}) {
  return (
    <View style={[s.card, stackActions && { flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={{ flex: 1, minWidth: 80 }}>
        <Text style={s.caption}>{phase === 'expired' ? '휴식 끝' : '휴식'}</Text>
        <Text accessibilityLabel={`${exerciseName} 남은 휴식 ${remainingLabel}`} style={s.time}>
          {wrappableTime(remainingLabel)}
        </Text>
      </View>
      <View style={s.actions}>
        {[
          { label: '−10초', disabled: !canSubtract, run: () => onAdjust(-10) },
          { label: '+10초', disabled: !canAdd, run: () => onAdjust(10) },
          { label: '건너뛰기', disabled: false, run: onSkip },
        ].map((a, i) => (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            accessibilityLabel={i === 2 ? '휴식 닫기' : `휴식 ${a.label}`}
            accessibilityState={{ disabled: a.disabled }}
            disabled={a.disabled}
            onPress={a.run}
            style={[
              s.button,
              i === 2 && { backgroundColor: 'white' },
              a.disabled && { opacity: 0.4 },
            ]}
          >
            <Text style={[s.label, i === 2 && { color: '#111113' }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: '#111113',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  caption: { fontSize: 12, color: '#BBBBBF' },
  time: { fontSize: 28, fontWeight: '700', color: 'white', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  button: {
    minHeight: 44,
    minWidth: 44,
    padding: 10,
    backgroundColor: '#303034',
    borderRadius: 10,
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '600', color: 'white' },
});
