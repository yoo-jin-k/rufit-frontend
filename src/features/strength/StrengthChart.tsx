import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { labels, lifts, total, type Lift, type Measurement } from './model';
import { liftColors, s } from './styles';
import { TrendChart } from './TrendChart';
export function StrengthChart({
  records,
  onSelect,
}: {
  records: Measurement[];
  onSelect: (record: Measurement) => void;
}) {
  const [series, setSeries] = useState<Lift | 'total'>('total');
  return (
    <View style={s.card}>
      <Text style={s.heading}>삼대측정 그래프</Text>
      <Text style={s.muted}>합계 또는 종목을 선택해 중량 변화를 선으로 확인해요.</Text>
      <View style={s.legend}>
        {(['total', ...lifts] as const).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: series === key }}
            onPress={() => setSeries(key)}
            style={[s.chip, series === key && s.chipSelected]}
          >
            <Text style={s.muted}>{key === 'total' ? '삼대 합계' : labels[key]}</Text>
          </Pressable>
        ))}
      </View>
      <TrendChart
        name={series === 'total' ? '삼대 합계' : labels[series]}
        color={series === 'total' ? undefined : liftColors[series]}
        points={records.map((record) => ({
          date: record.date,
          value: series === 'total' ? total(record) : record[series],
        }))}
        onSelect={(date) => {
          const record = records.find((r) => r.date === date);
          if (record) onSelect(record);
        }}
      />
    </View>
  );
}
