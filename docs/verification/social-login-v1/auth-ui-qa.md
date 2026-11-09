# AUTH-Q01~Q05 수정 증거

| QA | 변경 | 자동 확인 |
|---|---|---|
| Q01 | 로그인 계정 화면에도 기기 보관·자동 동기화 없음·앱 재실행 시 재로그인 안내를 상시 표시 | `auth-presentation.test.ts` 문구 검사 |
| Q02 | 저장 실패·세션 만료·변조 복귀·일반 실패를 별도 제목으로 분류하고 명시적 복구 CTA 제공 | 표시 모델 검사, 변조 복귀 후 새 login attempt 검사, 공급자 미지정 시 선택 상태만 복구하는 검사 |
| Q03 | 로그아웃 확인 상태를 모달 열림/닫힘과 계정·공급자 식별자 변경 때 초기화 | reducer와 session key 검사 |
| Q04 | SafeAreaView의 bottom 처리를 제거하고 ScrollView 한 곳에서 `max(inset, designPadding)` 적용 | inset 34/10 단위 검사 |
| Q05 | 공식 영어 Google 이미지의 접근성 이름을 `Sign in with Google`로 통일 | 공급자 접근성 이름 검사 |

Web·iOS·Android 번들 생성은 정적 연결을 확인할 뿐 네이티브 시각 증거가 아니다. 이번 환경에는 iOS/Android 일반 앱 실행 화면과 양수 safe-area inset 캡처가 없어 Q01~Q05의 실제 글자 확대, 스크롤 끝 여백, VoiceOver/TalkBack 낭독은 실기기 검증으로 남긴다. 기존 웹 게스트 화면은 공급자·계정 분기를 렌더링하지 않으므로 모바일 성공 화면 증거로 재사용하지 않는다.
