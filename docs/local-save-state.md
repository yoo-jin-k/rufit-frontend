# FE-02 · 기기 저장 상태 모델 구현 인계

2026-09-14 · `codex/local-save-state` · 선행 PR35/59e495d.
기능 카드 PR36/7bd1a1d의 SS01~SS11을 PM 수용 범위로 구현했다.

## 변경

| 파일 | 역할 |
| --- | --- |
| archiveState.ts | loading/load-error/saving/saved/save-error, retryPending, unsavedAfterFailure, generation/epoch와 단일 재시도 |
| useLocalWorkoutArchive.ts | 실제 React 훅, 기존 운동/휴식 명령 연결. 상태를 재렌더마다 생성하지 않음 |
| useWorkoutArchive.ts | AsyncStorage + 기존 순차 저장 어댑터 연결 |
| WorkoutScreen.tsx | 기존 위치·스타일 유지, 재시도 처리 중 버튼 비활성만 추가 |

기존 저장 형식과 `createWorkoutStorage` 순차 큐는 변경하지 않았다. 오류를 초기화/삭제로 우회하지 않는다. 재시도는 계산된 최신 아카이브를 저장하며 세트완료/정지/휴식조절 명령을 다시 실행하지 않는다. 이미 쓰는 중이면 그 요청에 합류한다.

실패 뒤 새 입력/재시도가 시작돼도 `unsavedAfterFailure`를 유지한다. 최신 generation 성공만 해제한다. 이전 쓰기 결과는 최신 상태를 덮지 않는다. 렌더보다 먼저 재시도 Promise를 잠그므로 연속 호출도 한 번이다.

읽기 Promise는 개발 StrictMode의 effect 재실행 시 공유하며 현 epoch만 결과를 적용한다. 해제된 화면의 늦은 응답은 반영하지 않는다. 재연결 때 진행 중 최신 쓰기를 관찰하지만 쓰기 요청을 재전송하지 않는다. 훅의 storage 인자는 인스턴스 생명주기 동안 고정이며 실제 어댑터는 모듈 수준의 한 인스턴스다. 계정 교체/서버 세션용 저장소로 사용하지 않는다.

새 운동 준비는 기존대로 허용한다. 완료 history와 현재 운동을 포함한 전체 아카이브를 다음 저장에서 보존한다. 실제 쓰기 실패 후 앱 프로세스가 종료되면 아직 디스크에 쓰지 못한 메모리 내용은 보장할 수 없으며, 성공으로 표시하지 않는다.

## 검증

| 범위 | 실행 결과 |
| --- | --- |
| 로컬 전체 검사 | Node24.18.1, 타입·린트·styles:check·테스트117개 통과 |
| 상태 시험11개 | 지연 읽기/재실패/손상 원문/단일 재시도/이전 결과 무시/최신 입력/history/연결 해제·재연결 |
| 실제 훅 시험4개 | React19.2 ReactDOM + JSDOM, StrictMode effect 재실행/연속 호출/재렌더·DOM 포커스/해제 뒤 늦은 읽기 |
| 빌드 | web/iOS/Android export 통과 |
| 실제 웹 화면 | Chrome 독립 프로필, 저장 실패 주입→완료→새 운동 준비/시작→history 유지→재저장→재시작. 읽기 실패/손상 JSON은 시작 불가·재시도만 가능·원문 보존 |
| SS10 한계 | 모델/훅 재렌더와 포커스 보존 확인. 실제 접힘·네이티브 키보드·운영기기 생명주기는 후속 |
| SS12 | 신규 시각·스크린리더 알림/읽기순서 검수는 DS01 최종 화면 단위로 분리. 이번 구현 완료로 표시하지 않음 |

웹 증거: `docs/verification/local-save-state/`. 기기 저장 실패를 테스트 브라우저의 Storage 어댑터에서만 주입했다. 실제 사용자 데이터·기존8081/8093·Backend DB는 건드리지 않았다.

후속: 최종 DS01 명세의 LocalSaveStatus는 명시적 state/unsavedAfterFailure/retryPending을 사용한다. status 문자열을 역추론하지 않는다. 화면 재배치·새스타일·로그인/서버 동기화는 별도 PR이다.
