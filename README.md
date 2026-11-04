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
