/**
 * 삼대와 체중 화면, 분석 카드에서 함께 쓰는 날짜별 꺾은선 그래프입니다.
 * 가로 위치는 실제 날짜 간격을 반영하고, 화면 폭에 맞춰 늘거나 줄어듭니다.
 * Figma처럼 검정 선과 흰 점을 쓰고, 가장 최근 점만 포인트 색으로 채웁니다.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { text, tokens } from '../../theme/tokens';
import { lineGeometry, type ChartPoint } from './lineChartModel';

const c = tokens.color;
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;

export function TrendChart({
  points,
  name,
  onSelect,
  zeroBaseline = true,
  mini = false,
}: {
  points: ChartPoint[];
  name: string;
  /** 점을 누르면 그 날짜 기록을 고칩니다. */
  onSelect?: (date: string) => void;
  zeroBaseline?: boolean;
  /** 분석 카드 안의 작은 그래프입니다(글자·기준선 숫자 없이 높이 44). */
  mini?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const height = mini ? 44 : 120;
  const pad = mini ? 8 : 16;
  const { coordinates } = lineGeometry(points, Math.max(1, width - pad * 2 + 48), height - 16, zeroBaseline);
  // lineGeometry는 좌우 24씩 여백을 두므로 그만큼 당겨 카드 안쪽 여백(pad)에 맞춥니다.
  const xy = coordinates.map((p) => ({ ...p, x: p.x - 24 + pad, y: p.y + 8 }));
  const last = xy.at(-1);
  const labels = points.length > 5 ? [0, Math.round((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);
  if (!points.length)
    return mini ? null : (
      <Text style={[text.caption, { color: c.text.secondary }]}>첫 기록을 저장하면 변화 그래프가 나타나요.</Text>
    );
  return (
    <View style={!mini && s.card} onLayout={(e) => setWidth(e.nativeEvent.layout.width - (mini ? 0 : tokens.space[16] * 2))}>
      {width > 0 && (
        <View style={{ width, height }}>
          <Svg width={width} height={height} accessible={false}>
            {!mini &&
              [0, 0.5, 1].map((ratio) => (
                <Line key={ratio} x1={0} x2={width} y1={8 + ratio * (height - 16)} y2={8 + ratio * (height - 16)} stroke={c.line.default} strokeWidth={1} />
              ))}
            {xy.length > 1 && (
              <Polyline points={xy.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={c.text.primary} strokeWidth={1.5} />
            )}
            {xy.map((p) => (
              <Circle
                key={p.date}
                cx={p.x}
                cy={p.y}
                r={p === last ? 4 : 3}
                fill={p === last ? c.accent.default : c.bg.default}
                stroke={p === last ? c.accent.default : c.text.primary}
                strokeWidth={1.5}
              />
            ))}
          </Svg>
          {!mini &&
            onSelect &&
            xy.map((p) => (
              <Pressable
                key={p.date}
                accessibilityRole="button"
                accessibilityLabel={`${p.date} ${name} ${p.value}kg 상세 보기`}
                onPress={() => onSelect(p.date)}
                style={[s.hit, { left: p.x - 22, top: p.y - 22 }]}
              />
            ))}
        </View>
      )}
      {!mini && width > 0 && (
        <View style={[s.axis, { width }]}>
          {labels.map((i) => (
            <Text key={points[i].date} style={[text.label, s.axisLabel, { left: Math.max(0, Math.min(width - 40, xy[i].x - 20)) }]}>
              {shortDate(points[i].date)}
            </Text>
          ))}
        </View>
      )}
      {!mini && points.length === 1 && (
        <Text style={[text.label, { color: c.text.muted }]}>기록이 두 개 이상이면 점 사이를 선으로 연결해요.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: 4 },
  hit: { position: 'absolute', width: 44, height: 44 },
  axis: { height: 18 },
  axisLabel: { position: 'absolute', width: 40, textAlign: 'center', color: c.text.muted },
});
