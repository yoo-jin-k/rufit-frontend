/**
 * 삼대와 체중 화면에서 공통으로 사용하는 날짜별 선 그래프입니다.
 * 가로 좌표는 실제 날짜 간격을 반영하며, 체중의 세로축은 작은 변화를 읽기 쉽도록 조정합니다.
 */
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { lineGeometry, type ChartPoint } from './lineChartModel';
import { s } from './styles';
// 삼대·체중 화면이 공유하는 선 그래프. 고정 높이와 실제 측정 날짜 간격을 사용합니다.
export function TrendChart({
  points,
  color = colors.primary,
  name,
  onSelect,
  zeroBaseline = true,
}: {
  points: ChartPoint[];
  color?: string;
  zeroBaseline?: boolean;
  name: string;
  onSelect: (date: string) => void;
}) {
  const [available, setAvailable] = useState(280);
  const [selected, setSelected] = useState<string | null>(null);
  const width = Math.max(240, available - 40);
  const { floor, ceiling, coordinates, segments } = lineGeometry(points, width, 160, zeroBaseline);
  const selectedPoint = points.find((p) => p.date === selected) ?? points.at(-1);
  return (
    <View style={{ gap: 12 }} onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}>
      {!points.length ? (
        <Text style={s.muted}>첫 기록을 저장하면 변화 그래프가 나타나요.</Text>
      ) : (
        <>
          <Text style={s.heading}>
            {selectedPoint?.date} · {selectedPoint?.value} kg
          </Text>
          <Text style={s.muted}>{name} · 가로축 날짜 / 세로축 kg</Text>
          <ScrollView horizontal>
            <View style={{ width: width + 40, height: 230, paddingTop: 20 }}>
              {[0, 0.5, 1].map((ratio) => (
                <View
                  key={ratio}
                  style={{
                    position: 'absolute',
                    top: 20 + ratio * 160,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text style={[s.small, { width: 36 }]}>
                    {floor + (ceiling - floor) * (1 - ratio)}
                  </Text>
                  <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
                </View>
              ))}
              <View style={{ marginLeft: 40, width, height: 160 }}>
                {segments.map((segment, i) => (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      left: segment.x - segment.length / 2,
                      top: segment.y - 1.5,
                      width: segment.length,
                      height: 3,
                      backgroundColor: color,
                      transform: [{ rotate: `${segment.angle}deg` }],
                    }}
                  />
                ))}
                {coordinates.map((point) => (
                  <Pressable
                    key={point.date}
                    accessibilityRole="button"
                    accessibilityLabel={`${point.date} ${name} ${point.value}kg 상세 보기`}
                    onPress={() => setSelected(point.date)}
                    style={{
                      position: 'absolute',
                      left: point.x - 24,
                      top: point.y - 24,
                      width: 48,
                      height: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: selectedPoint?.date === point.date ? 12 : 8,
                        height: selectedPoint?.date === point.date ? 12 : 8,
                        borderRadius: 6,
                        backgroundColor: color,
                        borderColor: colors.surface,
                        borderWidth: 2,
                      }}
                    />
                  </Pressable>
                ))}
                <Text style={[s.small, { position: 'absolute', top: 178, left: 0 }]}>
                  {points[0].date}
                </Text>
                {points.length > 1 && (
                  <Text style={[s.small, { position: 'absolute', top: 178, right: 0 }]}>
                    {points[points.length - 1].date}
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
          {points.length === 1 && (
            <Text style={s.muted}>기록이 두 개 이상이면 점 사이를 선으로 연결해요.</Text>
          )}
          <View style={s.legend}>
            {points.map((point) => (
              <Pressable
                key={point.date}
                accessibilityRole="button"
                accessibilityLabel={`${point.date} ${name} ${point.value}kg 선택`}
                onPress={() => setSelected(point.date)}
                style={[s.chip, selectedPoint?.date === point.date && s.chipSelected]}
              >
                <Text style={s.small}>
                  {point.date.slice(5)} · {point.value}kg
                </Text>
              </Pressable>
            ))}
          </View>
          {selectedPoint && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${selectedPoint.date} 기록 수정하기`}
              onPress={() => onSelect(selectedPoint.date)}
              style={s.chip}
            >
              <Text style={s.success}>선택한 날짜 기록 수정하기</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
