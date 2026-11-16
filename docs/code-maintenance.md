# 프론트엔드 코드 안내 및 정리 기준

## 기능을 찾는 순서

| 기능 | 주요 파일 | 책임과 수정 시 주의 사항 |
| --- | --- | --- |
| 앱 구성 | `src/app/App.tsx` | 인증 상태와 운동 화면을 연결합니다. 환경별 소셜 로그인 활성 조건을 유지해 주세요. |
| 운동 화면 | `features/workout/WorkoutScreen.tsx` | 입력·타이머·캘린더·측정 화면을 연결합니다. 화면 전환 때문에 운동 상태가 초기화되지 않도록 주의해 주세요. |
| 운동 규칙 | `features/workout/model.ts` | 세트 입력 범위, 일시정지, 완료 규칙을 정의합니다. 화면과 저장 검증에서 같은 규칙을 사용합니다. |
| 기기 저장 | `features/workout/storage.ts`, `archiveState.ts` | 형식 검증, 순차 저장, 실패·재시도를 처리합니다. 읽기 실패를 빈 기록으로 덮어쓰지 않아야 합니다. |
| 과거 기록 | `features/workout/manualWorkout.ts`, `ManualWorkoutScreen.tsx` | 기록 날짜와 작성 시각을 분리합니다. 현재 운동·휴식은 보존하며 운동시간은 미측정으로 표시합니다. |
| 캘린더 | `features/calendar/WorkoutCalendar.tsx`, `model.ts` | 완료 기록을 날짜별로 묶습니다. 수동 기록은 recordDate를 우선하고 일반 운동은 시작일을 사용합니다. |
| 월간 달성률 | `features/calendar/monthlyProgress.ts`, `MonthlyCompletion.tsx` | 해당 월 전체 일수를 분모로 계산합니다. 같은 날 여러 운동은 하루로 집계하며 저장 성공 후 표시합니다. |
| 삼대측정 | `features/strength/StrengthScreen.tsx`, `model.ts` | 날짜별 세 종목 중량을 저장합니다. 같은 날짜는 교체하며 실제 측정값을 사용합니다. |
| 체중측정 | `features/bodyweight/BodyWeightScreen.tsx`, `model.ts` | 별도 저장 키로 날짜별 체중을 관리합니다. 저장 실패 시 입력을 유지합니다. |
| 선 그래프 | `features/strength/TrendChart.tsx`, `lineChartModel.ts` | 날짜 간격과 축 범위를 계산합니다. 체중 그래프의 축이 0부터 시작하지 않을 수 있으므로 축 숫자를 유지해 주세요. |
| 종목 선택 | `features/exercises/ExercisePicker.tsx`, `catalog.ts` | 검색·필터·선택을 담당합니다. 원본 카탈로그와 화면 표현을 구분합니다. |
| 로그인 | `features/auth/authCoordinator.ts` 외 | 인증 요청과 세션 상태를 조율합니다. 비밀값을 로그나 일반 저장소에 남기지 않아야 합니다. |
| 서버 통신 | `src/api`, `features/workout/connectedStorage.ts` | 요청·버전·재시도를 처리합니다. 전송 대기 작업의 식별자와 내용은 재시도 중 유지해야 합니다. |
| 스타일 | `src/theme/tokens.ts`, 화면 옆의 `*.styles.ts`, `src/theme/web/*.scss` | 공통 토큰, 화면별 정적 스타일, 웹 전용 SCSS를 구분합니다. SCSS 수정 후 `npm run styles`로 생성하고, 생성된 CSS와 토큰 Sass는 직접 편집하지 않습니다. |

표에서 `features/`로 시작하는 경로는 모두 `src/features/` 아래에 있습니다.

## 현재 저장 범위

현재 운동 화면은 `useWorkoutArchive`에서 기기 저장 훅을 사용합니다. 삼대·체중·과거 날짜 기록과 최근 월간 달성률도 기기 기록을 기준으로 동작합니다. 서버에 같은 이름의 API가 있다고 해서 이 화면과 자동 연결된 것으로 간주하지 않아야 합니다. 서버 연동 시 날짜 의미, 인증 소유권, 충돌 처리와 실패 복구를 별도로 검증해 주세요.

## 줄 정리 및 주석 원칙

- 기본 들여쓰기는 2칸이며 긴 인자, 객체, JSX 속성은 줄을 나누어 읽기 쉽게 작성합니다.
- 주석은 존댓말로 작성하며 기능의 책임, 호출 순서의 이유와 변경 시 주의 사항을 설명합니다.
- 자명한 대입문을 그대로 설명하거나 구현과 맞지 않는 주석은 추가하지 않습니다.
- 로컬 변수와 공개 함수 이름은 이번 정리에서 변경하지 않았습니다. API·저장 키·검증 범위도 유지합니다.
- 포맷터는 Prettier 3.6.2와 저장소의 `.prettierrc.json`을 기준으로 사용합니다. 생성된 `*.module.css`, `tokens.generated.scss`는 대상에서 제외합니다.
- `npm run format`으로 소스·테스트·스크립트를 정리하고 `npm run format:check`로 확인합니다. `npm run check`에도 포맷 검사가 포함됩니다.
- SCSS 수정 뒤 `npm run styles`를 실행하고, `npm run check`로 포맷·생성물·타입·린트·테스트를 함께 확인해 주세요.

## 스타일 파일 배치

- 화면과 컴포넌트 46개의 정적 `StyleSheet` 정의를 같은 폴더의 `파일명.styles.ts`로 분리했습니다. 플랫폼 공통 스타일을 기능별로 찾을 수 있도록 한 파일에 모두 합치지는 않습니다.
- 화면 상태, 측정한 폭, 드래그 위치처럼 실행 중에 결정되는 스타일은 해당 컴포넌트에서 계산합니다.
- `ScreenLayout`의 `ui` 재내보내기를 유지하므로 기존 화면의 import 경로를 바꾸지 않아도 됩니다.
- 웹 전용 스타일은 `src/theme/web/*.module.scss`가 원본입니다. 빌더가 모든 해당 파일을 자동으로 찾아 CSS를 생성합니다.
- iOS·Android는 CSS를 적용하지 않으므로 공통 토큰을 사용하는 `StyleSheet`를 유지합니다. 생성 CSS만 수정하면 다음 빌드에 덮어쓰입니다.

## 검증과 커밋

2026-11-16 검증에서 전체 317개 테스트를 통과했습니다. 이 중 새 SCSS 모듈 자동 생성과 검사 모드의 파일 보존을 검증하는 테스트 1개를 추가했습니다. 웹·iOS·Android 번들 생성도 성공했으며, 실기기 동작 검수와는 구분합니다.

이번 작업에서는 커밋과 푸시를 하지 않습니다. 이후 승인받아 커밋할 때는 제목에 대상과 변경 목적을 쓰고 본문에 정리 범위와 검증 결과를 남깁니다.
