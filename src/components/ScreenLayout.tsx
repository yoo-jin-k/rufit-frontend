/** 화면 폭과 키보드 대응을 공유합니다. 고정 영역은 스크롤 밖에 두어 내용과 겹치지 않습니다. */
import { NotificationButton } from './NotificationButton';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { colors, size } from '../theme/tokens';
import { AppIcon } from './AppIcon';
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    padding: 20,
    gap: 24,
    flexGrow: 1,
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  heading: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 23, color: colors.text },
  muted: { fontSize: 13, lineHeight: 21, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  card: { backgroundColor: colors.primarySoft, borderRadius: 18, padding: 18, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 50,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  dock: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: colors.surface,
  },
  error: { fontSize: 14, lineHeight: 22, color: colors.danger },
  line: { height: 1, backgroundColor: colors.border },
});
export function ScreenLayout({
  children,
  footer,
  title,
  onBack,
}: {
  children: ReactNode;
  footer?: ReactNode;
  title?: string;
  onBack?: () => void;
}) {
  return (
    <KeyboardAvoidingView style={ui.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
        {title && (
          <View style={ui.between}>
            {onBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="뒤로"
                onPress={onBack}
                style={{ padding: 10 }}
              >
                <AppIcon name="back" color={colors.text} />
              </Pressable>
            )}
            <Text style={ui.heading}>{title}</Text>
            <NotificationButton />
          </View>
        )}
        {children}
      </ScrollView>
      {footer && <View style={ui.dock}>{footer}</View>}
    </KeyboardAvoidingView>
  );
}
