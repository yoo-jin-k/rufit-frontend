# DS-01 v1: 세트 입력행과 기기 저장 표시

## 범위
- developer에서 `codex/ds01-set-save`를 만들고 선행 타이머 PR38의3854c64까지 fast-forward로 연결했다. 이번 변경만의 비교 기준은3854c64다.
- 기존 화면에서 SetRow·SetInput 스타일·LocalSaveStatus를 추출한다. 운동/휴식/저장/API 규칙은 그대로 사용하고 새로운 상태 저장소를 만들지 않는다.
- Figma: SetRow40:52, LocalSaveStatus39:34. 공통 토큰과 기존 Button을 재사용한다. RestSetting v1.1은 다음 범위다.

## 구현
| 항목 | 결과 |
|---|---|
| 배치 | 카드 안 실제 onLayout 폭316 미만 또는 fontScale≥1.3이면 입력 두 개와 동작 세 개를 두 행으로 분리 |
| 입력 보존 | 동일한 SetRow key=set.id, 입력 부모와 입력 노드를 유지. 배치 변경은 flex 속성만 변경 |
| 터치 | 완료·삭제·복제 최소48×48. 좁은 화면 동등 폭, 넓은 화면48. 완료한 세트는 체크+primary |
| 입력 스타일 | 16/24,최소48,모서리12,공통 inputBorder/focus/danger. 버튼 compact는 좌우4 패딩만 바꾸며 기본 버튼은 동일 |
| 오류 | 완료 시 기존 validSet을 사용해 필드별 오류를 보여주고 첫 오류로 포커스. 빈 값과 앞자리0 등 원문 유지, 타이핑 차단 없음 |
| 저장 위치 | 제목 다음·운동 요약 앞의 고정된 문서 순서. 일반상태는 caption,실패는 padding16/radius16/gap8 경고 카드 |
| 재시도 | 읽기/쓰기 재시도 구분. 처리 중 버튼 busy/disabled. 새 편집 중에도 최신 성공 전까지 실패 설명 유지 |
| 알림 | 평상시 키 입력마다 저장 성공을 낭독하지 않음. 실패/재시도 전이/복구 성공만 알림. iOS는 AccessibilityInfo, Android/Web은 live region |
| 복구 알림 | 저장 성공 직후 retryPending=false 렌더가 와도 성공 알림이 바로 지워지지 않게 유지 |
| 주변 화면 | 헤더/제목/종목 제목·설명에 확정 typography 적용,종목 카드padding16. 기존 사진과 도메인 동작 유지 |

## 검증
- 타입·린트·스타일 생성물 일치 및127개 테스트 통과. 기존 저장 훅의 비동기 generation·원문 보존 테스트 포함.
- 실제 RNW 컴포넌트 테스트: 읽기/쓰기 재시도 구분,동일 버튼 유지,중복 클릭 차단,실패 설명 유지,연속 복구 렌더의 성공 알림 유지,일상 자동저장 알림 없음.
- iOS/Android/Web export 통과. 실제 기기 실행과 별개다.
- Chrome 320×568/375×667/390×844/430×932/768×1024/1024×768/844×390: 가로 넘침0,동작 버튼48이상,316 내부폭 기준 두 행/한 행 분기,입력 DOM/포커스/선택영역1~3/원문0002·0020/저장 원문 유지.
- 실제 Chrome: 오류 표시와 첫 필드 포커스,복제 후 복사본 편집·삭제 시 원본 유지,완료 세트의 무효 편집 시 완료/휴식 해제.
- 실제 Chrome 장애 주입: 읽기 실패·손상 원문 미덮어쓰기/시작 불가,지속 쓰기 실패에서도 새 운동 허용·history 유지,다시 저장으로 전체 아카이브 복구·리로드 확인.
- 강제 fontScale=1.3 분기/stackActions=true를 전달한 별도 실제 컴포넌트 화면에서 재시도 busy 표시와 입력/동작 세로 배치를 확인했다. 이것은 배치 분기 검사이며 글자 자체를 확대한 실제 OS 검사가 아니다.

## 발견·수정한 회귀
- RNW는 `flex:0`을 웹 shorthand로 전달해 세로 배치의 입력 영역 높이를0으로 만들었다. 입력과 동작 버튼이 겹치는 실제 좌표를 확인한 뒤 flexGrow/flexShrink/flexBasis를 명시하고 세로에서는 내용 높이(auto)를 유지했다.
- 같은 패턴의 RestTimerCard도 조사해 선행 PR38/3854c64에서 수정했다. 그 수정/증거는 docs/ds01-timers.md에 별도로 기록했다.

## 증거 및 한계
- `docs/verification/ds01-set-save/`: layout-results.json, browser-results.json, stacked-fixture-results.json 및 PNG. PNG는 스크롤된 가시 영역이며 이미지 밖 콘텐츠는 앱의 잘림을 뜻하지 않는다.
- `reproduce-layout.cjs.txt`는 실제 브라우저 회귀 검사 스크립트 보관본이다. 별도 Chrome/Playwright와 로컬 웹 빌드8097이 필요하다. 실제 기기 자동검사나 일반 npm test에 포함된 것으로 표시하지 않는다.
- 네이티브 글자 확대1.3/2.0,실제 safe-area·숫자키보드·VoiceOver/TalkBack 검증은 미실시. JSDOM은 레이아웃을 계산하지 않으므로 컴포넌트 알림/버튼 동작만 검사하고 치수 근거로 사용하지 않는다.
- 본 단위는 서버 연결/동기화/백업 기능을 추가하지 않는다. 실패 중 메모리 입력의 프로세스 종료 후 지속성 보장은 기존과 같다.
