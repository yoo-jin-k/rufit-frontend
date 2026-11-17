import { StyleSheet } from 'react-native';

/** EmailAccountPanel의 정적 스타일입니다. */
export const s = StyleSheet.create({
  wrap: { gap: 4 },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  linkDisabled: { opacity: 0.45 },
  linkPressed: { opacity: 0.6 },
});
