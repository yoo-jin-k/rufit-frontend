/**
 * Figma 화면 틀입니다. 위에서부터 상단바(NavBar) 또는 페이지 제목(PageHeader), 스크롤 본문, 하단 고정 영역 순서로 놓습니다.
 * 기준 폭은 iPhone 16 Pro(402pt)이고, 좌우 여백 20을 지키면서 화면 폭에 맞춰 늘거나 줄어듭니다.
 * 넓은 화면(태블릿·웹)에서는 본문 폭을 640으로 제한해 가운데에 둡니다.
 */
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, type IconName } from '../AppIcon';
import { size, text, tokens } from '../../theme/tokens';

const c = tokens.color;

export function Screen({
  children,
  header,
  footer,
  scroll = true,
  gap = tokens.space[16],
  edges = ['top', 'bottom'],
  contentStyle,
  background = c.bg.default,
}: {
  children: ReactNode;
  /** NavBar나 PageHeader처럼 스크롤되지 않는 맨 위 영역입니다. */
  header?: ReactNode;
  /** 화면 아래 고정 버튼 영역입니다. 키보드가 올라오면 함께 올라갑니다. */
  footer?: ReactNode;
  scroll?: boolean;
  gap?: number;
  /** 하단 메뉴가 있는 탭 화면은 아래 안전 영역을 메뉴가 맡으므로 'top'만 넘깁니다. */
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
}) {
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[s.content, { gap }, contentStyle]}
      style={s.fill}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.content, s.fill, { gap }, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={[s.fill, { backgroundColor: background }]}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header && <View style={s.header}>{header}</View>}
        {body}
        {footer && <View style={s.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** 하단 고정 영역 안에서 버튼 두 개를 나란히 둘 때 씁니다. 첫 버튼은 내용 폭, 두 번째 버튼이 남은 폭을 채웁니다. */
export function FooterRow({ children }: { children: ReactNode }) {
  return <View style={s.footerRow}>{children}</View>;
}

/** 상단바의 왼쪽·오른쪽 아이콘 버튼입니다. 눌리는 영역은 44×44입니다. */
export function IconButton({
  icon,
  label,
  onPress,
  color = c.text.primary,
  badge = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  badge?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={s.iconButton}>
      <AppIcon name={icon} color={color} />
      {badge && <View style={s.badge} />}
    </Pressable>
  );
}

/** Figma NavBar: 높이 44, 왼쪽 뒤로·닫기, 가운데 제목, 오른쪽 글자 버튼 또는 아이콘입니다. */
export function NavBar({
  title,
  leading = 'back',
  onLeading,
  trailing,
}: {
  title?: string;
  leading?: 'back' | 'close' | 'none';
  onLeading?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <View style={s.navbar}>
      <View style={s.navSide}>
        {leading !== 'none' && onLeading && (
          <IconButton
            icon={leading === 'back' ? 'chevron-left' : 'close'}
            label={leading === 'back' ? '뒤로' : '닫기'}
            onPress={onLeading}
          />
        )}
      </View>
      {!!title && (
        <Text accessibilityRole="header" numberOfLines={1} style={s.navTitle}>
          {title}
        </Text>
      )}
      <View style={[s.navSide, s.navTrailing]}>{trailing}</View>
    </View>
  );
}

/** 상단바 오른쪽의 글자 버튼(저장·모두 읽음·건너뛰기 등)입니다. */
export function NavText({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={s.navText}
    >
      <Text style={[text.calloutBold, { color: disabled ? c.text.disabled : c.text.primary }]}>{label}</Text>
    </Pressable>
  );
}

/** Figma PageHeader: 탭 화면 맨 위의 큰 제목입니다. 위에 작은 보조 글(날짜 등)과 오른쪽 아이콘을 둘 수 있습니다. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <View style={s.pageHeader}>
      <View style={s.pageTitles}>
        {!!subtitle && <Text style={[text.caption, { color: c.text.secondary }]}>{subtitle}</Text>}
        <Text accessibilityRole="header" style={[text.titleL, { color: c.text.primary }]}>
          {title}
        </Text>
      </View>
      {actions && <View style={s.pageActions}>{actions}</View>}
    </View>
  );
}

/** 섹션 제목 줄입니다. 오른쪽에 보조 글이나 작은 버튼을 둡니다. */
export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={s.section}>
      <Text accessibilityRole="header" style={[text.headline, { color: c.text.primary, flexShrink: 1 }]}>
        {title}
      </Text>
      {typeof right === 'string' ? <Text style={[text.caption, { color: c.text.secondary }]}>{right}</Text> : right}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  content: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: tokens.size.screenPadding,
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[24],
    flexGrow: 1,
  },
  header: { width: '100%', maxWidth: size.contentMax, alignSelf: 'center', paddingHorizontal: tokens.size.screenPadding },
  footer: {
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: tokens.size.screenPadding,
    paddingTop: tokens.space[12],
    paddingBottom: tokens.space[8],
    gap: tokens.space[8],
    backgroundColor: c.bg.default,
  },
  footerRow: { flexDirection: 'row', gap: tokens.space[12], alignItems: 'stretch' },
  iconButton: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.accent.default,
  },
  navbar: { height: tokens.size.navbar, flexDirection: 'row', alignItems: 'center', marginHorizontal: -12 },
  navSide: { width: 88, flexDirection: 'row', alignItems: 'center' },
  navTrailing: { justifyContent: 'flex-end', paddingRight: 4 },
  navTitle: { ...text.headline, color: c.text.primary, flex: 1, textAlign: 'center' },
  navText: { minHeight: tokens.size.touch, justifyContent: 'center', paddingHorizontal: 8 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[8],
    gap: tokens.space[8],
  },
  pageTitles: { flexShrink: 1, gap: 2 },
  pageActions: { flexDirection: 'row', alignItems: 'center', marginRight: -12 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[8] },
});
