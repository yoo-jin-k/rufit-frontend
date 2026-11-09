import type { CatalogExercise } from './catalog.ts';
import { bodyParts, equipmentLabels } from './catalog.ts';

export const stackedExerciseItem = (availableWidth: number, fontScale: number) =>
  availableWidth < 300 || fontScale >= 2;

export function exerciseRowAccessibility(
  exercise: CatalogExercise,
  selected: boolean,
  mediaMissing: boolean,
) {
  return `${exercise.name}, ${bodyParts[exercise.bodyPart]}, ${equipmentLabels[exercise.equipment]}${mediaMissing ? ', 동작 사진 없음' : ''}${selected ? ', 추가됨' : ', 추가'}`;
}
