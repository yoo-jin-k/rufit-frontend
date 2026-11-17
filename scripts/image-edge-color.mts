/**
 * 사진 양쪽 가장자리의 평균 색을 구합니다. 정사각형 칸에 사진 전체를 맞춰 넣을 때 남는 빈 공간을 이 색으로 채웁니다.
 * 가로로 긴 사진은 [위 줄, 아래 줄, 'column'], 세로로 긴 사진은 [왼쪽 줄, 오른쪽 줄, 'row']를 돌려줍니다.
 * 세 번째 값은 빈 공간 두 칸을 나누는 방향(React Native flexDirection)입니다.
 * 가장자리가 투명한 그림은 칸의 기본 배경이 비치므로 null입니다.
 * macOS 기본 도구(sips)로 작은 BMP를 만들어 읽으므로 따로 설치할 패키지가 없습니다. macOS가 아니면 null입니다.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

export type EdgeColors = [string, string, 'column' | 'row'];

export function imageEdgeColors(file: string): EdgeColors | null {
  if (process.platform !== 'darwin') return null;
  const dir = mkdtempSync(join(tmpdir(), 'rufit-edge-'));
  try {
    const out = join(dir, 'edge.bmp');
    execFileSync('sips', ['-s', 'format', 'bmp', '-Z', '48', file, '--out', out], {
      stdio: 'ignore',
    });
    const bmp = readFileSync(out);
    const offset = bmp.readUInt32LE(10);
    const width = bmp.readInt32LE(18);
    const rawHeight = bmp.readInt32LE(22);
    const height = Math.abs(rawHeight);
    const bytes = bmp.readUInt16LE(28) / 8;
    if (bytes < 3) return null;
    const stride = Math.ceil((width * bytes) / 4) * 4;
    // BMP는 보통 아래 줄부터 저장합니다(높이가 음수면 위 줄부터).
    const pixel = (x: number, y: number) => {
      const row = rawHeight > 0 ? height - 1 - y : y;
      const i = offset + row * stride + x * bytes;
      return [bmp[i + 2]!, bmp[i + 1]!, bmp[i]!, bytes === 4 ? bmp[i + 3]! : 255] as const;
    };
    type Px = readonly [number, number, number, number];
    const start: Px[] = [];
    const end: Px[] = [];
    if (width >= height)
      for (let x = 0; x < width; x++) (start.push(pixel(x, 0)), end.push(pixel(x, height - 1)));
    else for (let y = 0; y < height; y++) (start.push(pixel(0, y)), end.push(pixel(width - 1, y)));
    const avg = (points: Px[]) =>
      [0, 1, 2, 3].map((c) => points.reduce((sum, p) => sum + p[c]!, 0) / points.length);
    const a = avg(start);
    const b = avg(end);
    if (a[3]! < 128 || b[3]! < 128) return null;
    const color = (v: number[]) => `#${v.slice(0, 3).map(hex).join('')}`;
    return [color(a), color(b), width >= height ? 'column' : 'row'];
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
