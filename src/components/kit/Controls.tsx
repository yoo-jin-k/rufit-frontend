/** Figma 입력 부품(Input·Chip·SegmentItem·Toggle·Checkbox)입니다. 모두 눌리는 영역 44pt 이상을 지킵니다. */
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { AppIcon, type IconName } from '../AppIcon';
import { text, tokens } from '../../theme/tokens';
import { s } from './Controls.styles';

const c = tokens.color;

/**
 * Figma Input(높이 52, 모서리 12)입니다. 입력 중에는 검정 테두리, 오류가 있으면 빨간 테두리와 빨간 도움말을 보여 줍니다.
 * secure를 주면 오른쪽 눈 아이콘으로 비밀번호를 보이거나 숨길 수 있습니다.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  trailing,
  helper,
  error,
  secure = false,
  keyboardType,
  maxLength,
  multiline = false,
  accessibilityLabel,
  inputProps,
  style,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  icon?: IconName;
  /** 오른쪽 작은 글자(글자 수·단위 등)입니다. */
  trailing?: string;
  helper?: string;
  error?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  multiline?: boolean;
  accessibilityLabel?: string;
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText'>;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const message = error || helper;
  return (
    <View style={[s.field, style]}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <View style={[s.box, multiline && s.multiline, focused && s.boxFocus, !!error && s.boxError]}>
        {icon && <AppIcon name={icon} color={value ? c.text.primary : c.text.muted} />}
        <TextInput
          {...inputProps}
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.text.muted}
          secureTextEntry={secure && !shown}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            inputProps?.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps?.onBlur?.(e);
          }}
          style={[s.input, multiline && s.inputMultiline]}
        />
        {!!trailing && <Text style={s.trailing}>{trailing}</Text>}
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? '비밀번호 숨기기' : '비밀번호 보기'}
            onPress={() => setShown((v) => !v)}
            hitSlop={12}
          >
            <AppIcon name="eye" color={shown ? c.text.primary : c.text.muted} />
          </Pressable>
        )}
      </View>
      {!!message && (
        <Text
          accessibilityLiveRegion={error ? 'polite' : undefined}
          style={[s.helper, !!error && s.helperError]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

/** Figma Chip: 높이 36의 둥근 선택 단추입니다. 선택되면 검정 바탕에 흰 글자로 바뀝니다. */
export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={onPress}
      hitSlop={4}
      style={[s.chip, selected && s.chipOn]}
    >
      <Text style={[text.captionBold, { color: selected ? c.text.inverse : c.text.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 칩을 가로로 늘어놓습니다. 화면보다 길면 옆으로 넘겨 볼 수 있습니다. */
export function ChipRow({ children, wrap = false }: { children: ReactNode; wrap?: boolean }) {
  if (wrap) return <View style={[s.chipRow, s.chipWrap]}>{children}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chipRow}
      style={s.chipScroll}
    >
      {children}
    </ScrollView>
  );
}

/** Figma SegmentItem 묶음: 회색 바탕 안에서 하나만 검정으로 선택됩니다. 항목은 같은 폭으로 나눕니다. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={s.segment}>
      {items.map((item) => {
        const on = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            onPress={() => onChange(item.value)}
            style={[s.segmentItem, on && s.segmentOn]}
          >
            <Text style={[text.captionBold, { color: on ? c.text.inverse : c.text.secondary }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Figma Toggle(48×28)입니다. 켜지면 검정, 꺼지면 회색입니다. */
export function Toggle({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={10}
      style={[s.toggle, value && s.toggleOn, disabled && s.dimmed]}
    >
      <View style={[s.knob, value && s.knobOn]} />
    </Pressable>
  );
}

/** Figma Checkbox: 네모(20) 또는 동그라미(24)입니다. 체크되면 검정 바탕에 흰 체크를 그립니다. */
export function CheckMark({
  checked,
  shape = 'circle',
  size,
}: {
  checked: boolean;
  shape?: 'square' | 'circle';
  size?: number;
}) {
  const box = size ?? (shape === 'square' ? 20 : 24);
  return (
    <View
      style={[
        s.check,
        { width: box, height: box, borderRadius: shape === 'square' ? 5 : box / 2 },
        checked && s.checkOn,
      ]}
    >
      {checked && (
        <AppIcon name="check" size={box * 0.7} color={c.text.inverse} strokeWidth={2.2} />
      )}
    </View>
  );
}

/** 글자와 함께 누르는 체크 항목입니다(로그인 상태 유지·약관 동의 등). */
export function CheckRow({
  label,
  checked,
  onChange,
  bold,
  shape = 'square',
  right,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  bold?: boolean;
  shape?: 'square' | 'circle';
  right?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={() => onChange(!checked)}
      style={s.checkRow}
    >
      <CheckMark checked={checked} shape={shape} />
      <Text style={[bold ? text.calloutBold : text.callout, { color: c.text.primary, flex: 1 }]}>
        {label}
      </Text>
      {right}
    </Pressable>
  );
}
