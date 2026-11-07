/** 앱 전체의 선형 아이콘을 한곳에서 관리합니다. 크기와 색상만 전달하여 일관성을 유지합니다. */
import Svg, { Path, Circle } from 'react-native-svg';
export type IconName =
  | 'workout'
  | 'analysis'
  | 'profile'
  | 'settings'
  | 'camera'
  | 'image'
  | 'plus'
  | 'back'
  | 'chevron'
  | 'check'
  | 'friends'
  | 'calendar'
  | 'bell'
  | 'more'
  | 'heart'
  | 'close'
  | 'edit'
  | 'refresh';
export function AppIcon({
  name,
  size = 22,
  color = '#777780',
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  const paths: Partial<Record<IconName, string>> = {
    edit: 'M4 16L16 4l4 4L8 20H4z M14 6l4 4',
    refresh: 'M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0114-2l1 6 M4 12l1 6a8 8 0 0014-2',
    close: 'M6 6l12 12 M18 6L6 18',
    heart: 'M12 21L3 12C-2 5 7-1 12 6C17-1 26 5 21 12Z',
    workout: 'M7 12h10 M3 9v6 M6 7v10 M18 7v10 M21 9v6',
    analysis: 'M5 20V11 M12 20V4 M19 20V8',
    profile: 'M4 21c0-5 3-8 8-8s8 3 8 8',
    settings: 'M10 2h4l1 3 3 1 3 0 1 4-2 2 1 3-3 3-3-1-2 2-4-1-1-3-3-1-1-4 2-2-1-3 3-3 3 1z',
    camera: 'M3 7h4l2-3h6l2 3h4v13H3z',
    image: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5',
    plus: 'M12 5v14 M5 12h14',
    back: 'M15 5l-7 7 7 7',
    chevron: 'M9 5l7 7-7 7',
    check: 'M5 12l5 5L20 7',
    friends: 'M2 21v-2c0-4 3-6 6-6s6 2 6 6v2 M16 13c4 0 6 2 6 6v2',
    bell: 'M6 10a6 6 0 0112 0v5l2 3H4l2-3z M10 21h4',
    calendar: 'M4 5h16v16H4z M4 10h16 M8 2v6 M16 2v6',
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {name === 'more' ? (
        <>
          <Circle cx={12} cy={5} r={1} />
          <Circle cx={12} cy={12} r={1} />
          <Circle cx={12} cy={19} r={1} />
        </>
      ) : (
        <Path d={paths[name]} />
      )}
      {name === 'profile' && <Circle cx={12} cy={6} r={4} />}
      {name === 'friends' && (
        <>
          <Circle cx={8} cy={6} r={4} />
          <Path d="M16 2a4 4 0 010 8" />
        </>
      )}
      {name === 'camera' && <Circle cx={12} cy={13} r={4} />}
      {name === 'settings' && <Circle cx={12} cy={12} r={3} />}
      {name === 'image' && <Circle cx={16} cy={7} r={1} />}
    </Svg>
  );
}
