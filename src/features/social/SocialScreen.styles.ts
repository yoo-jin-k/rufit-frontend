import { StyleSheet } from 'react-native';
import { text, tokens } from '../../theme/tokens';

const c = tokens.color;

/** SocialScreen의 정적 스타일입니다. 세 칸 정사각형 격자와 위쪽 보기 선택 버튼입니다. */
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.bg.default },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.size.screenPadding,
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[12],
  },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  pickerText: { ...text.titleL, color: c.text.primary },
  grid: { gap: 2 },
  row: { gap: 2 },
  tile: { flex: 1 / 3, aspectRatio: 1, backgroundColor: c.bg.surface, overflow: 'hidden' },
  tilePressed: { opacity: 0.85 },
  tileImage: { width: '100%', height: '100%' },
  tileText: { flex: 1, padding: tokens.space[8], justifyContent: 'space-between' },
  // 아래쪽 조회수 표시(높이 약 22 + 여백 6)와 글이 겹치지 않게 그만큼 비워 둡니다.
  tileTextNamed: { paddingBottom: 34 },
  tileDate: { ...text.label, color: c.text.secondary },
  tileSummary: { ...text.captionBold, color: c.text.primary },
  views: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: tokens.radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  viewsText: { ...text.label, color: c.text.inverse },
  state: { padding: tokens.size.screenPadding, gap: tokens.space[12] },
  error: { ...text.caption, color: c.danger.default },
  footer: { padding: tokens.space[16], alignItems: 'center' },
  muted: { ...text.caption, color: c.text.secondary },
});
