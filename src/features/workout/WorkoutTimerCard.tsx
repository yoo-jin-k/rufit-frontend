/** 운동 시간은 저장된 시각으로 계산합니다. 이 컴포넌트는 일시정지·재개 명령만 전달합니다. */
import { Pressable, Text, View } from 'react-native';
import { ui } from '../../components/ScreenLayout';
import { colors } from '../../theme/tokens';
import { wrappableTime } from './timerView';
export function WorkoutTimerCard({
  phase,
  elapsedLabel,
  onPause,
  onResume,
}: {
  phase: 'running' | 'paused' | 'finished';
  elapsedLabel: string;
  onPause: () => void;
  onResume: () => void;
}) {
  return (
    <View style={ui.between}>
      <View style={{ gap: 4, flex: 1 }}>
        <Text style={ui.muted}>
          {phase === 'paused'
            ? '일시정지 중'
            : phase === 'finished'
              ? '운동 완료'
              : '• 운동 기록 중'}
        </Text>
        <Text
          accessibilityLabel={`운동 진행 시간 ${elapsedLabel}`}
          style={{
            fontSize: 38,
            lineHeight: 48,
            fontWeight: '700',
            color: colors.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {wrappableTime(elapsedLabel)}
        </Text>
      </View>
      {phase !== 'finished' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={phase === 'paused' ? '운동 재개' : '일시정지'}
          onPress={phase === 'paused' ? onResume : onPause}
          style={{
            minHeight: 48,
            minWidth: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primarySoft,
          }}
        >
          <Text style={ui.heading}>{phase === 'paused' ? '▶' : 'Ⅱ'}</Text>
        </Pressable>
      )}
    </View>
  );
}
