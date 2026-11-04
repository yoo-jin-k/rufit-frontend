# 루핏 프론트엔드

React Native + Expo + TypeScript 기반 iOS/Android 앱입니다. 웹은 개발 검증용으로 함께 지원합니다.
백엔드(Java/Spring Boot)는 별도 `rufit-backend` 저장소에서 관리합니다.

## 시작

Node.js 24 LTS와 npm 사용을 권장합니다.

```sh
npm ci
npm start
npm run ios
npm run android
npm run web
```

iOS 시뮬레이터는 Xcode, Android 에뮬레이터는 Android Studio가 필요합니다.
Expo Go는 프로젝트 SDK와 호환되는 버전이 필요합니다.

## 검증

```sh
npm run check
npx expo install --check
npm run export
```

Export 성공은 JS 번들 검증이며 설치 파일 생성이나 실기기 테스트를 의미하지 않습니다.

## 구조

- `src/app`: 앱 진입점과 공통 provider
- `src/features`: 기능별 화면, 상태, 도메인 로직
- `src/components`: 실제 여러 기능에서 공유하는 컴포넌트
- `src/theme`: 루핏 색상 등 디자인 토큰
- `docs`: 개발 순서와 기능 계약

## 브랜치

`feature/*`에서 구현·검증 → `develop` 대상 PR → 출시 검토 후 `main`.
`main` 직접 수정 금지. 기존 브랜치는 강제 초기화하지 않습니다.

외부 참고 앱의 빠른 기록 흐름을 참고하되 화면, 이미지, 문구, 브랜드는 복제하지 않습니다.

## 기기 저장 및 복구

현재 화면은 서버 연결 전 로컬 기록 모드다. 입력 변경과 세트 완료를 AsyncStorage에 순서대로 저장하며 앱 재실행 시 현재 기록과 완료 이력을 복구한다. 화면에서 저장 중/완료/실패와 재시도를 구분한다. 손상된 저장값은 자동 초기화하지 않는다.

운동 종료에는 완료 세트가 1개 이상 필요하고, 미완료 세트가 있다면 제외 여부를 확인한다. 새 운동 준비는 완료 이력을 지우지 않는다. 로그인 정보나 토큰은 이 저장소에 보관하지 않는다.

검증: 타입/린트/9개 테스트 및 Android·iOS·Web export 통과. 브라우저에서 입력·완료 상태의 새로고침 복구와 새 운동 준비 후 이전 이력 보존 확인. 실제 iOS/Android 기기 재실행과 서버 동기화는 별도 검증 예정이다.

서버 연결 모듈은 운동 ID가 포함된 세트, 종목 검색/수정/보관/복구, 루틴 생성 재시도/삭제, 계정 확인, 초안 일괄 저장을 지원합니다. `saveDraft`는 호출자가 만든 작업 ID를 그대로 전달합니다. 응답 유실 시 동일한 본문과 ID로 재시도해야 하며, 응답의 `workout.version`이 `appliedVersion`보다 크면 이후 변경이 생긴 것이므로 로컬 변경을 자동으로 덮어쓰면 안 됩니다. 실제 서버 검증에는 저장 성공 직후 응답을 잃는 상황과 재시도 복구가 포함됩니다. 화면은 아직 기기 내 저장 모드이며 이 API 모듈을 이용한 로그인/동기화 UI 연결은 후속 작업입니다.
