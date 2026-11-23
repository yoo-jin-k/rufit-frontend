/**
 * 몸 앞·뒤 근육 지도입니다. 부위별 회복 단계에 따라 근육 색을 칠합니다.
 * 구매한 근육 그림이 있으면 그 그림을, 없으면 직접 그린 그림을 씁니다.
 * 그림은 접근성 트리에서 하나의 이미지로 읽히고, 자세한 내용은 옆의 글자로 제공합니다.
 */
import { Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { tokens } from '../../theme/tokens';
import { recoveryLevel, type PartRecovery, type RecoveryLevel, type RecoveryPart } from './model';
import { absLines, backPaths, frontPaths } from './muscleMapPaths';

const c = tokens.color;
/** 회복 단계별 색입니다. 막 운동한 부위가 가장 진합니다. */
export const levelColor: Record<RecoveryLevel, string> = {
  fresh: '#E5484D',
  recovering: '#F0A35E',
  almost: '#F5D06B',
  ready: '#D9DCE1',
};
const SKIN = '#EEF0F3',
  HEAD = '#E4E7EB';
const MIRROR = 'translate(200,0) scale(-1,1)';

/** 그림의 근육 이름 → 앱 운동 부위입니다. */
const regionPart: Record<string, RecoveryPart> = {
  quads: 'LEGS',
  hamstrings: 'LEGS',
  glutes: 'LEGS',
  calves: 'LEGS',
  chest: 'CHEST',
  lats: 'BACK',
  traps: 'BACK',
  lowerBack: 'BACK',
  shoulders: 'SHOULDERS',
  biceps: 'ARMS',
  triceps: 'ARMS',
  forearms: 'ARMS',
  abs: 'CORE',
  obliques: 'CORE',
};

function Figure({
  paths,
  colors,
  label,
  height,
}: {
  paths: Record<string, readonly string[]>;
  colors: Partial<Record<RecoveryPart, string>>;
  label: string;
  height: number;
}) {
  const fill = (region: string) =>
    region === 'base'
      ? HEAD
      : region === 'skin'
        ? SKIN
        : (colors[regionPart[region]] ?? levelColor.ready);
  const all = Object.entries(paths);
  return (
    // iOS에서는 비율 지정만으로 크기가 정해지지 않아 가로·세로를 숫자로 줍니다.
    <Svg viewBox="0 0 200 420" width={(height * 200) / 420} height={height}>
      {/* 바탕 실루엣: 같은 경로를 두꺼운 테두리로 한 번 더 그려 근육 사이 틈을 메웁니다. */}
      {all.map(([region, list]) =>
        list.map((d, i) => (
          <G key={`s-${region}-${i}`}>
            <Path d={d} fill={SKIN} stroke={SKIN} strokeWidth={7} strokeLinejoin="round" />
            <Path
              d={d}
              transform={MIRROR}
              fill={SKIN}
              stroke={SKIN}
              strokeWidth={7}
              strokeLinejoin="round"
            />
          </G>
        )),
      )}
      {all.map(([region, list]) =>
        list.map((d, i) => (
          <G key={`m-${region}-${i}`}>
            <Path
              d={d}
              fill={fill(region)}
              stroke={c.bg.default}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            {region !== 'base' && (
              <Path
                d={d}
                transform={MIRROR}
                fill={fill(region)}
                stroke={c.bg.default}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            )}
          </G>
        )),
      )}
      {'abs' in paths &&
        absLines.map((d, i) => (
          <G key={`a-${i}`}>
            <Path d={d} stroke={c.bg.default} strokeWidth={1.5} fill="none" />
            <Path d={d} transform={MIRROR} stroke={c.bg.default} strokeWidth={1.5} fill="none" />
          </G>
        ))}
      <SvgText x={100} y={416} fontSize={26} fill={c.text.secondary} textAnchor="middle">
        {label}
      </SvgText>
    </Svg>
  );
}

type MuscleMapImages = {
  aspectRatio: number;
  base: ImageSourcePropType;
  parts: Record<string, Record<string, ImageSourcePropType>>;
} | null;
// 구매한 근육 그림으로 만든 지도는 Git에 없고 npm run media:sync 가 만든 파일로만 들어옵니다.
// 그 파일이 없는 환경(GitHub 검사·다른 컴퓨터)에서는 직접 그린 지도를 씁니다.
let licensedMap: MuscleMapImages = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  licensedMap = require('./muscleMapMedia.generated').muscleMapImages;
} catch {
  // 파일이 없으면 직접 그린 지도를 씁니다.
}

export function MuscleMap({
  recovery,
  height = 220,
}: {
  recovery: PartRecovery[];
  height?: number;
}) {
  const colors: Partial<Record<RecoveryPart, string>> = {};
  for (const item of recovery) colors[item.part] = levelColor[recoveryLevel(item.percent)];
  const tired = recovery.filter((item) => item.percent < 100);
  const label = tired.length
    ? `근육 회복 그림, 회복 중인 부위 ${tired.length}곳`
    : '근육 회복 그림, 모든 부위 회복';
  if (licensedMap) {
    const map = licensedMap;
    // 회색 바탕 위에 회복 중인 부위의 색칠 그림을 겹쳐 그립니다.
    const size = { width: height * map.aspectRatio, height };
    const layer = { position: 'absolute' as const, top: 0, left: 0, ...size };
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        style={{ alignSelf: 'center', ...size }}
      >
        <Image source={map.base} style={layer} resizeMode="contain" />
        {tired.map((item) => {
          const level = recoveryLevel(item.percent);
          const source = level === 'ready' ? undefined : map.parts[item.part]?.[level];
          return source ? (
            <Image key={item.part} source={source} style={layer} resizeMode="contain" />
          ) : null;
        })}
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        height,
        overflow: 'hidden',
      }}
    >
      <Figure paths={frontPaths} colors={colors} label="앞" height={height} />
      <Figure paths={backPaths} colors={colors} label="뒤" height={height} />
    </View>
  );
}
