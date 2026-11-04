import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
// JSX 동작은 실제 RNW로 실행합니다. 기기 전용 안전영역과 SVG 도형만 DOM 표현으로 연결합니다.
export function nativeWebLoader(mocks: Record<string, unknown> = {}) {
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
        Object.hasOwn(mocks, name)
          ? mocks[name]
          : name === 'expo-image-picker'
            ? {
                launchCameraAsync: () => {
                  throw new Error('사진 선택 테스트에는 명시적인 기기 모의 응답이 필요합니다.');
                },
                launchImageLibraryAsync: () => {
                  throw new Error('사진 선택 테스트에는 명시적인 기기 모의 응답이 필요합니다.');
                },
              }
            : name === 'expo-crypto'
              ? { randomUUID }
              : name === 'react-native'
                ? require('react-native-web')
                : name === 'react-native-safe-area-context'
                  ? { SafeAreaView: require('react-native-web').View }
                  : name === 'react-native-svg'
                    ? {
                        __esModule: true,
                        default: 'svg',
                        Path: 'path',
                        Circle: 'circle',
                        Rect: 'rect',
                      }
                    : name.startsWith('.')
                      ? load(resolve(dirname(path), name))
                      : require(name),
      exports,
    );
    return exports;
  }
  return load;
}
