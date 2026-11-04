import type { BodyPart, Equipment } from '../../api/client.ts';
export const bodyParts: Record<BodyPart, string> = { CHEST: '가슴', BACK: '등', LEGS: '하체', SHOULDERS: '어깨', ARMS: '팔', CORE: '복부', FULL_BODY: '전신' };
export const equipmentLabels: Record<Equipment, string> = { BARBELL: '바벨', DUMBBELL: '덤벨', MACHINE: '머신', CABLE: '케이블', BODYWEIGHT: '맨몸', OTHER: '기타' };
export type CatalogExercise = { id: string; name: string; bodyPart: BodyPart; equipment: Equipment; aliases: string[] };
export const exerciseCatalog: CatalogExercise[] = [
  {
    "id": "00000000-0000-4000-8000-000000000001",
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
    "name": "데드리프트",
    "bodyPart": "FULL_BODY",
    "equipment": "BARBELL",
    "aliases": [
      "deadlift"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000004",
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
    "name": "덤벨 스쿼트",
    "bodyPart": "LEGS",
    "equipment": "DUMBBELL",
    "aliases": [
      "dumbbell squat"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000013",
    "name": "프론트 스쿼트",
    "bodyPart": "LEGS",
    "equipment": "BARBELL",
    "aliases": [
      "front squat"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000014",
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
    "name": "덤벨 업라이트 로우",
    "bodyPart": "SHOULDERS",
    "equipment": "DUMBBELL",
    "aliases": [
      "upright row"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000017",
    "name": "덤벨 벤치 프레스",
    "bodyPart": "CHEST",
    "equipment": "DUMBBELL",
    "aliases": [
      "dumbbell bench press"
    ]
  },
  {
    "id": "00000000-0000-4000-8000-000000000018",
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
export function searchExercises(query = '', bodyPart?: BodyPart, equipment?: Equipment): CatalogExercise[] {
  const term = normalize(query);
  return exerciseCatalog.filter(e => (!bodyPart || e.bodyPart === bodyPart) && (!equipment || e.equipment === equipment) &&
    [e.name, ...e.aliases].some(name => normalize(name).includes(term)));
}
export function findCatalogExercise(catalogId?: string): CatalogExercise | undefined {
  return exerciseCatalog.find(e => e.id === catalogId);
}
