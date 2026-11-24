# 루핏 프론트엔드

React Native + Expo + TypeScript 기반 iOS/Android 앱입니다. 웹은 개발 검증용으로 함께 지원합니다.
백엔드(Java/Spring Boot)는 별도 `rufit-backend` 저장소에서 관리합니다.

## 체험하기

- 웹: [app.rufit.yjinee.com](https://app.rufit.yjinee.com) — main에 병합되면 GitHub Pages로 자동 배포됩니다(`.github/workflows/deploy-web.yml`).
- 안드로이드: [api.rufit.yjinee.com/android](https://api.rufit.yjinee.com/android) — 휴대폰 브라우저로 열면 최신 테스트 앱(APK)이 받아집니다. 받은 파일을 열어 설치하며, 처음에는 "출처를 알 수 없는 앱 설치"를 허용해야 합니다. 이미 설치했다면 지우지 않고 그 위에 설치하면 기록이 그대로 남습니다.
- 아이폰: [TestFlight 참여 링크](https://testflight.apple.com/join/pYtQMuAQ) — App Store에서 TestFlight 앱을 설치한 뒤 링크를 열어 설치합니다.

새 안드로이드 테스트 앱은 `npx eas-cli build -p android --profile preview`로 빌드한 뒤, 받은 APK로 서버의 `rufit.apk`를 바꿉니다(Caddy 데이터 볼륨의 `downloads/rufit.apk`, `/android`가 이 파일로 연결됩니다). 설치 주소는 빌드가 바뀌어도 그대로입니다. Expo 빌드 페이지 링크는 Expo에 로그인한 사람만 열 수 있고 파일 보관 기간도 짧아 외부 공유용으로 쓰지 않습니다. 앱에 구매한 운동 그림이 들어 있어 APK 파일은 GitHub 릴리스나 저장소에 올리지 않습니다.

새 아이폰 테스트 앱은 `app.json`의 `ios.buildNumber`를 올린 뒤 `npx eas-cli build -p ios --profile testflight --auto-submit`으로 빌드·제출합니다. Apple 로그인과 인증서 생성이 대화형이라 터미널에서 직접 실행하고, 업로드된 빌드를 App Store Connect의 외부 테스트 그룹에 추가하면 같은 링크로 업데이트됩니다. iOS 번들 ID는 `com.yjinee.rufit`입니다(Android package는 `com.rufit.app`).

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

## 구매한 운동 그림

구매한 운동 그림(정지 이미지·GIF)은 라이선스상 재배포가 금지되어 Git에 올리지 않습니다.

- 원본 보관: 저장소 밖 `../../Rufit_assets/gymvisual/originals` (다른 위치면 `RUFIT_LICENSED_MEDIA_DIR`로 지정)
- 종목과 파일 연결: `assets/exercises/licensed-media.json`의 `image`·`gif` 칸에 원본 파일 이름을 적습니다.
- 앱에 반영: `npm run media:sync` (`npm start`·`npm run ios` 등을 실행할 때도 자동 실행)
- GIF는 앱 용량을 줄이려고 움직이는 WebP로 바꿔 넣습니다(`gif2webp` 필요, macOS는 `brew install webp`). 도구가 없으면 GIF를 그대로 넣습니다. 상세 화면은 iOS에서도 WebP가 움직이도록 `expo-image`로 그립니다.
- 복사본 `assets/licensed/`와 생성 파일 `src/features/exercises/licensedMedia.generated.ts`는 `.gitignore` 대상입니다.
- 원본 폴더가 없으면(GitHub 검사·다른 컴퓨터) 기본 그림만 보이고 나머지는 회색 자리표시로 나옵니다.

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

검증: 타입/린트/68개 테스트 및 Android·iOS·Web export 통과. 브라우저에서 입력·완료 상태의 새로고침 복구와 새 운동 준비 후 이전 이력 보존 확인. 실제 iOS/Android 기기 재실행과 서버 동기화는 별도 검증 예정이다.

서버 연결 모듈은 운동 ID가 포함된 세트, 종목 검색/수정/보관/복구, 루틴 생성 재시도/삭제, 계정 확인, 초안 일괄 저장을 지원합니다. `saveDraft`는 호출자가 만든 작업 ID를 그대로 전달합니다. 응답 유실 시 동일한 본문과 ID로 재시도해야 하며, 응답의 `workout.version`이 `appliedVersion`보다 크면 이후 변경이 생긴 것이므로 로컬 변경을 자동으로 덮어쓰면 안 됩니다. 실제 서버 검증에는 저장 성공 직후 응답을 잃는 상황과 재시도 복구가 포함됩니다. 화면은 아직 기기 내 저장 모드이며 이 API 모듈을 이용한 로그인/동기화 UI 연결은 후속 작업입니다.

종목 사진·검색·부위/도구 필터와 행별 세트 복제/삭제는 [사용 흐름과 검증](docs/exercise-picker.md)에 정리했습니다. [사진 출처와 라이선스](assets/exercises/README.md)를 함께 보관합니다.

서버 저장 전 문자열 입력과 세트 식별자·메모·휴식을 보존하는 [초안 변환 모듈](docs/workout-draft-mapping.md)을 제공합니다. 빈 입력이 있으면 전체 전송을 보류합니다.

[계정별 운동 연결과 복구](docs/connected-workouts.md)는 서버 응답을 기다리는 중에도 로컬 편집을 보존하고, 단계별 저장 실패를 같은 요청으로 복구합니다. 충돌 선택은 원문을 백업한 뒤 처리하며 종료·취소 응답 유실도 서버 상태를 읽어 복구합니다. 실제 로그인/화면 자동 동기화 연결은 후속 작업입니다.

코드 구조와 유지보수 기준은 [코드 안내](docs/code-maintenance.md)를 참고해 주세요.

현재 완료 기록의 수동 업로드와 체중·삼대 측정 동기화 화면은 [동기화 문서](docs/offline-sync.md)의 2026-11-02 항목을 참고해 주세요. 실제 OAuth 설정 및 기기 왕복 전송 검증은 별도로 남아 있습니다.
