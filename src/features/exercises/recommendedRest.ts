/** NSCA의 복합운동·보조운동 휴식 범위를 바탕으로 정한 앱 기본값입니다. 개인별 최적값을 의미하지 않습니다. */
import type { CatalogExercise } from './catalog.ts';
export function recommendedRest(exercise?: CatalogExercise): number | undefined {
  if (!exercise) return undefined;
  if (exercise.recommendedRestSeconds !== null) return exercise.recommendedRestSeconds;
  if (/데드리프트|핵 스쿼트|클린 앤 프레스|굿모닝/.test(exercise.name)) return 180;
  if (/프레스|푸시업|로우|풀업|친업|딥스|런지|스쿼트|스텝업|쓰러스트|쓰러스터|스윙|겟업/.test(exercise.name)) return 120;
  return 90;
}
