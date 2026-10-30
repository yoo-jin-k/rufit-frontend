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
    <View style={{ gap: 20 }}>
      <View
        style={{ flexDirection: 'row', backgroundColor: '#F5F5F7', borderRadius: 10, padding: 3 }}
      >
        {(['total', ...lifts] as const).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: series === key }}
            onPress={() => setSeries(key)}
            style={{
              flex: 1,
              minHeight: 44,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: series === key ? 'white' : 'transparent',
            }}
          >
            <Text style={s.muted}>
              {key === 'total'
                ? '합계'
                : key === 'bench'
                  ? '벤치'
                  : key === 'squat'
                    ? '스쿼트'
                    : '데드'}
            </Text>
          </Pressable>
        ))}
      </View>
      <TrendChart
        compact
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
