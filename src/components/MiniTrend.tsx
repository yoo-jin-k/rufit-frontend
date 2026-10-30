/** 분석 카드의 미니 그래프입니다. 실제 측정값만 받아 장식용 가짜 추이를 만들지 않습니다. */
import Svg, { Polyline, Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';
export function MiniTrend({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const recent = values.slice(-10),
    min = Math.min(...recent),
    span = Math.max(...recent) - min || 1;
  const points = recent.map((v, i) => ({
    x: 5 + (i / (recent.length - 1)) * 80,
    y: 35 - ((v - min) / span) * 26,
  }));
  return (
    <Svg width={90} height={44} accessible={false}>
      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={colors.text}
        strokeWidth={1.5}
      />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={colors.text} />
      ))}
    </Svg>
  );
}
