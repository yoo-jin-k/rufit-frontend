/** Figma 표시 부품(카드·목록 행·아바타·사진 자리·대화상자·시트·토스트·로고)입니다. */
import { useEffect, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppModal } from '../AppModal';
import { AppIcon, type IconName } from '../AppIcon';
import { Button } from '../Button';
import { text, tokens } from '../../theme/tokens';

const c = tokens.color;

/** 회색 바탕 카드(모서리 16)입니다. onPress를 주면 누를 수 있는 카드가 됩니다. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  tone = 'surface',
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** surface: 회색, inverse: 검정 강조 카드, outline: 흰 바탕 테두리 카드입니다. */
  tone?: 'surface' | 'inverse' | 'outline';
  style?: StyleProp<ViewStyle>;
}) {
  const look = [s.card, tone === 'inverse' && s.cardInverse, tone === 'outline' && s.cardOutline, style];
  if (!onPress) return <View style={look}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [look, pressed && s.pressed]}
    >
      {children}
    </Pressable>
  );
}

/** 큰 숫자 옆에 작은 단위를 붙여 씁니다(예: 52 분, 3,844 kg). */
export function Stat({
  value,
  unit,
  size = 'titleL',
  color = c.text.primary,
}: {
  value: string;
  unit?: string;
  size?: 'display' | 'titleL' | 'titleM' | 'headline';
  color?: string;
}) {
  return (
    <Text style={[text[size], { color }]}>
      {value}
      {!!unit && <Text style={[text.caption, { color: color === c.text.primary ? c.text.secondary : color }]}> {unit}</Text>}
    </Text>
  );
}

/** 목록 묶음: 회색 바탕 안에 행을 쌓고 행 사이에 구분선을 둡니다(설정 화면). */
export function ListGroup({ children }: { children: ReactNode }) {
  const rows = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={s.group}>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 && <View style={s.divider} />}
          {row}
        </View>
      ))}
    </View>
  );
}

