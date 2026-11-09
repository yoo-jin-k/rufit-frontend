/** 앱 전체의 아이콘을 한곳에서 관리합니다. Figma 아이콘 세트(20×20, 선 굵기 1.7)를 그대로 그립니다. */
import Svg, { Path } from 'react-native-svg';
import { tokens } from '../theme/tokens';
import { figmaIcons, type FigmaIconName } from './figmaIcons';

// 예전 이름으로 부르던 화면이 그대로 동작하도록 Figma 아이콘 이름에 연결합니다.
const legacy = {
  workout: 'dumbbell',
  analysis: 'chart',
  profile: 'person',
  settings: 'gear',
  back: 'chevron-left',
  chevron: 'chevron-right',
  friends: 'userplus',
  more: 'dots',
  edit: 'pencil',
} as const satisfies Record<string, FigmaIconName>;

export type IconName = FigmaIconName | keyof typeof legacy;

export function AppIcon({
  name,
  size = tokens.size.icon,
  color = tokens.color.text.primary,
  filled = false,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** 하트처럼 선 아이콘의 안쪽을 같은 색으로 채울 때 씁니다. */
  filled?: boolean;
  strokeWidth?: number;
}) {
  const icon = figmaIcons[name in legacy ? legacy[name as keyof typeof legacy] : (name as FigmaIconName)];
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" accessible={false}>
      {icon.stroke.map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={filled ? color : 'none'}
        />
      ))}
      {icon.fill.map((d) => (
        <Path key={d} d={d} fill={color} />
      ))}
    </Svg>
  );
}
