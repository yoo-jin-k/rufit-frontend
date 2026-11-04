import { readFile, writeFile } from 'node:fs/promises';
import { compileString } from 'sass';
import { colors, spacing, radius, typography, size } from '../src/theme/tokens.ts';

// 단일 토큰을 Sass 변수로 변환한 뒤 웹 CSS를 사전 생성한다. Metro의 Sass 파일 간 import 제한을 피한다.
const root = new URL('../src/theme/web/', import.meta.url);
function variables(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const name = prefix ? `${prefix}-${key}` : key;
    if (typeof entry === 'object' && entry !== null) return variables(entry as Record<string, unknown>, name);
    const unit = typeof entry === 'number' && !key.endsWith('Scale') ? 'px' : '';
    return [`$${name}: ${entry}${unit};`];
  });
}
const generated = `// 자동 생성: src/theme/tokens.ts 수정 후 npm run styles\n${variables({colors, spacing, radius, typography, size}).join('\n')}\n`;
const tokensUrl = new URL('tokens.generated.scss', root);
const source = await readFile(new URL('Button.module.scss', root), 'utf8');
const mixins = await readFile(new URL('_mixins.scss', root), 'utf8');
// 메모리에서 토큰을 제공하여 --check도 파일 변경 없이 빌드 결과를 비교한다.
const css = compileString(source, {importers: [{
  canonicalize: url => ['tokens.generated', 'mixins'].includes(url) ? new URL(`styles:${url}`) : null,
  load: url => url.protocol === 'styles:' ? {contents: url.pathname === 'tokens.generated' ? generated : mixins, syntax: 'scss'} : null,
}], style: 'expanded'}).css;
const outputs = [[tokensUrl, generated], [new URL('Button.module.css', root), `/* 자동 생성: npm run styles. 직접 수정 금지. */\n${css}\n`]] as const;
for (const [url, expected] of outputs) {
  if (process.argv.includes('--check')) {
    if (await readFile(url, 'utf8').catch(() => '') !== expected) throw new Error('웹 스타일이 토큰과 다릅니다. npm run styles를 실행해 주세요.');
  } else await writeFile(url, expected);
}