/** Figma ListRow(높이 56): 아이콘, 항목 이름, 오른쪽 값과 화살표 또는 토글을 둡니다. */
export function ListRow({
  label,
  icon,
  value,
  trailing = 'chevron',
  onPress,
  danger = false,
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  icon?: IconName;
  value?: string;
  trailing?: 'chevron' | 'none' | ReactNode;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const content = (
    <>
      {icon && <AppIcon name={icon} color={danger ? c.danger.default : c.text.primary} />}
      <Text style={[text.bodyMedium, s.rowLabel, { color: danger ? c.danger.default : disabled ? c.text.muted : c.text.primary }]}>
        {label}
      </Text>
      {!!value && <Text style={[text.callout, { color: c.text.secondary }]}>{value}</Text>}
      {trailing === 'chevron' ? (
        <AppIcon name="chevron-right" color={c.text.muted} />
      ) : trailing === 'none' ? null : (
        trailing
      )}
    </>
  );
  if (!onPress) return <View style={s.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${label}, ${value}` : label)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

/** 작은 회색 글자 묶음 제목입니다(설정의 운동·데이터·정보 등). */
export function GroupLabel({ children }: { children: string }) {
  return <Text style={[text.label, { color: c.text.secondary, marginBottom: -4 }]}>{children}</Text>;
}

/** Figma Avatar: s(44)·m(64)·l(96). 사진이 없으면 이름 첫 글자, 이름도 없으면 사람 아이콘을 보여 줍니다. */
export function Avatar({
  name,
  size = 's',
  photo,
}: {
  name?: string;
  size?: 's' | 'm' | 'l' | number;
  /** 사진을 그릴 요소입니다. 사진 불러오기는 호출하는 화면이 맡습니다. */
  photo?: ReactNode;
}) {
  const box = typeof size === 'number' ? size : { s: 44, m: 64, l: 96 }[size];
  const initial = name?.trim().charAt(0);
  return (
    <View
      accessible={false}
      style={[
        s.avatar,
        { width: box, height: box, borderRadius: box / 2 },
        initial && !photo ? s.avatarInitial : s.avatarEmpty,
      ]}
    >
      {photo ??
        (initial ? (
          <Text style={[box >= 64 ? text.titleM : text.calloutBold, { color: c.text.primary }]}>{initial}</Text>
        ) : (
          <AppIcon name="person" size={box * 0.42} color={c.text.secondary} />
        ))}
    </View>
  );
}

/** Figma Placeholder/Photo: 사진이 없거나 아직 불러오지 않은 자리입니다. */
export function PhotoPlaceholder({ style, radius = tokens.radius.xl }: { style?: StyleProp<ViewStyle>; radius?: number }) {
  return (
    <View accessible={false} style={[s.photo, { borderRadius: radius }, style]}>
      <AppIcon name="image" color={c.text.muted} />
    </View>
  );
}

/** 빈 상태 카드: 동그란 아이콘, 제목, 설명을 가운데 정렬로 보여 줍니다. */
export function EmptyCard({ icon, title, body, hint }: { icon: IconName; title: string; body?: string; hint?: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <AppIcon name={icon} color={c.text.secondary} />
      </View>
      <Text style={[text.headline, { color: c.text.primary, textAlign: 'center' }]}>{title}</Text>
      {!!body && <Text style={[text.caption, { color: c.text.secondary, textAlign: 'center' }]}>{body}</Text>}
      {!!hint && <Text style={[text.label, { color: c.text.muted, textAlign: 'center' }]}>{hint}</Text>}
    </View>
  );
}

/** 회색 안내 상자입니다(제목 한 줄 + 설명). */
export function Notice({ title, body, icon }: { title?: string; body?: string; icon?: IconName }) {
  return (
    <View style={s.notice}>
      {icon && <AppIcon name={icon} size={16} color={c.text.primary} />}
      <View style={{ flex: 1, gap: 2 }}>
        {!!title && <Text style={[text.captionBold, { color: c.text.primary }]}>{title}</Text>}
        {!!body && <Text style={[text.label, { color: c.text.secondary }]}>{body}</Text>}
      </View>
    </View>
  );
}

/** 달성률 막대입니다. 채워진 부분은 포인트 색입니다. */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={s.track}
    >
      <View style={[s.fillBar, { width: `${percent}%` }]} />
    </View>
  );
}

/**
 * Figma Dialog(폭 338, 모서리 24): 제목, 설명, 버튼 두 개입니다.
 * tone이 danger면 확인 버튼이 빨간색입니다. 바깥이나 뒤로가기는 취소와 같습니다.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel = '취소',
  confirmLabel = '확인',
  tone = 'default',
  onCancel,
  onConfirm,
  busy,
}: {
  visible: boolean;
  title: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <AppModal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.dim}>
        <Pressable accessibilityLabel={cancelLabel} style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View accessibilityViewIsModal style={s.dialog}>
          <Text accessibilityRole="header" style={[text.headline, s.center]}>
            {title}
          </Text>
          {!!message && <Text style={[text.callout, s.center, { color: c.text.secondary }]}>{message}</Text>}
          <View style={s.dialogActions}>
            <Button title={cancelLabel} variant="soft" size="md" fullWidth={false} style={s.flex} onPress={onCancel} />
            <Button
              title={confirmLabel}
              variant={tone === 'danger' ? 'danger' : 'primary'}
              size="md"
              fullWidth={false}
              style={s.flex}
              loading={busy}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </AppModal>
  );
}

/** 아래에서 올라오는 시트입니다(모서리 24, 손잡이 막대, 제목과 닫기). 내용과 버튼은 children으로 넣습니다. */
export function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AppModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.sheetDim}>
        <Pressable accessibilityLabel="닫기" style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} accessibilityViewIsModal style={s.sheet}>
          <View style={s.grabber} />
          <View style={s.sheetHead}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text accessibilityRole="header" style={[text.titleM, { color: c.text.primary }]}>
                {title}
              </Text>
              {!!subtitle && <Text style={[text.caption, { color: c.text.secondary }]}>{subtitle}</Text>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={12}>
              <AppIcon name="close" color={c.text.secondary} />
            </Pressable>
          </View>
          <View style={s.sheetBody}>{children}</View>
        </SafeAreaView>
      </View>
    </AppModal>
  );
}

/** Figma Toast: 검정 둥근 알림입니다. 정해진 시간이 지나면 onHide로 스스로 사라집니다. */
export function Toast({ message, onHide, duration = 2400 }: { message: string; onHide: () => void; duration?: number }) {
  useEffect(() => {
    const timer = setTimeout(onHide, duration);
    return () => clearTimeout(timer);
  }, [message, onHide, duration]);
  return (
    <View pointerEvents="none" style={s.toastWrap}>
      <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.toast}>
        {message}
      </Text>
    </View>
  );
}

/** 루핏 로고 마크 B안입니다. 점은 포인트 색입니다. */
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 52) / 44} viewBox="0 0 44 52" accessibilityLabel="루핏">
      <Path
        d="M6.01242 51.6894V23.8137C6.01509 19.9656 7.28668 16.2258 9.63021 13.1737C11.9737 10.1216 15.2584 7.92747 18.9753 6.93132C22.6922 5.93516 26.6338 6.19256 30.1896 7.66364C33.7454 9.13471 36.7168 11.7373 38.6435 15.0683"
        stroke={c.text.primary}
        strokeWidth={12.0248}
        fill="none"
      />
      <Circle cx={37.8509} cy={45.677} r={6.0124} fill={c.accent.default} />
    </Svg>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center', color: c.text.primary, width: '100%' },
  pressed: { opacity: 0.85 },
  card: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: tokens.space[8] },
  cardInverse: { backgroundColor: c.bg.inverse },
  cardOutline: { backgroundColor: c.bg.default, borderWidth: 1, borderColor: c.line.default },
  group: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, paddingHorizontal: tokens.space[16] },
  divider: { height: 1, backgroundColor: c.line.default },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: tokens.space[12] },
  rowPressed: { opacity: 0.6 },
  rowLabel: { flex: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarInitial: { backgroundColor: c.bg.default, borderWidth: 1, borderColor: c.line.default },
  avatarEmpty: { backgroundColor: c.bg.surface },
  photo: { backgroundColor: '#E4E4E7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  empty: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.xl,
    paddingVertical: tokens.space[24],
    paddingHorizontal: tokens.space[20],
    alignItems: 'center',
    gap: 6,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.bg.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[8],
  },
  notice: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[16],
    paddingVertical: tokens.space[12],
    flexDirection: 'row',
    gap: tokens.space[8],
    alignItems: 'center',
  },
  track: { height: 8, borderRadius: 4, backgroundColor: c.line.default, overflow: 'hidden' },
  fillBar: { height: 8, borderRadius: 4, backgroundColor: c.accent.default },
  dim: { flex: 1, backgroundColor: c.bg.dim, alignItems: 'center', justifyContent: 'center', padding: 32 },
  dialog: {
    width: '100%',
    maxWidth: 338,
    backgroundColor: c.bg.default,
    borderRadius: tokens.radius['2xl'],
    paddingTop: 28,
    paddingHorizontal: tokens.space[20],
    paddingBottom: tokens.space[20],
    gap: tokens.space[8],
    alignItems: 'center',
  },
  dialogActions: { flexDirection: 'row', gap: tokens.space[12], paddingTop: tokens.space[16], width: '100%' },
  sheetDim: { flex: 1, backgroundColor: c.bg.dim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bg.default,
    borderTopLeftRadius: tokens.radius['2xl'],
    borderTopRightRadius: tokens.radius['2xl'],
    paddingHorizontal: tokens.size.screenPadding,
    paddingBottom: tokens.space[8],
    maxHeight: '90%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.line.strong, alignSelf: 'center', marginTop: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 20, paddingBottom: 16 },
  sheetBody: { gap: tokens.space[16] },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 112, alignItems: 'center', paddingHorizontal: 20 },
  toast: {
    ...text.captionBold,
    color: c.text.inverse,
    backgroundColor: c.bg.inverse,
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
    paddingHorizontal: tokens.space[24],
    paddingVertical: 12,
    textAlign: 'center',
  },
});
