import { StyleSheet } from 'react-native';

/** RestTimerCard의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  card: {
    backgroundColor: '#111113',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  caption: { fontSize: 12, color: '#BBBBBF' },
  time: { fontSize: 28, fontWeight: '700', color: 'white', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  button: {
    minHeight: 44,
    minWidth: 44,
    padding: 10,
    backgroundColor: '#303034',
    borderRadius: 10,
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '600', color: 'white' },
});
