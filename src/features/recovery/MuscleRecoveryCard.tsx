/**
 * 분석 탭의 '근육 회복' 상자와 상세 화면입니다.
 * 상자에는 근육 지도와 가장 늦게 풀리는 부위를, 상세 화면에는 부위별 회복률과 회복 예정 시각을 보여 줍니다.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { AppModal } from '../../components/AppModal';
import { NavBar, Screen } from '../../components/kit/Screen';
import { ListGroup, ProgressBar } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { bodyParts, exerciseCatalog } from '../exercises/catalog';
import type { Workout } from '../workout/model';
import { MuscleMap, levelColor } from './MuscleMap';
import { formatReadyAt, muscleRecovery, recoveryLevel, type RecoveryLevel } from './model';

const c = tokens.color;
const levelLabel: Record<RecoveryLevel, string> = {
  fresh: '방금 운동',
  recovering: '회복 중',
  almost: '거의 회복',
  ready: '회복 완료',
};

function Legend() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
      {(Object.keys(levelLabel) as RecoveryLevel[]).map((level) => (
        <View key={level} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View
            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: levelColor[level] }}
          />
          <Text style={[text.label, { color: c.text.secondary }]}>{levelLabel[level]}</Text>
        </View>
      ))}
    </View>
  );
}

export function MuscleRecoveryCard({ history }: { history: Workout[] }) {
  const [open, setOpen] = useState(false);
  // 화면의 시계는 운동 중에만 흐르므로, 회복 시각은 이 상자가 1분마다 직접 다시 계산합니다.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const recovery = useMemo(() => muscleRecovery(history, exerciseCatalog, now), [history, now]);
  const tired = recovery
    .filter((item) => item.readyAt !== null)
    .sort((a, b) => b.readyAt! - a.readyAt!);
  const slowest = tired[0];
  const summary = slowest
    ? `${bodyParts[slowest.part]} 회복 ${slowest.percent}% · ${formatReadyAt(slowest.readyAt!, now)} 회복 예정`
    : '모든 부위가 회복됐어요';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`근육 회복 보기, ${summary}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          {
            backgroundColor: c.bg.surface,
            borderRadius: tokens.radius.xl,
            padding: tokens.space[16],
            gap: tokens.space[8],
          },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[text.caption, { color: c.text.secondary, flex: 1 }]}>근육 회복</Text>
          <AppIcon name="chevron-right" color={c.text.muted} />
        </View>
        <Text style={[text.headline, { color: c.text.primary }]}>{summary}</Text>
        {tired.length > 1 && (
          <Text style={[text.label, { color: c.text.secondary }]}>
            {tired
              .slice(1)
              .map((item) => `${bodyParts[item.part]} ${item.percent}%`)
              .join(' · ')}
          </Text>
        )}
        <MuscleMap recovery={recovery} height={260} />
        <Legend />
      </Pressable>
      <AppModal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Screen header={<NavBar title="근육 회복" onLeading={() => setOpen(false)} />}>
          <MuscleMap recovery={recovery} height={380} />
          <Legend />
          <ListGroup>
            {recovery.map((item) => (
              <View
                key={item.part}
                accessible
                accessibilityLabel={`${bodyParts[item.part]}, 회복 ${item.percent}%${
                  item.readyAt ? `, ${formatReadyAt(item.readyAt, now)} 회복 예정` : ''
                }`}
                style={{ paddingVertical: tokens.space[12], gap: tokens.space[8] }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: levelColor[recoveryLevel(item.percent)],
                    }}
                  />
                  <Text style={[text.bodyMedium, { color: c.text.primary, flex: 1 }]}>
                    {bodyParts[item.part]}
                  </Text>
                  <Text style={[text.captionBold, { color: c.text.primary }]}>
                    {item.readyAt ? `${formatReadyAt(item.readyAt, now)} 회복 예정` : '회복 완료'}
                  </Text>
                </View>
                <ProgressBar value={item.percent} label={`${bodyParts[item.part]} 회복률`} />
                {item.lastExercise && (
                  <Text style={[text.label, { color: c.text.secondary }]}>
                    마지막 운동: {item.lastExercise}
                  </Text>
                )}
              </View>
            ))}
          </ListGroup>
          <Text style={[text.caption, { color: c.text.secondary }]}>
            연구에서 나온 평균 회복 시간(큰 근육 약 2~3일)을 바탕으로, 완료한 세트 수와 무거운 바벨
            운동 여부를 반영한 예상치예요. 통증이나 컨디션이 다르면 몸 상태를 먼저 살펴 주세요. 직접
            추가한 종목은 부위를 알 수 없어 계산에서 빠져요.
          </Text>
        </Screen>
      </AppModal>
    </>
  );
}
