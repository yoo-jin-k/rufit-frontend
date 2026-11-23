/**
 * 구매한 운동 그림(정지 이미지·GIF)을 원본 보관 폴더에서 앱 폴더로 복사합니다. GIF는 용량을 줄이려고 움직이는 WebP로 바꿉니다.
 * 원본과 복사본, 그리고 이 스크립트가 만드는 연결 파일은 모두 Git에 올리지 않습니다(라이선스상 재배포 금지).
 *
 * 원본 폴더: RUFIT_LICENSED_MEDIA_DIR 환경변수, 없으면 저장소 옆 ../../Rufit_assets/gymvisual/originals
 * 종목과 파일 이름 연결: assets/exercises/licensed-media.json
 * 원본 폴더가 없으면(GitHub 검사·다른 컴퓨터) 빈 연결 파일을 만들어 기본 그림만 쓰게 합니다.
 */
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageEdgeColors } from './image-edge-color.mts';

type Entry = { id: string; name: string; image: string | null; gif: string | null };

const repo = fileURLToPath(new URL('..', import.meta.url));
const source = resolve(
  process.env.RUFIT_LICENSED_MEDIA_DIR ?? resolve(repo, '../../Rufit_assets/gymvisual/originals'),
);
const target = resolve(repo, 'assets/licensed/exercises');
const generated = resolve(repo, 'src/features/exercises/licensedMedia.generated.ts');
const imageExt = new Set(['.png', '.jpg', '.jpeg', '.webp']);
// 목록 썸네일(44pt)과 상세 사진(폭 362pt)을 3배 화면에서도 선명하게 보이는 크기입니다.
const maxImageSide = 1080;

const { exercises } = JSON.parse(
  await readFile(resolve(repo, 'assets/exercises/licensed-media.json'), 'utf8'),
) as {
  exercises: Entry[];
};

