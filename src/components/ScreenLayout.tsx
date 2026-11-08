/**
 * 화면 폭과 키보드 대응을 공유하는 예전 화면 틀입니다. 새 화면은 kit/Screen을 쓰고,
 * 아직 옮기지 않은 화면도 Figma와 같은 모양이 되도록 상단바·글자·카드·입력칸 값을 Figma 토큰에 맞췄습니다.
 * 고정 영역은 스크롤 밖에 두어 내용과 겹치지 않습니다.
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { size, text, tokens } from '../theme/tokens';
import { NavBar } from './kit/Screen';

const c = tokens.color;
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.bg.default },
  content: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: tokens.size.screenPadding,
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[24],
    gap: tokens.space[16],
    flexGrow: 1,
  },
  title: { ...text.titleL, color: c.text.primary },
  heading: { ...text.headline, color: c.text.primary },
  body: { ...text.body, color: c.text.primary },
  muted: { ...text.caption, color: c.text.secondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[8],
    flexWrap: 'wrap',
  },
  card: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: tokens.space[12] },
  input: {
    ...text.bodyMedium,
    borderWidth: 1,
    borderColor: c.line.input,
    borderRadius: tokens.radius.md,
    minHeight: tokens.size.input,
    paddingHorizontal: tokens.space[16],
    paddingVertical: 12,
    color: c.text.primary,
    backgroundColor: c.bg.default,
  },
  dock: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: tokens.size.screenPadding,
    paddingVertical: tokens.space[12],
    gap: tokens.space[8],
    backgroundColor: c.bg.default,
  },
  error: { ...text.caption, color: c.danger.default },
  line: { height: 1, backgroundColor: c.line.default },
});
export function ScreenLayout({
  children,
  footer,
  title,
  onBack,
  safeTop = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  title?: string;
  onBack?: () => void;
  /** 탭 안에 바로 놓이는 화면은 위쪽 안전 영역(노치)을 직접 비웁니다. 모달 안에서는 감싼 쪽이 맡습니다. */
  safeTop?: boolean;
}) {
  const body = (
    <KeyboardAvoidingView style={ui.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {title && (
        <View style={[ui.dock, { paddingVertical: 0 }]}>
          <NavBar title={title} leading={onBack ? 'back' : 'none'} onLeading={onBack} />
        </View>
      )}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
        {children}
      </ScrollView>
      {footer && <View style={ui.dock}>{footer}</View>}
    </KeyboardAvoidingView>
  );
  return safeTop ? <SafeAreaView edges={['top']} style={ui.page}>{body}</SafeAreaView> : body;
}
