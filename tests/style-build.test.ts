import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, symlink, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// 별도 디렉터리에서 실제 빌더를 실행하여 저장소의 생성물과 개발 중인 스타일을 보존합니다.
test('새 SCSS 모듈을 자동 생성하고 검사 모드에서는 오래된 CSS를 덮어쓰지 않는다', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'rufit-style-build-'));
  try {
    await mkdir(join(fixture, 'scripts'), { recursive: true });
    const theme = join(fixture, 'src/theme');
    const web = join(theme, 'web');
    await mkdir(web, { recursive: true });
    await copyFile('scripts/build-styles.mts', join(fixture, 'scripts/build-styles.mts'));
    await copyFile('src/theme/tokens.ts', join(theme, 'tokens.ts'));
    await symlink(resolve('node_modules'), join(fixture, 'node_modules'), 'dir');
    const source = join(web, 'NewComponent.module.scss');
    const output = join(web, 'NewComponent.module.css');
    await writeFile(source, "@use 'tokens.generated' as t;\n.root { color: t.$colors-text; }\n");
    const build = (...args: string[]) =>
      spawnSync(
        process.execPath,
        ['--experimental-strip-types', 'scripts/build-styles.mts', ...args],
        { cwd: fixture, encoding: 'utf8' },
      );

    const generated = build();
    assert.equal(generated.status, 0, generated.stderr);
    const css = await readFile(output, 'utf8');
    const tokens = await readFile(join(web, 'tokens.generated.scss'), 'utf8');
    assert.match(css, /\.root\s*\{/);
    assert.doesNotMatch(css, /\$colors-text/);
    assert.equal(build('--check').status, 0);

    await writeFile(source, '.root { color: red; }\n');
    assert.notEqual(build('--check').status, 0);
    assert.equal(await readFile(output, 'utf8'), css);
    assert.equal(await readFile(join(web, 'tokens.generated.scss'), 'utf8'), tokens);
    assert.equal(build().status, 0);
    assert.match(await readFile(output, 'utf8'), /color: red/);
    assert.equal(build('--check').status, 0);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
