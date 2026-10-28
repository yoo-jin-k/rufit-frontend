import type { BodyPart, Equipment } from '../../api/client.ts';
export const bodyParts: Record<BodyPart, string> = { CHEST: '가슴', BACK: '등', LEGS: '하체', SHOULDERS: '어깨', ARMS: '팔', CORE: '복부', FULL_BODY: '전신' };
export const equipmentLabels: Record<Equipment, string> = { BARBELL: '바벨', DUMBBELL: '덤벨', MACHINE: '머신', CABLE: '케이블', BODYWEIGHT: '맨몸', OTHER: '기타' };
export type CatalogExercise = { readonly id: string; readonly name: string; readonly bodyPart: BodyPart; readonly equipment: Equipment; readonly recommendedRestSeconds: number; readonly aliases: readonly string[] };
export const exerciseCatalog: readonly CatalogExercise[] = [
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "recommendedRestSeconds": 180,
    "name": "스쿼트",
    "bodyPart": "LEGS",
    "equipment": "BARBELL",
    "aliases": [
      "바벨 스쿼트",
      "squat"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000002",
    "recommendedRestSeconds": 120,
    "name": "벤치프레스",
    "bodyPart": "CHEST",
    "equipment": "BARBELL",
    "aliases": [
      "벤치 프레스",
      "bench press"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000003",
    "recommendedRestSeconds": 180,
    "name": "데드리프트",
    "bodyPart": "FULL_BODY",
    "equipment": "BARBELL",
    "aliases": [
      "deadlift"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000004",
    "recommendedRestSeconds": 120,
    "name": "오버헤드프레스",
    "bodyPart": "SHOULDERS",
    "equipment": "BARBELL",
    "aliases": [
      "밀리터리 프레스",
      "숄더 프레스",
      "overhead press"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000005",
    "recommendedRestSeconds": 120,
    "name": "랫풀다운",
    "bodyPart": "BACK",
    "equipment": "MACHINE",
    "aliases": [
      "랫 풀 다운",
      "lat pulldown"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000006",
    "recommendedRestSeconds": 120,
    "name": "레그프레스",
    "bodyPart": "LEGS",
    "equipment": "MACHINE",
    "aliases": [
      "레그 프레스",
      "leg press"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000007",
    "recommendedRestSeconds": 120,
    "name": "푸시업",
    "bodyPart": "CHEST",
    "equipment": "BODYWEIGHT",
    "aliases": [
      "푸쉬업",
      "팔굽혀펴기",
      "push up"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000008",
    "recommendedRestSeconds": 120,
    "name": "풀업",
    "bodyPart": "BACK",
    "equipment": "BODYWEIGHT",
    "aliases": [
      "턱걸이",
      "pull up"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000009",
    "recommendedRestSeconds": 90,
    "name": "덤벨컬",
    "bodyPart": "ARMS",
    "equipment": "DUMBBELL",
    "aliases": [
      "덤벨 컬",
      "이두",
      "dumbbell curl"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000010",
    "recommendedRestSeconds": 90,
    "name": "트라이셉스푸시다운",
    "bodyPart": "ARMS",
    "equipment": "CABLE",
    "aliases": [
      "트라이셉스 푸시다운",
      "삼두",
      "triceps pushdown"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000011",
    "recommendedRestSeconds": 120,
    "name": "맨몸 스쿼트",
    "bodyPart": "LEGS",
    "equipment": "BODYWEIGHT",
    "aliases": [
      "에어 스쿼트",
      "bodyweight squat"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000012",
    "recommendedRestSeconds": 120,
    "name": "덤벨 스쿼트",
    "bodyPart": "LEGS",
    "equipment": "DUMBBELL",
    "aliases": [
      "dumbbell squat"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000013",
    "recommendedRestSeconds": 180,
    "name": "프론트 스쿼트",
    "bodyPart": "LEGS",
    "equipment": "BARBELL",
    "aliases": [
      "front squat"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000014",
    "recommendedRestSeconds": 90,
    "name": "덤벨 사이드 레터럴 레이즈",
    "bodyPart": "SHOULDERS",
    "equipment": "DUMBBELL",
    "aliases": [
      "사레레",
      "사이드 레터럴 레이즈",
      "lateral raise"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000015",
    "recommendedRestSeconds": 120,
    "name": "덤벨 숄더 프레스",
    "bodyPart": "SHOULDERS",
    "equipment": "DUMBBELL",
    "aliases": [
      "어깨 프레스",
      "dumbbell shoulder press"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000016",
    "recommendedRestSeconds": 120,
    "name": "덤벨 업라이트 로우",
    "bodyPart": "SHOULDERS",
    "equipment": "DUMBBELL",
    "aliases": [
      "upright row"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000017",
    "recommendedRestSeconds": 120,
    "name": "덤벨 벤치 프레스",
    "bodyPart": "CHEST",
    "equipment": "DUMBBELL",
    "aliases": [
      "dumbbell bench press"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000018",
    "recommendedRestSeconds": 90,
    "name": "크런치",
    "bodyPart": "CORE",
    "equipment": "BODYWEIGHT",
    "aliases": [
      "복근",
      "crunch"
    ]
  }
];
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
