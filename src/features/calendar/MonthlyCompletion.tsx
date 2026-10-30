/**
 * 운동 종료 후 저장이 완료되었을 때 월간 달성률을 표시합니다.
 * 저장 여부의 판단은 호출 화면에서 담당하며, 이 컴포넌트는 전달받은 집계값만 표시합니다.
 */
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import type { monthlyProgress } from './monthlyProgress';
export function MonthlyCompletion({
  progress,
  onClose,
}: {
  progress: ReturnType<typeof monthlyProgress> | null;
  onClose: () => void;
}) {
  if (!progress) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={s.overlay}>
        <ScrollView contentContainerStyle={s.container}>
          <View style={s.card}>
            <Text style={s.title}>오늘 운동도 완료했어요!</Text>
            <Text style={s.caption}>{Number(progress.month.slice(5))}월 운동 달성률</Text>
            <Text style={s.percent}>{progress.percent}%</Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="이번 달 운동 달성률"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: progress.percent,
                text: `${progress.totalDays}일 중 ${progress.workoutDays}일 운동, ${progress.percent}%`,
              }}
              style={s.track}
            >
              <View style={[s.fill, { width: `${progress.percent}%` }]} />
            </View>
            <Text style={s.heading}>
              {progress.totalDays}일 중 {progress.workoutDays}일 운동
            </Text>
            <Text style={s.caption}>
              이번 달 전체 날짜를 100%로 계산해요.{'\n'}같은 날 여러 번 운동해도 하루로 기록됩니다.
            </Text>
            <Text style={s.caption}>기록이 기기에 저장되었습니다.</Text>
            <Button title="확인" onPress={onClose} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(24,35,43,0.45)' },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: spacing.xxl,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    gap: spacing.lg,
  },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  heading: { ...typography.heading, color: colors.text, textAlign: 'center' },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  percent: {
    fontSize: 48,
    lineHeight: 60,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  track: { height: 12, borderRadius: 6, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: colors.primary },
});
