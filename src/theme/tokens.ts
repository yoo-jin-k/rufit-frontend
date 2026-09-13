// 스타일 값의 단일 원본. 웹 Sass 변수도 여기서 생성하므로 생성된 CSS는 직접 수정하지 않는다.
// 이번에는 기존 공통 버튼 수치만 추출한다. DS-01의 새 시각 규격은 후속 기능에서 추가한다.
export const colors = {
  background: '#F5F6F8', surface: '#FFFFFF', text: '#18232B',
  muted: '#697880', primary: '#246B53', border: '#E2E8E5',
  primarySoft: '#E7F0EB', onPrimary: '#FFFFFF',
};
export const spacing = {buttonPadding: 14};
export const radius = {button: 14};
export const typography = {button: {fontSize: 16, fontWeight: '700'}} as const;
export const size = {controlMin: 48};
export const interaction = {pressedOpacity: 0.7, disabledOpacity: 0.4};
