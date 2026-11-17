import { StyleSheet } from 'react-native';
import { colors, size, spacing, text, typography, tokens, radius } from '../../theme/tokens';

/** AuthModal의 정적 스타일입니다. 웹과 네이티브에서 같은 토큰과 수치를 사용합니다. */
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  content: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingTop: spacing.md,
    gap: spacing.xxl,
  },
  title: { ...text.titleM, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary },
  heading: { ...typography.heading, color: colors.text },
  caption: { ...typography.caption, color: colors.textSecondary },
  providers: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: spacing.md },
  // 카카오는 공식 버튼 이미지를, Google은 표준 G 로고와 글자를 Figma 버튼 높이(56)·모서리(14)에 맞춰 가운데 둡니다.
  providerButton: {
    height: tokens.size.buttonLg,
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.lg,
  },
  kakao: { backgroundColor: tokens.color.brand.kakao },
  google: {
    backgroundColor: tokens.color.bg.default,
    borderWidth: 1,
    borderColor: tokens.color.line.input,
  },
  kakaoImage: { height: tokens.size.buttonLg, width: 238, maxWidth: '100%' },
  googleContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  googleText: { ...typography.button, fontWeight: '600', color: colors.text },
  providerDisabled: { opacity: 0.45 },
  providerPressed: { opacity: 0.76 },
  status: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.status,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorStatus: { backgroundColor: colors.dangerSurface },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  demo: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.inputBorder,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  localNotice: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
