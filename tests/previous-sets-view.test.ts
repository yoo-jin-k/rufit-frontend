import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('불러오기 실패 시 선택 창과 오류를 유지하고 성공할 때만 닫습니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, ShadowRoot: dom.window.ShadowRoot, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({ '../../components/ScreenLayout': { ui: {}, ScreenLayout: ({ children }: { children: ReactNode }) => createElement('div', null, children) } });
  const { PreviousSets } = load('src/features/workout/PreviousSets.tsx') as { PreviousSets: ComponentType<Record<string, unknown>> };
  const root = createRoot(document.getElementById('root')!);
  const exercise = { id: 'e', name: '벤치프레스', sets: [{ id: 's', weight: '20', reps: '10', completed: true }] };
  let fails = true, closes = 0;
  const click = async (text: string) => {
    const button = [...document.querySelectorAll('[role="button"]')].find((item) => item.textContent === text)!;
    assert.ok(button);
    await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  };
  try {
    await act(async () => root.render(createElement(PreviousSets, {
      target: exercise, history: [{ id: 'w', startedAt: 0, finishedAt: 1000, exercises: [exercise] }],
      onClose: () => { closes++; }, onLoad: () => { if (fails) throw new Error('300세트 한도'); },
    })));
    await click('이 기록 선택'); await click('기존 세트 뒤에 추가');
    assert.equal(closes, 0); assert.match(document.body.textContent!, /300세트 한도/);
    fails = false; await click('기존 세트 뒤에 추가'); assert.equal(closes, 1);
  } finally { await act(async () => root.unmount()); dom.window.close(); }
});
