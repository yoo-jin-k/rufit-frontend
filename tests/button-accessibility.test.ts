import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as tokens from '../src/theme/tokens.ts';
const require = createRequire(`${process.cwd()}/package.json`);
// 실제 버튼과 RNW 렌더러를 사용합니다. CSS가 필요 없는 접근성 검증에는 동일 토큰의 네이티브 스타일을 연결합니다.
function loadComponent(path: string, overrides: Record<string, unknown>) {
  const source = readFileSync(path, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports: Record<string, unknown> = {};
  new Function('require', 'exports', outputText)(
    (name: string) => (name in overrides ? overrides[name] : require(name)),
    exports,
  );
  return exports;
}
const nativeWeb = require('react-native-web');
const styles = loadComponent('src/components/Button.styles.ts', {
  'react-native': nativeWeb,
  '../theme/tokens': tokens,
});
const { Button } = loadComponent('src/components/Button.tsx', {
  'react-native': nativeWeb,
  './Button.styles': styles,
  '../theme/tokens': tokens,
}) as { Button: React.ComponentType<{ title: string; loading: boolean; onPress(): void }> };
test('실제 웹 버튼이 처리 중 상태를 aria-busy와 disabled로 전달한다', () => {
  for (const loading of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(Button, { title: '저장', loading, onPress() {} }),
    );
    assert.match(html, new RegExp(`aria-busy="${loading}"`));
    if (loading) {
      assert.match(html, /aria-disabled="true"/);
      assert.match(html, /처리 중/);
    } else assert.doesNotMatch(html, /aria-disabled="true"/);
  }
});
