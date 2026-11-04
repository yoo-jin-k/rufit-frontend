// CSS Module의 공통 식별자를 그대로 겹치면 마지막 클래스만 남는다.
// 역할별 키를 분리해 기본/보조/눌림 스타일을 동시에 유지한다.
export function createWebStyles<T extends string>(scope: string, classes: Record<T, string>) {
  return Object.fromEntries(Object.entries(classes).filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => [key, {$$css: true, [`${scope}-${key}`]: value}])) as Record<T, {$$css: true; [key: string]: string | true}>;
}
