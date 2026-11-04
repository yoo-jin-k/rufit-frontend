# 공통 스타일 기반 · 1차

2026-09-13 · `codex/style-foundation` · 선행 `7b22f1d` / PR #34.

## 한 곳에서 수정하기

| 수정 위치 | 용도 |
| --- | --- |
| `src/theme/tokens.ts` | 유일한 값 원본. colors/spacing/radius/typography/size/interaction |
| `src/components/Button.styles.ts` | 네이티브의 토큰 → StyleSheet 연결 |
| `src/theme/web/Button.module.scss` | 웹 버튼 상태별 스타일 |
| `src/theme/web/_mixins.scss` | 웹에서 재사용하는 글자 규격 |
| `scripts/build-styles.mts` | 토큰에서 Sass 변수와 CSS Module 생성 |

토큰을 수정한 뒤 `npm run styles`를 실행한다. 개발 서버 실행 중 수정해도 이 명령으로 웹 생성물을 갱신한다. `npm start`, `npm run web/ios/android/export`는 시작 전에 자동 생성한다. 직접 `npx expo ...`를 쓰면 먼저 `npm run styles`가 필요하다.

`tokens.generated.scss`, `Button.module.css`는 생성물이므로 직접 수정하지 않는다. 함께 커밋한다. `npm run styles:check`와 `npm run check`가 원본/생성물 불일치를 실패로 처리한다. 검사 모드는 파일을 수정하지 않는다. 커스텀 명령으로 별도 Sass 파이프라인을 만들 필요 없다.

## 지원 범위

[Expo SDK 57 Metro 문서](https://docs.expo.dev/versions/v57.0.0/config/metro/#sass)에 따르면 Sass는 부분 지원이고 Sass 파일 간 import를 직접 지원하지 않는다. [CSS는 웹 전용](https://docs.expo.dev/versions/v57.0.0/config/metro/#css)이며 네이티브에서 글로벌 CSS는 무시된다. 설치된 @expo/metro-config 코드와도 대조했다.

이 프로젝트는 Dart Sass로 `@use`를 먼저 컴파일하고 `.web.ts`에서 생성된 CSS Module을 읽는다. iOS/Android는 동일 토큰을 직접 참조하는 StyleSheet를 쓴다. 색·폰트·간격·크기·반경을 플랫폼마다 별도 수동 관리하지 않는다. CSS 클래스 합성에는 역할별 식별자를 사용한다. Expo의 unstable_styles 공통 식별자를 겹쳐 적용하면 보조 버튼에 기본 크기가 사라져, 실제 화면과 회귀 검사로 확인 후 수정했다.

## 이번 범위

- 기존 공통 Button만 전환. 패딩14, 최소높이48, 반경14, 글자16/700, 기존 색·disabled/pressed opacity 유지.
- Button props/로딩/저장 동작 변경 없음. DS-01 초안의 신규 패딩·타이포·disabled색·focus·loading은 적용하지 않았다.
- 타이머·세트 행·저장 상태 표시와 전체 반응형 재배치는 별도 단위다. 기존 화면의 모든 수치가 토큰화된 상태가 아니다.
- CI가 developer PR과 codex 브랜치 push도 검증하도록 트리거를 보완했다.

## 검증

| 항목 | 결과/제한 |
| --- | --- |
| Node 24.18.1 | styles:check, 타입, 린트, 테스트102개 통과 |
| export | web/iOS/Android 성공. 네이티브 실행 검수와 구분 |
| 토큰 변경 실험 | 색/패딩/반경/최소높이/글자 크기를 임시 변경해 네이티브 스타일 정의와 생성 CSS에 함께 반영 확인, 원복. 네이티브 렌더를 대체하지 않음 |
| 드리프트 | 변경 후 미생성 상태에서 check 실패, 생성물 무수정 확인. 재생성 후 성공 |
| Chrome 독립 headless | 시작→스쿼트1kg/2회→완료→정지→휴식+10→창 크기 전환→재시작 |
| 320/375/390/430/768/1024 + 844×390 | 입력/포커스/저장된ID·정지·휴식 보존, 공통 버튼 가로 넘침 없음. 전체 앱 반응형 완료 의미 아님 |
| 미검수 | 네이티브 키보드, 글자배율1.3/2.0, 실기기 safe area·접힘·스크린리더 |

증거: `docs/verification/style-foundation/browser-results.json`, `320.png`, `1024.png`. 별도 테스트 프로필과8097 포트를 사용했으며 기존8081/8093과 사용자 저장 데이터는 건드리지 않았다.

후속: PM이 전달하는 Designer 최종 명세에 맞춰 WorkoutTimerCard/RestTimerCard/SetRow 분리와 가용폭·글자 확대를 적용한다. 저장상태 모델은 별도 기능으로 진행한다.
