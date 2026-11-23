/**
 * Figma 03-03 종목 상세입니다. 큰 동작 사진, 부위·장비 칩, 운동 설명, 내 기록(최고 무게·최근 운동), 하단 '이 종목 추가'.
 * 상세를 열어도 선택 상태는 바뀌지 않고, '이 종목 추가'를 눌러야 선택 목록에 들어갑니다.
 */
import { Pressable, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { NavBar, Screen, SectionTitle } from '../../components/kit/Screen';
import { text, tokens } from '../../theme/tokens';
import type { Workout } from '../workout/model';
import { previousExercises } from '../workout/previousSetModel';
import { formatDay } from '../workout/recordFormat';
import { localDay } from '../calendar/model';
import { bodyParts, equipmentLabels, type CatalogExercise } from './catalog';
import { ExerciseMedia } from './ExerciseMedia';
import { exerciseGuides } from './guides';
import { hasExerciseImage } from './images';
import { recommendedRest } from './recommendedRest';
import { AppIcon } from '../../components/AppIcon';
import { useFavorites } from '../favorites/FavoritesProvider';
import { formatWeight } from '../units/model';
import { useWeightUnit } from '../units/UnitProvider';
import { s } from './ExerciseDetail.styles';

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
  const { unit } = useWeightUnit();
  const records = previousExercises(history, {
    id: exercise.id,
    name: exercise.name,
    catalogId: exercise.id,
    sets: [],
  });
  const best = records
    .flatMap((r) => r.exercise.sets)
    .reduce<{ weight: number; reps: string } | null>((top, set) => {
      const weight = Number(set.weight) || 0;
      return !top || weight > top.weight ? { weight, reps: set.reps } : top;
    }, null);
  const latest = records[0]?.record;
  const rest = recommendedRest(exercise);
  const guide = exerciseGuides[exercise.id];
  const favorites = useFavorites();
  const favorite = favorites.isFavorite(exercise.id);
  return (
    <Screen
      edges={[]}
      header={
        <NavBar
          title={exercise.name}
          onLeading={onClose}
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${exercise.name} 즐겨찾기 ${favorite ? '해제' : '추가'}`}
              accessibilityState={{ selected: favorite }}
              hitSlop={10}
              onPress={() => favorites.toggle(exercise.id)}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <AppIcon
                name="star"
                filled={favorite}
                color={favorite ? '#F5B800' : c.text.secondary}
              />
            </Pressable>
          }
        />
      }
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
        <Text style={[text.caption, { color: c.text.secondary }]}>
          이 종목의 동작 사진은 준비 중입니다.
        </Text>
      )}
      <View style={s.tags}>
        <Tag label={bodyParts[exercise.bodyPart]} />
        <Tag label={equipmentLabels[exercise.equipment]} />
      </View>
      <SectionTitle title="운동 설명" />
      <Text style={[text.body, { color: c.text.primary }]}>
        {guide?.summary ??
          `${exercise.name}은(는) ${equipmentLabels[exercise.equipment]} 운동이며 ${bodyParts[exercise.bodyPart]} 부위로 분류됩니다.`}
      </Text>
      {guide && (
        <>
          <SectionTitle title="자세" />
          <View style={s.list}>
            {guide.steps.map((step, i) => (
              <View key={step} style={s.item}>
                <Text style={[text.bodyBold, s.marker, { color: c.text.primary }]}>{i + 1}</Text>
                <Text style={[text.body, s.itemText, { color: c.text.primary }]}>{step}</Text>
              </View>
            ))}
          </View>
          <SectionTitle title="주의할 점" />
          <View style={s.list}>
            {guide.tips.map((tip) => (
              <View key={tip} style={s.item}>
                <Text style={[text.body, s.marker, { color: c.text.secondary }]}>·</Text>
                <Text style={[text.body, s.itemText, { color: c.text.secondary }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={[text.caption, { color: c.text.secondary }]}>
        다른 이름: {exercise.aliases.join(' · ') || exercise.name}
        {rest !== undefined ? ` · 기본 세트 간 휴식 ${rest}초` : ''}
      </Text>
      {/* 시간 종목은 무게 기록이 없어 '최고 무게'를 보여 주지 않습니다. */}
      {best && latest && exercise.tracking !== 'DURATION' && (
        <>
          <SectionTitle title="내 기록" />
          <View style={s.records}>
            <View style={s.record}>
              <Text style={[text.label, { color: c.text.secondary }]}>최고 무게</Text>
              <Text style={[text.headline, { color: c.text.primary }]}>
                {formatWeight(String(best.weight), unit)} × {best.reps}회
              </Text>
            </View>
            <View style={s.record}>
              <Text style={[text.label, { color: c.text.secondary }]}>최근 운동</Text>
              <Text style={[text.headline, { color: c.text.primary }]}>
                {formatDay(latest.recordDate ?? localDay(latest.startedAt), 'compact').replace(
                  / .$/,
                  '',
                )}
              </Text>
            </View>
          </View>
        </>
      )}
      <Text style={[text.label, { color: c.text.muted }]}>
        {guide
          ? '일반적인 동작 안내입니다. 통증이 느껴지면 바로 멈추고 무게를 줄여 주세요.'
          : '사진은 참고용입니다. 종목별 자세 설명은 추후 보강됩니다.'}
      </Text>
    </Screen>
  );
}
