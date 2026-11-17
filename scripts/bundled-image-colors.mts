/**
 * 기본 운동 사진(assets/exercises/*.jpg)의 가장자리 색을 구해 src/features/exercises/bundledImageColors.ts에 씁니다.
 * 기본 사진을 바꾸거나 추가했을 때 macOS에서 npm run media:colors 로 다시 만듭니다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageEdgeColors } from './image-edge-color.mts';

const repo = fileURLToPath(new URL('..', import.meta.url));
const images = await readFile(resolve(repo, 'src/features/exercises/images.ts'), 'utf8');
const lines: string[] = [];
for (const [, id, file] of images.matchAll(
  /'([0-9a-f-]{36})': require\('\.\.\/\.\.\/\.\.\/(assets\/exercises\/[^']+)'\)/g,
)) {
  const colors = imageEdgeColors(resolve(repo, file!));
  if (colors) lines.push(`  '${id}': ['${colors[0]}', '${colors[1]}', '${colors[2]}'],`);
}
if (!lines.length) throw new Error('색을 구하지 못했습니다. macOS에서 실행해 주세요.');
await writeFile(
  resolve(repo, 'src/features/exercises/bundledImageColors.ts'),
  [
    '// 자동 생성 파일입니다. npm run media:colors 로 다시 만듭니다.',
    '/** 기본 운동 사진의 가장자리 색입니다. 정사각형 칸의 빈 공간을 채웁니다. */',
    "import type { ImageEdgeColors } from './images';",
    '',
    `export const bundledImageColors: Record<string, ImageEdgeColors> = {\n${lines.join('\n')}\n};`,
    '',
  ].join('\n'),
);
console.log(`[media:colors] 기본 사진 ${lines.length}개의 가장자리 색을 저장했습니다.`);
