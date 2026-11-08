/**
 * Figma RestBar: 하단 버튼 바로 위에 고정되는 검정 휴식 막대입니다.
 * 시간을 누르면 일시정지·재개, 타이머 아이콘을 누르면 휴식 시간 설정을 엽니다.
 * 휴식이 끝나면 '세트' 시간이 이어서 올라가고 증감 버튼은 숨깁니다.
 * 증감 폭은 서버 API(±10초)와 맞춥니다.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { text, tokens } from '../../theme/tokens';
import { formatRest } from './RestSetting';
import type { restTimerView } from './timerView';

const c = tokens.color;

export function RestTimerDock({ view, paused, total, onSettings, onTogglePause, onAdjust, onClose }: {
  view: ReturnType<typeof restTimerView>;
  paused: boolean;
  /** 이번 휴식 전체 길이(초)입니다. 진행 막대 비율에 씁니다. */
  total?: number;
  onSettings(): void;
  onTogglePause(): void;
  onAdjust(seconds: -10 | 10): void;
  onClose(): void;
}) {
  const isSet = view.phase === 'expired';
  const label = isSet ? '세트' : '휴식';
  const ratio = !isSet && total ? Math.max(0, Math.min(1, 1 - view.seconds / total)) : 0;
  return (
    <View style={s.bar}>
      <View style={s.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="휴식 타이머 설정" onPress={onSettings} hitSlop={8}>
          <AppIcon name="timer" color={c.text.inverse} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} ${paused ? '재개' : '일시정지'}`}
          onPress={onTogglePause}
          style={s.time}
        >
          <Text style={[text.label, { color: c.text.muted }]}>{`${label}${paused ? ' 일시정지' : ''}`}</Text>
          <Text style={[text.titleM, s.digits, { color: paused ? c.text.muted : c.text.inverse }]}>
            {formatRest(isSet ? view.elapsedSeconds : view.seconds)}
          </Text>
        </Pressable>
        {!isSet &&
          ([-10, 10] as const).map((seconds) => (
            <Pressable
              key={seconds}
              accessibilityRole="button"
              accessibilityLabel={`휴식 ${seconds < 0 ? '10초 줄이기' : '10초 늘리기'}`}
              disabled={seconds < 0 ? !view.canSubtract : !view.canAdd}
              onPress={() => onAdjust(seconds)}
              style={s.pill}
            >
              <Text style={[text.captionBold, { color: c.text.inverse }]}>{seconds < 0 ? '-10' : '+10'}</Text>
            </Pressable>
          ))}
        {/* 디자인대로 일시정지 중에는 '이어서', 진행 중에는 '건너뛰기', 휴식이 끝난 뒤에는 '닫기'를 둡니다. */}
        {paused && !isSet ? (
          <Pressable accessibilityRole="button" accessibilityLabel="휴식 이어서 하기" onPress={onTogglePause} style={s.pill}>
            <Text style={[text.captionBold, { color: c.text.inverse }]}>이어서</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={`${label} 타이머 닫기`} onPress={onClose} style={s.pill}>
            <Text style={[text.captionBold, { color: c.text.inverse }]}>{isSet ? '닫기' : '건너뛰기'}</Text>
          </Pressable>
        )}
      </View>
      {!isSet && (
        <View style={s.track}>
          <View style={[s.fill, { width: `${ratio * 100}%` }, paused && { backgroundColor: c.text.muted }]} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: c.bg.inverse,
    borderRadius: tokens.radius.xl,
    paddingTop: 14,
    paddingBottom: tokens.space[12],
    paddingHorizontal: tokens.space[16],
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  time: { flex: 1, minWidth: 0 },
  digits: { fontVariant: ['tabular-nums'] },
  pill: {
    minHeight: 36,
    paddingHorizontal: tokens.space[12],
    borderRadius: tokens.radius.sm,
    backgroundColor: c.bg.inverseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 3, borderRadius: 2, backgroundColor: c.bg.inverseSoft, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: c.accent.default },
});
