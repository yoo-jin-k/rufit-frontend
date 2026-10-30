import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { act, createElement, useState, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import ts from 'typescript';
const require = createRequire(`${process.cwd()}/package.json`);
test('웹 날짜 input 이벤트가 저장에 쓰는 React 상태까지 변경한다', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const source = readFileSync('src/features/strength/MeasurementDate.web.tsx', 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: Record<string, unknown> = {};
  new Function('require', 'exports', output)(
    (name: string) =>
      name.endsWith('.css')
        ? { default: { input: 'date' } }
        : name === './model'
          ? { today: () => '2026-10-30' }
          : require(name),
    exports,
  );
  const DateInput = exports.MeasurementDate as ComponentType<{
    value: string;
    onChange: (value: string) => void;
  }>;
  function Harness() {
    const [date, setDate] = useState('2026-10-30');
    return createElement(
      'div',
      null,
      createElement(DateInput, { value: date, onChange: setDate }),
      createElement('output', null, date),
    );
  }
  const root = createRoot(dom.window.document.getElementById('root')!);
  try {
    await act(async () => root.render(createElement(Harness)));
    const input = dom.window.document.querySelector('input')!;
    await act(async () => {
      input.value = '2026-10-01';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    assert.equal(dom.window.document.querySelector('output')!.textContent, '2026-10-01');
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
