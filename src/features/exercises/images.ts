import type { ImageSourcePropType } from 'react-native';

import { bundledImageColors } from './bundledImageColors';

type LicensedMedia = {
  licensedImages: Record<string, ImageSourcePropType>;
  licensedAnimations: Record<string, ImageSourcePropType>;
  /** 예전에 만든 연결 파일에는 없을 수 있습니다. */
  licensedImageColors?: Record<string, ImageEdgeColors>;
};
// 구매한 그림은 Git에 없고 npm run media:sync 가 만든 파일로만 들어옵니다.
// 그 파일이 없는 환경(GitHub 검사·다른 컴퓨터)에서는 아래 기본 그림만 씁니다.
let licensed: LicensedMedia = { licensedImages: {}, licensedAnimations: {} };
try {
  // import 문은 파일이 없으면 빌드가 멈추므로, 없어도 되는 파일을 읽을 수 있는 require를 씁니다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  licensed = require('./licensedMedia.generated');
} catch {
  // 파일이 없으면 기본값을 그대로 씁니다.
}

// Static requires let Metro include these pictures in offline/native bundles.
const bundledImages: Record<string, ImageSourcePropType> = {
  '00000000-0000-4000-8000-000000000001': require('../../../assets/exercises/01.jpg'),
  '00000000-0000-4000-8000-000000000002': require('../../../assets/exercises/02.jpg'),
  '00000000-0000-4000-8000-000000000003': require('../../../assets/exercises/03.jpg'),
  '00000000-0000-4000-8000-000000000004': require('../../../assets/exercises/04.jpg'),
  '00000000-0000-4000-8000-000000000005': require('../../../assets/exercises/05.jpg'),
  '00000000-0000-4000-8000-000000000006': require('../../../assets/exercises/06.jpg'),
  '00000000-0000-4000-8000-000000000007': require('../../../assets/exercises/07.jpg'),
  '00000000-0000-4000-8000-000000000008': require('../../../assets/exercises/08.jpg'),
  '00000000-0000-4000-8000-000000000009': require('../../../assets/exercises/09.jpg'),
  '00000000-0000-4000-8000-000000000010': require('../../../assets/exercises/10.jpg'),
  '00000000-0000-4000-8000-000000000011': require('../../../assets/exercises/11.jpg'),
  '00000000-0000-4000-8000-000000000012': require('../../../assets/exercises/12.jpg'),
  '00000000-0000-4000-8000-000000000013': require('../../../assets/exercises/13.jpg'),
  '00000000-0000-4000-8000-000000000014': require('../../../assets/exercises/14.jpg'),
  '00000000-0000-4000-8000-000000000015': require('../../../assets/exercises/15.jpg'),
  '00000000-0000-4000-8000-000000000016': require('../../../assets/exercises/16.jpg'),
  '00000000-0000-4000-8000-000000000017': require('../../../assets/exercises/17.jpg'),
  '00000000-0000-4000-8000-000000000018': require('../../../assets/exercises/18.jpg'),
};

/** 종목 정지 사진입니다. 구매한 그림이 있으면 그것을, 없으면 기본 그림을 씁니다. */
export const exerciseImages: Record<string, ImageSourcePropType> = {
  ...bundledImages,
  ...licensed.licensedImages,
};
/** 종목 동작 GIF입니다. 상세 화면의 큰 사진 자리에서만 씁니다. */
export const exerciseAnimations: Record<string, ImageSourcePropType> = licensed.licensedAnimations;
/** [위 또는 왼쪽 색, 아래 또는 오른쪽 색, 두 칸을 나누는 방향]입니다. */
export type ImageEdgeColors = readonly [string, string, 'column' | 'row'];

/**
 * 정지 사진의 가장자리 색입니다. 목록의 정사각형 칸에 사진 전체를 맞출 때 빈 공간을 채웁니다.
 * 구매한 그림이 있는 종목은 기본 사진의 색을 쓰지 않습니다(투명 배경이면 색 없이 칸 배경이 보입니다).
 */
export const exerciseImageColors: Record<string, ImageEdgeColors> = {
  ...Object.fromEntries(
    Object.entries(bundledImageColors).filter(([id]) => !(id in licensed.licensedImages)),
  ),
  ...licensed.licensedImageColors,
};
export const hasExerciseImage = (id: string) => exerciseImages[id] !== undefined;
