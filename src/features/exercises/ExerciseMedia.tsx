import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../../theme/tokens';
import { bodyParts, equipmentLabels, type CatalogExercise } from './catalog';
import { exerciseImages } from './images';

export function ExerciseMedia({
  exercise,
  onMissingChange,
  expanded = false,
}: {
  exercise?: Pick<CatalogExercise, 'id' | 'bodyPart' | 'equipment'>;
  expanded?: boolean;
  onMissingChange?(missing: boolean): void;
}) {
  const source = exercise ? exerciseImages[exercise.id] : undefined;
  const [failedId, setFailedId] = useState<string | null>(null);
  const missing = !source || failedId === exercise?.id;
  if (!missing)
    return (
      <Image
        source={source}
        style={[s.picture, expanded && { width: '100%', height: 260 }]}
        resizeMode="contain"
        accessible={false}
        onError={() => {
          setFailedId(exercise?.id ?? null);
          onMissingChange?.(true);
        }}
      />
    );
  return (
    <View style={[s.fallback, expanded && { width: '100%', minHeight: 180 }]} accessible={false}>
      <Text style={s.fallbackStrong}>
        {exercise ? equipmentLabels[exercise.equipment] : '운동'}
      </Text>
      <Text style={s.fallbackText}>{exercise ? bodyParts[exercise.bodyPart] : '직접 입력'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  picture: {
    width: 64,
    height: 64,
    borderRadius: radius.input,
    backgroundColor: colors.background,
  },
  fallback: {
    width: 64,
    minHeight: 64,
    borderRadius: radius.input,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  fallbackStrong: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackText: { ...typography.caption, color: colors.text, textAlign: 'center' },
});
