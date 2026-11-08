/**
 * Figma 03-03 종목 상세입니다. 큰 동작 사진, 부위·장비 칩, 운동 설명, 내 기록(최고 무게·최근 운동), 하단 '이 종목 추가'.
 * 상세를 열어도 선택 상태는 바뀌지 않고, '이 종목 추가'를 눌러야 선택 목록에 들어갑니다.
 */
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { NavBar, Screen, SectionTitle } from '../../components/kit/Screen';
import { text, tokens } from '../../theme/tokens';
import type { Workout } from '../workout/model';
import { previousExercises } from '../workout/previousSetModel';
import { formatDay } from '../workout/recordFormat';
import { localDay } from '../calendar/model';
import { bodyParts, equipmentLabels, type CatalogExercise } from './catalog';
import { ExerciseMedia } from './ExerciseMedia';
import { hasExerciseImage } from './images';
import { recommendedRest } from './recommendedRest';

const c = tokens.color;

function Tag({ label }: { label: string }) {
  return (
    <View style={s.tag}>
      <Text style={[text.captionBold, { color: c.text.primary }]}>{label}</Text>
    </View>
  );
}

export function ExerciseDetail({
  exercise,
  history = [],
  alreadyAdded = false,
  onClose,
  onAdd,
}: {
  exercise: CatalogExercise;
  history?: Workout[];
  alreadyAdded?: boolean;
  onClose(): void;
  onAdd?(): void;
}) {
  const records = previousExercises(history, { id: exercise.id, name: exercise.name, catalogId: exercise.id, sets: [] });
  const best = records
    .flatMap((r) => r.exercise.sets)
    .reduce<{ weight: number; reps: string } | null>((top, set) => {
      const weight = Number(set.weight) || 0;
      return !top || weight > top.weight ? { weight, reps: set.reps } : top;
    }, null);
  const latest = records[0]?.record;
  const rest = recommendedRest(exercise);
  return (
    <Screen
      edges={[]}
      header={<NavBar title={exercise.name} onLeading={onClose} />}
      footer={
        onAdd && (
          <Button
            title={alreadyAdded ? '이미 추가한 종목' : '이 종목 추가'}
            disabled={alreadyAdded}
            onPress={onAdd}
          />
        )
      }
    >
      <ExerciseMedia exercise={exercise} expanded />
      {!hasExerciseImage(exercise.id) && (
        <Text style={[text.caption, { color: c.text.secondary }]}>이 종목의 동작 사진은 준비 중입니다.</Text>
      )}
      <View style={s.tags}>
        <Tag label={bodyParts[exercise.bodyPart]} />
        <Tag label={equipmentLabels[exercise.equipment]} />
      </View>
      <SectionTitle title="운동 설명" />
      <Text style={[text.body, { color: c.text.primary }]}>
        {exercise.name}은(는) {equipmentLabels[exercise.equipment]} 운동이며 {bodyParts[exercise.bodyPart]} 부위로 분류됩니다.
      </Text>
      <Text style={[text.caption, { color: c.text.secondary }]}>
        다른 이름: {exercise.aliases.join(' · ') || exercise.name}
        {rest !== undefined ? ` · 기본 세트 간 휴식 ${rest}초` : ''}
      </Text>
      {best && latest && (
        <>
          <SectionTitle title="내 기록" />
          <View style={s.records}>
            <View style={s.record}>
              <Text style={[text.label, { color: c.text.secondary }]}>최고 무게</Text>
              <Text style={[text.headline, { color: c.text.primary }]}>
                {best.weight}kg × {best.reps}회
              </Text>
            </View>
            <View style={s.record}>
              <Text style={[text.label, { color: c.text.secondary }]}>최근 운동</Text>
              <Text style={[text.headline, { color: c.text.primary }]}>
                {formatDay(latest.recordDate ?? localDay(latest.startedAt), 'compact').replace(/ .$/, '')}
              </Text>
            </View>
          </View>
        </>
      )}
      <Text style={[text.label, { color: c.text.muted }]}>사진은 참고용입니다. 종목별 자세 설명은 추후 보강됩니다.</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  tags: { flexDirection: 'row', gap: tokens.space[8], flexWrap: 'wrap' },
  tag: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: c.line.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  records: { flexDirection: 'row', gap: tokens.space[12] },
  record: { flex: 1, backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: 4 },
});
