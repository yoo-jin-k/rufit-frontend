/** 운동 상세는 선택 상태를 변경하지 않습니다. 사진이 없는 종목에는 대체 표시와 안내를 제공합니다. */
import { ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import { bodyParts, equipmentLabels, type CatalogExercise } from './catalog';
import { ExerciseMedia } from './ExerciseMedia';
import { recommendedRest } from './recommendedRest';
import { hasExerciseImage } from './images';

export function ExerciseDetail({ exercise, onClose }: { exercise: CatalogExercise; onClose(): void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Button title="운동 목록으로 돌아가기" secondary onPress={onClose} />
      <Text style={ui.heading}>{exercise.name}</Text>
      <ExerciseMedia exercise={exercise} expanded />
      {!hasExerciseImage(exercise.id) && <Text style={ui.muted}>이 종목의 동작 사진은 준비 중입니다.</Text>}
      <View style={ui.card}>
        <Text style={ui.heading}>운동 설명</Text>
        <Text style={ui.body}>
          {exercise.name}은(는) {equipmentLabels[exercise.equipment]} 분류의 운동이며,
          운동 목록에서 {bodyParts[exercise.bodyPart]} 부위로 분류됩니다.
        </Text>
        <Text style={ui.muted}>다른 이름: {exercise.aliases.join(' · ') || exercise.name}</Text>
        {recommendedRest(exercise) !== undefined && (
          <Text style={ui.body}>기본 세트 간 휴식: {recommendedRest(exercise)}초</Text>
        )}
      </View>
      <Text style={ui.heading}>기록 방법</Text>
      <Text style={ui.body}>1. 목록으로 돌아가 원하는 운동을 선택해 주세요.</Text>
      <Text style={ui.body}>2. 선택한 운동 추가 버튼으로 오늘의 운동 또는 선택한 날짜의 기록에 넣어 주세요.</Text>
      <Text style={ui.body}>3. 운동 화면에서 세트별 무게와 횟수를 입력해 주세요.</Text>
      <Text style={ui.muted}>사진은 참고용입니다. 종목별 자세 설명은 추후 보강됩니다.</Text>
    </ScrollView>
  );
}
