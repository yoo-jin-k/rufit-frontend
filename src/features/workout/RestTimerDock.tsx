/** 하단 휴식 조작을 분리하여 정지·재개와 좁은 화면 배치를 한곳에서 관리합니다. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme/tokens';
import { formatRest } from './RestSetting';
import type { restTimerView } from './timerView';
export function RestTimerDock({ view, paused, onSettings, onTogglePause, onAdjust, onClose }: {
  view: ReturnType<typeof restTimerView>;
  paused: boolean;
  onSettings(): void;
  onTogglePause(): void;
  onAdjust(seconds: -10 | 10): void;
  onClose(): void;
}) {
  const isSet = view.phase === 'expired';
  const label = isSet ? '세트' : '휴식';
  return (
    <View style={s.restBar}>
    <Pressable accessibilityRole="button" accessibilityLabel="휴식 타이머 설정" style={{ flex: 1, minWidth: 90 }}
      onPress={onSettings}>
      <Text style={s.muted}>{`${label}${paused ? ' 일시정지' : ''}`}  ⌃</Text>
      <Text style={s.restTime}>{formatRest(isSet ? view.elapsedSeconds : view.seconds)}</Text>
    </Pressable>
    <Pressable accessibilityRole="button"
      accessibilityLabel={`${label} ${paused ? '재개' : '일시정지'}`}
      style={s.timerAction}
      onPress={onTogglePause}>
      <Text style={s.muted}>{paused ? '재개' : '정지'}</Text>
    </Pressable>
    {!isSet && ([-10, 10] as const).map((seconds) => <Pressable key={seconds} accessibilityRole="button"
      accessibilityLabel={`휴식 ${seconds < 0 ? '10초 줄이기' : '10초 늘리기'}`}
      disabled={seconds < 0 ? !view.canSubtract : !view.canAdd}
      style={s.timerAction} onPress={() => { onAdjust(seconds); }}>
      <Text style={s.heading}>{seconds < 0 ? '−' : '+'}</Text><Text style={s.muted}>10초</Text>
    </Pressable>)}
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 타이머 닫기`} style={s.timerAction} onPress={onClose}>
      <Text style={{ fontSize: 28, color: '#D64545' }}>×</Text>
    </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  restBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  restTime: { fontSize: 32, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  timerAction: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderRadius: 24 },
  heading: { ...typography.heading, color: colors.text },
  muted: { ...typography.caption, color: colors.textSecondary },
});
