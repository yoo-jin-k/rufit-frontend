import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('사진 5장에서도 삭제 가능하고 작성 취소 확인 뒤 계속 작성할 수 있습니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, ShadowRoot: dom.window.ShadowRoot, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({
    'expo-image-picker': {},
    '../../components/ScreenLayout': {
      ui: {}, ScreenLayout: ({ children, footer }: { children: ReactNode; footer: ReactNode }) => createElement('div', null, children, footer),
    },
  });
  const { JournalComposer } = load('src/features/profile/JournalComposer.tsx') as { JournalComposer: ComponentType<Record<string, unknown>> };
  const root = createRoot(document.getElementById('root')!);
  let closes = 0;
  const click = async (label: string) => {
    const element = [...document.querySelectorAll('[role="button"]')].find((item) => item.getAttribute('aria-label') === label || item.textContent === label);
    assert.ok(element, label);
    assert.notEqual(element.getAttribute('aria-disabled'), 'true');
    await act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  };
  try {
    await act(async () => root.render(createElement(JournalComposer, {
      workout: { id: 'test', startedAt: 0, finishedAt: 1000, exercises: [] },
      initial: { workoutId: 'test', memo: '', photos: Array.from({ length: 5 }, (_, i) => `data:image/jpeg;base64,${i}`), visibility: 'private', createdAt: 1 },
      onClose: () => { closes++; }, onSave: async () => {},
    })));
    await click('5번 사진 삭제');
    assert.match(document.body.textContent!, /4\/5장/);
    await click('수정 취소');
    assert.match(document.body.textContent!, /작성 중인 내용을 버릴까요/);
    assert.equal(closes, 0);
    await click('계속 작성하기');
    assert.match(document.body.textContent!, /4\/5장/);
    await click('수정 취소');
    await click('변경 내용 버리기');
    assert.equal(closes, 1);
  } finally { await act(async () => root.unmount()); dom.window.close(); }
});
