import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('실패한 조회만 재시도하며 동시 요청과 해제 이후 호출을 막습니다', async () => {
 const dom = new JSDOM('<div id="root"></div>');
 Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
 const { createRoot } = await import('react-dom/client');
 let tick: (() => void) | undefined, active: ((state: string) => void) | undefined;
 let cleared = 0, removed = 0, calls = 0;
 const oldSet = globalThis.setInterval, oldClear = globalThis.clearInterval;
 globalThis.setInterval = ((fn: () => void) => { tick = fn; return 1; }) as unknown as typeof setInterval;
 globalThis.clearInterval = (() => { cleared++; }) as typeof clearInterval;
 const load = nativeWebLoader({ 'react-native': { AppState: { currentState: 'active', addEventListener: (_: string, fn: (state: string) => void) => { active = fn; return { remove() { removed++; } }; } } } });
 const { useReadRecovery } = load('src/hooks/useReadRecovery.ts') as { useReadRecovery: (failed: boolean, read: () => Promise<void>) => void };
 let resolve!: () => void;
 const read = () => { calls++; return new Promise<void>(yes => { resolve = yes; }); };
 function Probe({ failed }: { failed: boolean }) { useReadRecovery(failed, read); return null; }
 const root = createRoot(document.getElementById('root')!);
 try {
  await act(async () => root.render(createElement(Probe, { failed: true })));
  await act(async () => { tick!(); active!('active'); });
  assert.equal(calls, 1);
  await act(async () => { resolve(); });
  await act(async () => root.render(createElement(Probe, { failed: false })));
  await act(async () => { tick!(); active!('active'); });
  assert.equal(calls, 1);
  assert.equal(cleared, 1); assert.equal(removed, 1);
 } finally { await act(async () => root.unmount()); globalThis.setInterval = oldSet; globalThis.clearInterval = oldClear; dom.window.close(); }
});