const images: string[] = [];
const animations: string[] = [];
const colors: string[] = [];
const missing: string[] = [];
const hasSource = existsSync(source);
const webpCache = resolve(repo, 'node_modules/.cache/licensed-webp');
const hasGif2webp = (() => {
  try {
    execFileSync('gif2webp', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

// 지난번 복사본을 지우고 새로 만듭니다. 연결에서 빠진 파일이 앱에 남지 않게 합니다.
await rm(target, { recursive: true, force: true });
if (hasSource) {
  await mkdir(target, { recursive: true });
  for (const entry of exercises) {
    for (const kind of ['image', 'gif'] as const) {
      const file = entry[kind];
      if (!file) continue;
      const from = resolve(source, file);
      if (!from.startsWith(source + '/') || !existsSync(from)) {
        missing.push(`${entry.name}: ${file}`);
        continue;
      }
      const ext = extname(file).toLowerCase();
      if (kind === 'image' && !imageExt.has(ext)) {
        missing.push(`${entry.name}: ${file} (정지 이미지는 png·jpg·webp만 씁니다)`);
        continue;
      }
      if (kind === 'gif' && ext !== '.gif') {
        missing.push(`${entry.name}: ${file} (움직이는 그림은 gif만 씁니다)`);
        continue;
      }
      // GIF는 움직이는 WebP로 바꿔 넣습니다. 화질 차이 없이 용량이 약 3분의 1로 줄어듭니다.
      // 변환 도구(gif2webp)가 없는 컴퓨터에서는 GIF를 그대로 넣습니다.
      const toWebp = kind === 'gif' && hasGif2webp;
      const name = `${entry.id}-${kind}${toWebp ? '.webp' : ext}`;
      const to = resolve(target, name);
      if (toWebp) {
        // 변환은 그림 100여 개에 몇 분 걸려서, 원본이 바뀌지 않았으면 지난 변환 결과를 다시 씁니다.
        const cached = resolve(webpCache, `${file.replace(/[/\\]/g, '_')}.webp`);
        if (!existsSync(cached) || (await stat(cached)).mtimeMs < (await stat(from)).mtimeMs) {
          await mkdir(webpCache, { recursive: true });
          execFileSync('gif2webp', [
            '-mixed',
            '-q',
            '80',
            '-m',
            '6',
            '-mt',
            '-quiet',
            from,
            '-o',
            cached,
          ]);
        }
        await copyFile(cached, to);
      } else {
        await copyFile(from, to);
      }
      // 큰 정지 이미지는 macOS 기본 도구(sips)로 줄여 앱 용량을 아낍니다. GIF는 움직임이 깨지지 않게 그대로 둡니다.
      if (kind === 'image' && process.platform === 'darwin') {
        execFileSync('sips', ['--resampleHeightWidthMax', String(maxImageSide), to], {
          stdio: 'ignore',
        });
        // 구매한 정지 이미지는 시작·끝 자세가 좌우로 나란히 있어 정사각형 썸네일 가운데가 비어 보입니다.
        // 가로가 세로보다 긴 그림은 왼쪽 절반(시작 자세)만 남깁니다.
        const info = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', to], {
          encoding: 'utf8',
        });
        const width = Number(/pixelWidth: (\d+)/.exec(info)?.[1]);
        const height = Number(/pixelHeight: (\d+)/.exec(info)?.[1]);
        if (width > height) {
          // sips는 오프셋 0 0을 '지정 안 함'으로 보고 가운데를 자르므로 1 1(왼쪽 위 1px)을 줍니다.
          execFileSync(
            'sips',
            ['-c', String(height), String(Math.floor(width / 2)), '--cropOffset', '1', '1', to],
            {
              stdio: 'ignore',
            },
          );
        }
      }
      if (kind === 'image') {
        // 목록의 정사각형 칸에 사진 전체를 맞출 때 남는 공간을 채울 가장자리 색입니다.
        const edge = imageEdgeColors(to);
        if (edge) colors.push(`  '${entry.id}': ['${edge[0]}', '${edge[1]}', '${edge[2]}'],`);
      }
      const line = `  '${entry.id}': require('../../../assets/licensed/exercises/${name}'),`;
      (kind === 'image' ? images : animations).push(line);
    }
  }
}

await writeFile(
  generated,
  [
    '// 자동 생성 파일입니다. npm run media:sync 로 다시 만듭니다. 구매한 그림을 가리키므로 Git에 올리지 않습니다.',
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    `export const licensedImages: Record<string, ImageSourcePropType> = {${images.length ? `\n${images.join('\n')}\n` : ''}};`,
    `export const licensedAnimations: Record<string, ImageSourcePropType> = {${animations.length ? `\n${animations.join('\n')}\n` : ''}};`,
    `export const licensedImageColors: Record<string, readonly [string, string, 'column' | 'row']> = {${colors.length ? `\n${colors.join('\n')}\n` : ''}};`,
    '',
  ].join('\n'),
);

// 근육 회복 지도: 구매한 근육 그림에서 만든 부위별 색칠 그림입니다(원본 폴더 옆 derived/muscle-map).
// 파일이 하나라도 빠지면 연결하지 않고, 앱은 직접 그린 기본 지도를 씁니다.
const muscleSource = resolve(source, '../derived/muscle-map');
const muscleTarget = resolve(repo, 'assets/licensed/muscle-map');
const muscleGenerated = resolve(repo, 'src/features/recovery/muscleMapMedia.generated.ts');
const muscleParts = ['legs', 'back', 'chest', 'shoulders', 'arms', 'core'];
const muscleLevels = ['fresh', 'recovering', 'almost'];
const muscleFiles = [
  'base.png',
  ...muscleParts.flatMap((part) => muscleLevels.map((level) => `${part}-${level}.png`)),
];
await rm(muscleTarget, { recursive: true, force: true });
const hasMuscleMap = muscleFiles.every((file) => existsSync(resolve(muscleSource, file)));
if (hasMuscleMap) {
  await mkdir(muscleTarget, { recursive: true });
  for (const file of muscleFiles)
    await copyFile(resolve(muscleSource, file), resolve(muscleTarget, file));
  const info = execFileSync(
    'sips',
    ['-g', 'pixelWidth', '-g', 'pixelHeight', resolve(muscleTarget, 'base.png')],
    {
      encoding: 'utf8',
    },
  );
  const width = Number(/pixelWidth: (\d+)/.exec(info)?.[1]);
  const height = Number(/pixelHeight: (\d+)/.exec(info)?.[1]);
  const path = (file: string) => `require('../../../assets/licensed/muscle-map/${file}')`;
  const parts = muscleParts.map(
    (part) =>
      `    ${part.toUpperCase()}: { ${muscleLevels.map((level) => `${level}: ${path(`${part}-${level}.png`)}`).join(', ')} },`,
  );
  await writeFile(
    muscleGenerated,
    [
      '// 자동 생성 파일입니다. npm run media:sync 로 다시 만듭니다. 구매한 그림을 가리키므로 Git에 올리지 않습니다.',
      "import type { ImageSourcePropType } from 'react-native';",
      '',
      'export const muscleMapImages: {',
      '  aspectRatio: number;',
      '  base: ImageSourcePropType;',
      '  parts: Record<string, Record<string, ImageSourcePropType>>;',
      '} | null = {',
      `  aspectRatio: ${width} / ${height},`,
      `  base: ${path('base.png')},`,
      '  parts: {',
      ...parts,
      '  },',
      '};',
      '',
    ].join('\n'),
  );
} else {
  await rm(muscleGenerated, { force: true });
}

if (!hasSource) {
  console.log(`[media:sync] 원본 폴더가 없어 기본 그림만 씁니다: ${source}`);
} else {
  const files = existsSync(target) ? await readdir(target) : [];
  let bytes = 0;
  for (const f of files) bytes += (await stat(resolve(target, f))).size;
  console.log(
    `[media:sync] 정지 이미지 ${images.length}개, 움직이는 그림 ${animations.length}개를 넣었습니다 (${(bytes / 1024 / 1024).toFixed(1)}MB).`,
  );
  console.log(
    hasMuscleMap
      ? `[media:sync] 근육 회복 지도 그림 ${muscleFiles.length}개를 넣었습니다.`
      : `[media:sync] 근육 회복 지도 그림이 없어 기본 지도를 씁니다: ${muscleSource}`,
  );
  if (missing.length)
    console.warn(
      `[media:sync] 찾지 못했거나 형식이 맞지 않는 파일 ${missing.length}개:\n- ${missing.join('\n- ')}`,
    );
}
