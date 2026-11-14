/**
 * 종목 동작 사진입니다. 상세 화면의 큰 사진 자리에서는 동작 GIF가 있으면 GIF를 먼저 보여 줍니다.
 * 사진이 없거나 불러오지 못하면 Figma 사진 자리표시(회색 상자와 그림 아이콘)를 보여 줍니다.
 */
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { tokens } from '../../theme/tokens';
import type { CatalogExercise } from './catalog';
import { exerciseAnimations, exerciseImages } from './images';

export function ExerciseMedia({
  exercise,
  onMissingChange,
  expanded = false,
  size = 64,
}: {
  exercise?: Pick<CatalogExercise, 'id' | 'bodyPart' | 'equipment'>;
  /** 상세 화면처럼 폭을 꽉 채운 큰 사진입니다. */
  expanded?: boolean;
  /** 목록 썸네일 한 변 길이입니다. */
  size?: number;
  onMissingChange?(missing: boolean): void;
}) {
  // 목록 썸네일은 여러 개가 한꺼번에 움직이면 무겁고 산만하므로 정지 사진만 씁니다.
  const animation = expanded && exercise ? exerciseAnimations[exercise.id] : undefined;
  const source = animation ?? (exercise ? exerciseImages[exercise.id] : undefined);
  const [failedId, setFailedId] = useState<string | null>(null);
  const missing = !source || failedId === exercise?.id;
  const box = expanded ? s.expanded : { width: size, height: size };
  if (!missing && expanded)
    return (
      <View style={[s.picture, box, animation ? s.animation : null]}>
        {/* 동작 GIF는 정사각형이라 가로로 긴 자리에 꽉 채우면 머리·발이 잘립니다. 전체가 보이게 맞춥니다. */}
        <Image
          source={source}
          // 웹은 그림 파일의 원래 크기를 그대로 쓰므로 너비·높이를 사진 자리에 맞춰 둡니다.
          style={[StyleSheet.absoluteFill, s.fill]}
          resizeMode={animation ? 'contain' : 'cover'}
          accessible={false}
          onError={() => {
            setFailedId(exercise?.id ?? null);
            onMissingChange?.(true);
          }}
        />
      </View>
    );
  if (!missing)
    return (
      <Image
        source={source}
        style={[s.picture, box]}
        resizeMode="cover"
        accessible={false}
        onError={() => {
          setFailedId(exercise?.id ?? null);
          onMissingChange?.(true);
        }}
      />
    );
  return (
    <View style={[s.fallback, box]} accessible={false}>
      <AppIcon name="image" color={tokens.color.text.muted} />
    </View>
  );
}

const s = StyleSheet.create({
  picture: { borderRadius: tokens.radius.md, backgroundColor: tokens.color.line.input, overflow: 'hidden' },
  expanded: { width: '100%', aspectRatio: 362 / 200, borderRadius: tokens.radius.xl },
  // 구매한 GIF의 흰 배경과 이어지도록 회색 대신 흰색을 깔아 줍니다.
  animation: { backgroundColor: tokens.color.bg.default },
  fill: { width: '100%', height: '100%' },
  fallback: {
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.line.input,
  },
});
