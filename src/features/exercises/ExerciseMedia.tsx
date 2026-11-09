/** 종목 동작 사진입니다. 사진이 없거나 불러오지 못하면 Figma 사진 자리표시(회색 상자와 그림 아이콘)를 보여 줍니다. */
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { tokens } from '../../theme/tokens';
import type { CatalogExercise } from './catalog';
import { exerciseImages } from './images';

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
  const source = exercise ? exerciseImages[exercise.id] : undefined;
  const [failedId, setFailedId] = useState<string | null>(null);
  const missing = !source || failedId === exercise?.id;
  const box = expanded ? s.expanded : { width: size, height: size };
  if (!missing && expanded)
    return (
      <View style={[s.picture, box]}>
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
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
  fallback: {
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.line.input,
  },
});
