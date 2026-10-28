import type { BodyPart, Equipment } from '../../api/client.ts';
import {catalogVersion, exerciseCatalog} from './catalogData.ts';
export {catalogVersion, exerciseCatalog};
export const bodyParts: Record<BodyPart, string> = { CHEST: '가슴', BACK: '등', LEGS: '하체', SHOULDERS: '어깨', ARMS: '팔', CORE: '복부', FULL_BODY: '전신' };
export const equipmentLabels: Record<Equipment, string> = { BARBELL: '바벨', DUMBBELL: '덤벨', MACHINE: '머신', CABLE: '케이블', BODYWEIGHT: '맨몸', OTHER: '기타' };
export type CatalogExercise = { readonly id: string; readonly name: string; readonly bodyPart: BodyPart; readonly equipment: Equipment; readonly recommendedRestSeconds: number | null; readonly aliases: readonly string[] };
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/[\s_-]+/g, '');

// 목록이 커져도 매 입력마다 모든 이름·별칭을 다시 정규화하지 않도록 원본별 검색 색인을 한 번 만든다.
export function createExerciseSearch(catalog: readonly CatalogExercise[]) {
  const indexed = catalog.map(exercise => ({exercise, terms: [exercise.name, ...exercise.aliases].map(normalize)}));
  return (query = '', bodyPart?: BodyPart, equipment?: Equipment): CatalogExercise[] => {
    const term = normalize(query);
    return indexed.filter(({exercise, terms}) => (!bodyPart || exercise.bodyPart === bodyPart) && (!equipment || exercise.equipment === equipment) &&
      terms.some(name => name.includes(term))).map(({exercise}) => exercise);
  };
}
const searchCatalog = createExerciseSearch(exerciseCatalog);
export function searchExercises(query = '', bodyPart?: BodyPart, equipment?: Equipment): CatalogExercise[] {
  return searchCatalog(query, bodyPart, equipment);
}
export function findCatalogExercise(catalogId?: string): CatalogExercise | undefined {
  return exerciseCatalog.find(e => e.id === catalogId);
}
