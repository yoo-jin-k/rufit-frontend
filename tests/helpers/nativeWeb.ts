import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
// JSX 컴포넌트를 실제 RNW 렌더러에 연결합니다. 동작은 모킹하지 않고 플랫폼 import만 웹으로 선택합니다.
export function nativeWebLoader() {
  const require = createRequire(`${process.cwd()}/package.json`);
  const cache = new Map<string, Record<string, unknown>>();
  function load(path: string): Record<string, unknown> {
    path = resolve(path);
    if (!existsSync(path)) path = [path + '.ts', path + '.tsx'].find(existsSync)!;
    if (cache.has(path)) return cache.get(path)!;
    const exports: Record<string, unknown> = {};
    cache.set(path, exports);
    const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    });
    new Function('require', 'exports', outputText)(
      (name: string) =>
        name === 'react-native'
          ? require('react-native-web')
          : name.startsWith('.')
            ? load(resolve(dirname(path), name))
            : require(name),
      exports,
    );
    return exports;
  }
  return load;
}
