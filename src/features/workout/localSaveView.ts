import type {SavePhase} from './archiveState.ts';
export type LocalSaveInput = {state: SavePhase; ready: boolean; retryPending: boolean; unsavedAfterFailure: boolean};
// 저장소의 명시적 상태만 읽는다. 문구로 실패 여부를 역추론하거나 도메인 동작을 재실행하지 않는다.
export function localSaveView(value: LocalSaveInput) {
  const loadFailure = !value.ready && (value.state === 'load-error' || value.retryPending);
  const saveFailure = value.ready && (value.state === 'save-error' || value.unsavedAfterFailure);
  const warning = loadFailure || saveFailure;
  const processing = value.retryPending || value.state === 'saving';
  const title = loadFailure ? value.retryPending ? '다시 불러오는 중…' : '기록을 불러오지 못했어요.'
    : saveFailure ? processing ? '다시 저장 중…' : '기기에 저장하지 못했어요.'
    : value.state === 'loading' ? '기기 기록을 불러오는 중…' : value.state === 'saving' ? '기기에 저장 중…' : '기기에 저장됨';
  const description = loadFailure ? '기존 저장 데이터를 덮어쓰지 않았어요.'
    : saveFailure ? '입력은 현재 화면에 남아 있어요. 앱을 닫기 전에 다시 저장해 주세요.' : '';
  return {warning, title, description, retryLabel: loadFailure ? '다시 불러오기' : '다시 저장',
    loadingLabel: loadFailure ? '다시 불러오는 중…' : '다시 저장 중…',
    retryDisabled: processing, retryLoading: value.retryPending, saved: value.ready && value.state === 'saved'};
}
// 실패·재시도 전이 및 실패 복구 성공만 알린다. 평상시 자동저장 성공은 키 입력마다 낭독하지 않는다.
export function saveAnnouncement(previous: ReturnType<typeof localSaveView> | null, next: ReturnType<typeof localSaveView>) {
  if (next.warning && (!previous?.warning || previous.title !== next.title)) return `${next.title} ${next.description}`;
  if (previous?.warning && next.saved) return next.title;
  return '';
}
