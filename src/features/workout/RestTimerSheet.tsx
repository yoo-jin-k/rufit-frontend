/**
 * Figma 03-07 휴식 시간 시트입니다. 자주 쓰는 시간 칩과 직접 입력(−/+ 15초), 적용 범위 선택, 적용 버튼으로 구성합니다.
 * 시간은 임시로 고른 뒤 적용합니다. 닫기와 바깥 누르기는 저장값을 바꾸지 않습니다.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { CheckRow, Chip, ChipRow } from '../../components/kit/Controls';
import { BottomSheet } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import { formatRest } from './RestSetting';

const c = tokens.color;
const presets = [30, 60, 90, 120, 180];

export function RestTimerSheet({ name, seconds, recommended, onApply, onClose }: {
  name: string; seconds: number; recommended: number;
  onApply(value: number | null, all: boolean): void; onClose(): void;
}) {
  const [value, setValue] = useState(seconds);
  const [all, setAll] = useState(false);
  const [error, setError] = useState('');
  function apply(next: number | null) {
    try {
      if (next !== null && (next < 0 || next > 3600)) throw new Error('휴식시간은 60분까지 설정할 수 있습니다.');
      onApply(next, all);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '시간을 확인해 주세요.');
    }
  }
  const step = (delta: number) => setValue((v) => Math.max(0, Math.min(3600, v + delta)));
  return (
    <BottomSheet visible title="휴식 시간" subtitle={`${name}의 세트 사이 휴식`} onClose={onClose}>
      <ChipRow wrap>
        {presets.map((p) => (
          <Chip key={p} label={`${p}초`} selected={value === p} onPress={() => setValue(p)} />
        ))}
      </ChipRow>
      <View style={s.stepper}>
        <Text style={[text.bodyMedium, { color: c.text.primary, flex: 1 }]}>직접 입력</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="휴식 15초 줄이기" onPress={() => step(-15)} style={s.stepButton}>
          <Text style={[text.headline, { color: c.text.primary }]}>−</Text>
        </Pressable>
        <Text accessibilityLabel={`선택한 휴식 ${formatRest(value)}`} style={[text.bodyBold, s.stepValue]}>
          {formatRest(value)}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="휴식 15초 늘리기" onPress={() => step(15)} style={s.stepButton}>
          <AppIcon name="plus" size={16} />
        </Pressable>
      </View>
      <CheckRow label="모든 종목에 같은 시간 적용" checked={all} onChange={setAll} />
      <Text style={[text.label, { color: c.text.secondary }]}>적용 대상의 진행 중인 휴식도 선택한 시간부터 다시 시작합니다.</Text>
      {!!error && <Text accessibilityRole="alert" style={[text.caption, { color: c.danger.default }]}>{error}</Text>}
      <Button title={all ? '모든 종목에 적용' : '이 종목만 적용'} onPress={() => apply(value)} />
      <View style={s.links}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => apply(null)}>
          <Text style={[text.captionBold, s.link]}>권장 {recommended}초 사용</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="이 종목 휴식 타이머 끄기" hitSlop={8} onPress={() => { setAll(false); onApply(0, false); onClose(); }}>
          <Text style={[text.captionBold, s.link]}>휴식 타이머 끄기</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  stepper: {
    backgroundColor: c.bg.surface,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[12],
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[8],
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: c.line.input,
    backgroundColor: c.bg.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { minWidth: 52, textAlign: 'center', color: c.text.primary, fontVariant: ['tabular-nums'] },
  links: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space[24], paddingBottom: tokens.space[8] },
  link: { color: c.text.secondary, textDecorationLine: 'underline' },
});
