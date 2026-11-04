# 소셜 로그인 v1

## 현재 범위

| 항목 | 상태 |
|---|---|
| iOS·Android 로그인 화면/계정 화면 | 구현 |
| 시스템 브라우저 + PKCE handoff | 구현 |
| `/me` 확인 후 SecureStore 저장 | 구현 |
| refresh 단일 실행·logout | 구현 |
| 웹 로그인 | 제공하지 않음(게스트 기록만 지원) |
| 카카오·Google 실계정 로그인 | 공급자 앱 등록 후 검증 필요 |
| 앱 재시작 시 자동 복원 | v1 범위 밖 |
| 로컬 운동 기록 자동 병합·삭제 | 하지 않음 |

로그인 모달은 운동 화면과 로컬 상태를 마운트한 채로 열리므로 로그인·취소·로그아웃 과정에서 작성 중인 기록을 바꾸지 않는다.

## 앱 설정

```text
EXPO_PUBLIC_RUFIT_API_URL=https://api.example.com
EXPO_PUBLIC_RUFIT_KAKAO_ENABLED=true
EXPO_PUBLIC_RUFIT_GOOGLE_ENABLED=true
```

- 공급자 등록 전에는 각 활성화 값을 설정하지 않는다.
- 개발용 가짜 공급자는 `EXPO_PUBLIC_RUFIT_AUTH_DEMO=true`와 loopback API 주소를 함께 사용한 개발 빌드에서만 보인다.
- 반환 주소는 `rufit://auth/callback`이다. 앱 등록 시 iOS bundle ID와 Android package `com.rufit.app`도 함께 확인한다.

## 개발용 HTTP 흐름

```bash
npm run auth:mock
```

기본 주소는 `http://127.0.0.1:8099`이다. 가짜 승인·취소 화면으로 PKCE, handoff 교환, `/me`, refresh rotation, logout 계약을 확인한다. 실제 카카오·Google 인증 성공을 의미하지 않는다.

## 보안 경계

- 인증 API는 일반 API 계층과 분리하고 쿠키를 보내지 않는다.
- 네이티브 앱은 `expo/fetch`의 `redirect: error`를 사용한다. iOS는 리다이렉트 delegate에서 중단하고 Android는 OkHttp 자동 리다이렉트를 끈다.
- access token은 메모리에만 두고 refresh token만 SecureStore에 저장한다.
- 로그인 성공은 `/me` 응답과 계정이 일치하고 SecureStore 저장까지 끝난 뒤에만 표시한다.
- session exchange·refresh의 응답을 알 수 없는 실패는 자동 재시도하지 않는다.
- 로그아웃은 새 API 호출을 즉시 막고 로컬 정보를 먼저 지운다. 서버 응답은 최대 5초 기다리며 결과를 알 수 없으면 구분해 안내한다.

## 검증 한계

HTTP 계약과 웹 반응형 UI는 자동 검증한다. `expo/fetch` SDK 57의 iOS 구현이 URLSession redirect delegate에서 요청을 중단하고 Android 구현이 OkHttp 자동 redirect를 끄는 것은 설치된 네이티브 소스로 확인했으며, iOS·Android 번들 생성도 통과했다. 이는 실기기 네트워크 실행 결과가 아니다.

공급자 앱 등록, universal/app link, iOS·Android 실기기의 redirect 차단, 시스템 브라우저 복귀 및 SecureStore 동작은 등록된 개발 빌드에서 별도로 확인해야 한다. 프론트의 `auth:mock` 성공은 백엔드 실제 서버와 가짜 OAuth 공급자를 연결한 통합 시험 성공으로 보지 않는다.

## 백엔드 preview 통합

백엔드 담당이 callback URI와 기동 준비를 확인한 뒤에만 실행한다.

```bash
RUFIT_AUTH_INTEGRATION_URL=http://127.0.0.1:8096 npm run auth:integrate:backend
```

이 시나리오는 실제 프론트 `createAuthApi`와 `AuthCoordinator`로 Google/Kakao fake 승인, Spring callback, handoff, `/me`, refresh, logout과 계정 구분을 확인한다. 브라우저 redirect, PKCE 난수 생성, SecureStore는 Node 시험 어댑터이며 실제 시스템 브라우저·Expo Crypto·기기 보안 저장소 증거가 아니다. 토큰과 계정 ID는 출력하거나 파일에 저장하지 않는다.
