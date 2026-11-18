/**
 * 게시물 좋아요 하트입니다. 누르지 않았으면 검정 테두리, 누르면 빨간 하트로 채워지며 살짝 커졌다 돌아옵니다.
 * DoubleTapHeart는 사진을 두 번 연달아 누르면 좋아요를 누르고 사진 가운데에 큰 하트를 잠깐 띄웁니다.
 * 두 번 누르기는 좋아요만 켜고 끄지는 않습니다. 끄기는 하트 버튼으로 합니다.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { text, tokens } from '../theme/tokens';

const native = Platform.OS !== 'web';
const HEART_RED = tokens.color.danger.default;

export function HeartButton({
  liked,
  count,
  disabled,
  onPress,
  showLabel = false,
  size = 26,
}: {
  liked: boolean;
  count: number;
  disabled?: boolean;
  onPress: () => void;
  /** true면 하트 아래에 "좋아요 N개"를 굵게 씁니다. false면 하트 옆에 숫자만 씁니다. */
  showLabel?: boolean;
  size?: number;
}) {
  const reduceMotion = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const was = useRef(liked);
  // 좋아요가 새로 켜질 때만 톡 튀는 움직임을 줍니다.
  useEffect(() => {
    if (liked && !was.current && !reduceMotion)
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 110, useNativeDriver: native }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: native }),
      ]).start();
    was.current = liked;
  }, [liked, reduceMotion, scale]);
  return (
    <View style={{ gap: 2 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}
        accessibilityState={{ selected: liked, disabled }}
        aria-pressed={liked}
        disabled={disabled}
        hitSlop={6}
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <AppIcon
            name="heart"
            size={size}
            color={liked ? HEART_RED : tokens.color.text.primary}
            filled={liked}
          />
        </Animated.View>
        {!showLabel && (
          <Text style={[text.label, { color: tokens.color.text.secondary }]}>{count}</Text>
        )}
      </Pressable>
      {showLabel && (
        <Text style={[text.calloutBold, { color: tokens.color.text.primary }]}>
          좋아요 {count.toLocaleString('ko-KR')}개
        </Text>
      )}
    </View>
  );
}

/** 사진을 감싸 두 번 연달아 누르면(300ms 이내) onDoubleTap을 부르고 큰 하트를 띄웁니다. */
export function DoubleTapHeart({
  onDoubleTap,
  disabled,
  children,
}: {
  onDoubleTap: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const last = useRef(0);
  const [scale] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(0));
  function burst() {
    scale.setValue(reduceMotion ? 1 : 0.3);
    opacity.setValue(1);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: native }),
      Animated.delay(250),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: native }),
    ]).start();
  }
  return (
    <Pressable
      accessibilityLabel="사진 두 번 눌러 좋아요"
      disabled={disabled}
      onPress={() => {
        const now = Date.now();
        if (now - last.current < 300) {
          last.current = 0;
          burst();
          onDoubleTap();
        } else last.current = now;
      }}
    >
      {children}
      <Animated.View
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          transform: [{ scale }],
        }}
      >
        <AppIcon name="heart" size={96} color={tokens.color.text.inverse} filled />
      </Animated.View>
    </Pressable>
  );
}
