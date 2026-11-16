import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

/** JournalComposer의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const js = StyleSheet.create({
  empty: {
    backgroundColor: tokens.color.bg.surface,
    borderRadius: tokens.radius.xl,
    minHeight: 300,
    padding: tokens.space[24],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pickRow: {
    flexDirection: 'row',
    gap: tokens.space[12],
    marginTop: tokens.space[16],
    alignSelf: 'stretch',
  },
  cover: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.color.line.input,
  },
  thumbs: { flexDirection: 'row', gap: tokens.space[8], flexWrap: 'wrap' },
  thumbItem: { width: 56, height: 56 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.color.line.input,
  },
  thumbOn: { borderWidth: 2, borderColor: tokens.color.text.primary },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.color.bg.inverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.color.line.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notice: {
    backgroundColor: tokens.color.bg.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space[16],
    gap: 2,
  },
});
