# 소셜 로그인 v0.2 · FE 플랫폼 호환성 검토

2026-09-14 · PM 검토용. **모바일 후보안은 조건부 수용 가능, 즉시 연결 가능한 확정 API는 아니다. WEB은 예약값 유지.** 실제 SDK 설치·앱 등록·키 생성·로그인·서버/DB 변경은 하지 않았다.

## 1. 검토 기준

| 자료 | 기준 |
|---|---|
| BE 초안 | [a482848의 social-login-draft.md v0.2](https://github.com/yoo-jin-k/rufit-backend/blob/a482848c7dc73d4d878d8121186bc62931033aca/docs/api-contracts/social-login-draft.md) |
| BE 보완 | 같은 커밋의 authentication-gap-analysis.md,authentication-adversarial-review.md |
| FE 코드 | c7503cf4a19e32458cf27c4002f6e9d08eaa7971의 app.json/package.json,src/api/client.ts,session.ts,outbox.ts,features/workout/connectedStorage.ts |
| 외부 근거 | Expo SDK57 문서,Google/Kakao 공식 문서,OAuth RFC. SecureStore v57 URL 조회 오류로 최신 공식 페이지의57.0.4 표기를 확인해 대조 |
| 문서 브랜치 | developer에서 직접 분기한 codex/social-login-platform-review. 이 문서만 추가하며 선행 UI PR을 포함하지 않음 |

현재 프론트는 Expo57/RN0.86.3이다. 앱 설정에는 로그인 scheme·iOS bundleIdentifier/associatedDomains·Android package/intentFilters가 없고,AuthSession/WebBrowser/SecureStore의 직접 의존성이나 로그인 UI도 없다. 사용자 콘솔의 기존 등록 유무는 확인하지 않았다. 실행 중인 앱은 로컬 운동 저장 UI이며,연결 저장 계층이 실제 소셜 로그인에 연결됐다고 해석하지 않는다.

## 2. PM/BE와 먼저 맞춰야 할 차이

| ID | 확인한 차이 | 필요한 결정/후속 |
|---|---|---|
| A01 | v0.2의 앱 복귀는 attemptId/handoffCode다. 표준 OAuth code/state 응답이 아님 | AuthSession의 제공자 code 교환/응답 파서를 그대로 연결하지 않는다. 서버 authorizationUrl을 시스템 인증 브라우저로 열고,별도 handoff 파서/교환 adapter 사용 후보 |
| A02 | 현재 createRufitApi는 모든 요청에 Bearer를 요구하고 credentials=omit/redirect=error를 적용 | 로그인 전 login-attempts/session-exchanges 및 refresh/logout용 별도 인증 transport 필요. 업무 API의 Bearer 필수 보호를 전역적으로 풀지 않음 |
| A03 | v0.2 account.id는 길이를 가정하지 않는 불투명 문자열. 현재 session.ts와 connectedStorage.ts는100자를 초과하면 거절 | BE가 길이 상한을 계약으로 정하거나 FE 두 곳을 함께 조정해야 함. 이 검토에서 임의 제한 제거/계정키 변경하지 않음 |
| A04 | createRufitSession은 생성 때 토큰 하나를 캡처하고 /me를 검증 | refresh 뒤 전역 getter만 교체해도 기존 세션은 갱신되지 않음. 같은 /me.id와서버를 재확인한 새 세션 facade로 교체하는 흐름을 설계 |
| A05 | 기존 scope분리와 session.close는 있지만 로그인·refresh·보안저장·앱복귀를 아우르는 epoch 조정자는 없음 | 비동기 응답뿐 아니라 보안저장 쓰기/삭제도 같은 세대 검사·직렬화 대상. close가 이미 전송된 요청을 취소한다고 가정하지 않음 |
| A06 | WEB은 예약값이고 현재 업무 API는 credentials=omit | 쿠키 BFF/CSRF/Origin 계약을 별도로 정할 때까지 활성화하지 않음. 모바일 토큰 JSON을 localStorage로 옮기는 구현 금지 |
| A07 | 토큰 문자열 최대길이·로그인 시도/토큰 수명·refresh grant 범위·오프라인 폐기 정책 미정 | 플랫폼 보관 한계/유실 복구 및 표시 문구를 검증하려면 수치와 상태 계약을 먼저 명시 |

A01은 표준 AuthRequest의 state/PKCE 처리와 커스텀 handoff를 구분해야 한다는 FE 해석이다. AuthSession API는 OAuth 요청·응답을 다루며,v0.2의 camelCase 세션 JSON을 표준 token response로 자동 처리하지 않는다. [Expo AuthSession57](https://docs.expo.dev/versions/v57.0.0/sdk/auth-session/).

## 3. 플랫폼별 앱 복귀

| 플랫폼 | 가능한 연결 후보 | 미확정/실제 확인할 것 |
|---|---|---|
| iOS | ASWebAuthenticationSession을 쓰는 openAuthSessionAsync. 기본은등록된 custom scheme;SDK57의 preferUniversalLinks는iOS17.4+·Associated Domains 조건으로 HTTPS 복귀 지원 | 지원 OS하한,선택할scheme/도메인·경로,Associated Domains/AASA,정상·취소·앱종료중복귀. 일반 SFSafariViewController와 인증세션을 혼용하지 않음 |
| Android | 시스템 Custom Tabs와검증된앱복귀. 앱 링크를 택하면intentFilters/autoVerify와서명별assetlinks 설정 | 배포/개발서명,설치유무,기본브라우저·뒤로가기·최근앱·프로세스재생성. 브라우저 열림 자체를 로그인 성공으로 처리하지 않음 |
| Web | 향후 BFF/별도 SPA 계약에서재검토 | popup의사용자제스처·동일Origin 완료·HTTPS 조건은별도. 모바일adapter재사용으로WEB지원완료를선언하지않음 |

위 브라우저 API/옵션 조건은 [Expo WebBrowser57](https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/) 기준이다. iOS HTTPS 복귀를 선호하더라도실제 연결 권한/서명검증은 별도이며,문서 옵션 존재가 RuFit에서의 동작증거는 아니다.

- iOS: 앱과 웹 도메인 연결에는 AASA와 associatedDomains/서명이 필요하다. [Expo Universal Links](https://docs.expo.dev/linking/ios-universal-links/).
- Android: 앱 패키지·SHA256 서명지문을 assetlinks.json과 연결하고 실제 설치 후 검증해야 한다. [Expo Android App Links](https://docs.expo.dev/linking/android-app-links/).
- custom scheme 변경은 새 개발 빌드가 필요하다. 종료 상태 복귀는 getInitialURL,실행 중 복귀는 URL 이벤트 경로를 구분한다. 인증 브라우저의 내부 이벤트 처리와 별도 리스너가 같은 교환을 중복 실행하지 않도록 단일 처리 관문을 둔다. [Expo Linking](https://docs.expo.dev/linking/into-your-app/).

## 4. 제공자 경계

| 항목 | FE 판단 |
|---|---|
| Google | 제공자→BE HTTPS code callback을 채택하면Google Web Server 흐름의등록유형·redirect·secret요건을대조해야한다. 초안 client=IOS/ANDROID는RuFit복귀분류이며GoogleOAuth등록유형과동일값이아님 |
| Kakao | 공식 OIDC discovery 표는S256을명시한다. REST키·OIDC설정·nonce/state·서버callback조합을BE가검증해야하며네이티브키와동일하게취급하지않음 |
| 대안 SDK | Google/Kakao 네이티브SDK를선택하면증명을서버에보내는경로·audience·nonce계약을별도로정의. 현재서버code중계초안에SDK토큰을임의로대입하지않음 |
| 계정 | 제공자ID토큰/제공자APIaccess/RuFitAPIaccess는서로다름. /me.id로서버+계정공간을정하며email/sub나profile404로신규계정·병합을판정하지않음 |

Google 판단은 [Google Web Server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)의 서버 callback 등록요건을 RuFit 후보안에 적용한 해석이다. Kakao 지원 표는 [Kakao REST/OIDC](https://developers.kakao.com/docs/ko/kakaologin/rest-api)에서 확인했으며,실제 앱 등록값이나 선택한 요청 조합을 시험한 것은 아니다.

## 5. 앱 시작 PKCE와 일회용 handoff

제공자용 PKCE/nonce/state는 BE 영역이다. FE가 생성하는 verifier는 **앱 시작→handoff 교환**에만 사용한다. 두 verifier를 공유하거나AuthRequest가만든제공자값으로대체하지않는다.

FE 구현 후보:

1. 로그인 조작 시 authEpoch와 별도 loginAttempt 세대를 잡고 암호학적 난수로verifier를 만든다.43~128허용문자·S256변환을검사하고challenge만시작요청에보낸다.
2. 서버 응답 attemptId/expiresAt를시작한provider/client/returnRoute/서버주소와결합한다. 인가URL도등록된제공자·HTTPS범위로검증한다.
3. 브라우저를열기전활성시도를저장한다. 메모리만쓰면프로세스종료시복구가안되므로,복구를원하면짧은TTL의별도SecureStore시도레코드가필요하다. 저장실패때보호없는AsyncStorage로대체하지않는다.
4. 복귀는등록된scheme/host/path와현재attempt/세대/만료를검사하고,중복값·code와error동시전달등을거부한다. URL에있는verifier/challenge로원래값을바꾸지않는다.
5. 성공·취소·만료·교환불명확을한관문에서처리한다. 같은attempt의동시복귀는한교환만전송한다. 콜백URL전체나비밀을로그·분석이벤트·운동아카이브에남기지않는다.
6. cold start에서기존시도가없거나이미exchanging이었다면v0.2유실정책대로새로그인으로복구한다. 로그인취소는운동원문을삭제하지않는다.

이 절은 구현 제안이며 API 추가/활성화가 아니다. 단순 URL 소유만으로 정품 앱을 증명할 수 없다는 BE v0.2 경계를 유지한다.

## 6. 토큰 보관과 교체

| 자료 | 후보 보관 위치/정책 |
|---|---|
| 일시 verifier | 짧은TTL·시도전용SecureStore 레코드. 종료/취소/만료후삭제. URL·로그·운동초안금지 |
| RuFit refresh | 서버주소+검증된계정/세션에묶인플랫폼보안저장소. 제공자refresh와별개 |
| access | 활성세션메모리 우선후보. 재시작복원정책은refresh/보안저장계약과함께결정 |
| 저장 실패 | 인증완료를조용히영속화성공으로표시하지않음. 이미회전된refresh의로컬쓰기실패는기존refresh재사용으로되돌리지않고재로그인경로 |
| Web | SecureStore동등보관소가없음. 별도계약전까지비활성 |

SecureStore는Android Keystore기반보호와iOS Keychain을제공하지만,iOS재설치후잔존가능/Android삭제·백업복원제약/생체설정변경시읽기불가/큰값쓰기실패를고려해야한다. 고정2048바이트공통한도로단정하지않고실제네이티브오류와서버토큰상한을시험한다. [Expo SecureStore57.0.4 문서](https://docs.expo.dev/versions/latest/sdk/securestore/).

FE 제안은 세션 메타+토큰을 한 레코드로 직렬 저장하고 성공 후 활성 참조를 교체하는 것이다. SecureStore 호출 하나가 여러 키·서버 회전·프로세스 중단까지 원자적으로 보장한다는 뜻은 아니다. requireAuthentication과키체인접근시점은잠금상태/백그라운드갱신/사용자프롬프트요구에따라PM이선택해야한다. 보안저장소읽기불가를곧바로서버만료로분류하지않는다.

## 7. refresh 동시 요청과 응답 유실

| 상황 | FE 처리 후보 |
|---|---|
| 같은서버·계정·sessionId·epoch의여러401 | 하나의공유Promise로갱신합류. 앱Foreground작업과다른화면요청도같은조정자사용 |
| 정상갱신 | 동일계정/sessionId확인→보안저장직렬교체→현재세대확인→검증된새세션으로참조교체 |
| logout/계정변경뒤늦은성공 | 새세대의메모리·디스크·UI를바꾸지못하게차단. 응답무시만으로이전비동기쓰기부활이해결되는것은아님 |
| timeout/연결단절/응답JSON손상 | 서버가회전했는지모르면기존refresh자동재전송금지. v0.2의보관없는후보는재로그인 |
| 명확한전송전실패 | 전송되지않았다는증거가있는경우만재시도후보. 일반fetch예외/Abort/timeout은그증거가아님 |
| 과거refresh재사용 | SESSION_EXPIRED처리와연결된grant철회범위를BE가확정. 정상유실인지탈취인지FE가단정하지않음 |
| 503키/제공자장애 | 인증정보오류와구분. 운동원문/큐보존,무한refresh/업무변경재시도금지 |

공개 클라이언트의 refresh 회전/재사용 탐지와 연관 토큰 철회는 [RFC9700 §4.14](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2)를 근거로 BE 정책과 일치시켜야 한다. 새 Idempotency-Key나결과복구API를FE가추가가정하지않는다.

업무 API와 인증 갱신은 별개다. GET은현재세션확인후재조회후보지만,휴식±10/세트복제같은변경은새version으로자동재실행하지않는다. 기존 draft의원래operationId/원문/확인계약을보존한다. 현재HTTP계층의TIMEOUT/NETWORK_ERROR는‘전송전실패’확정값이아니다.

## 8. logout epoch와 기기 기록

1. 로그아웃/계정전환즉시authEpoch를증가시키고이전로그인시도/갱신/업무요청의새공간반영을차단한다. 기존세션close는재사용하되별도의전체조정자가필요하다.
2. 보안저장쓰기·삭제를같은큐로직렬화하고작업시작/완료에서세대를확인한다. 오래된refresh쓰기뒤logout삭제가유실되거나,오래된삭제가새로그인토큰을지우지않도록시험한다.
3. refresh폐기요청과로컬비밀제거결과를구분한다. 오프라인/응답유실에서서버폐기완료를말하지않고,로컬비밀삭제실패도정상로그아웃완료로숨기지않는다. 삭제실패·프로세스종료후자동복원정책은별도확정사항이다.
4. logout204는현재refresh세션의폐기다. 기존access즉시철회/모든기기종료/소셜동의철회/운동자료삭제를뜻하지않는다.
5. 서버주소+/me.id 저장공간과기존익명기록·outbox·복구자료를보존한다. 새로그인/같은이메일만으로자동업로드·이전하지않는다. account.id와/me.id가다르면공간을열지않고검증실패처리한다.

## 9. 구현 전 결정 및 시험 인계

| 우선순위 | PM/BE 결정 |
|---|---|
| 먼저 | 자체세션+서버code중계채택여부,각플랫폼복귀scheme/도메인/OS범위,실제제공자등록유형 |
| 먼저 | account.id 상한계약(A03),토큰최대길이·TTL,attemptTTL/동시시도제한 |
| 먼저 | refresh grant범위/재사용철회/응답유실재로그인채택,서버미확인logout문구 |
| Web 전 | BFF/SPA선택,쿠키/CSRF/Origin/다중탭갱신계약 |
| 기능 후 | 실제개발빌드의정상·취소·만료·cold start·중복URL/앱복귀와보안저장실패시험 |

FE 구현 때 필요한 검증: 다른attempt/verifier교차거절,중복handoff한번전송,회전중여러401합류,응답유실재전송차단,logout직후늦은응답·디스크쓰기·삭제역전차단,같은계정재인증scope유지,다른계정자료비이전,보안저장읽기/쓰기/삭제실패,프로세스중단복구,오래된성공뒤늦은실패의새세션보존. 이 검토에서는 어느 인증 런타임 시험도 실행하지 않았다.

현재 판정은 **문서/코드 호환성 검토 완료**다. API 확정·인증 보안 인증·실제 소셜 로그인 완료·외부 등록 완료가 아니다. BE 코드를 기다리는 동안 모의 transport/state 시험을 준비할 수 있지만,신규 로그인 구현 배정은 PM 계약 결정 이후 별도 단위로 진행한다.
