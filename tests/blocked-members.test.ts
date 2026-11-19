import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('설정의 차단 목록은 확인 후에만 차단을 풀고 목록을 다시 읽습니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    ShadowRoot: dom.window.ShadowRoot,
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 0),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
  });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({
    '../../components/kit/Screen': {
      Screen: ({ children, header }: { children: ReactNode; header: ReactNode }) =>
        createElement('div', null, header, children),
      NavBar: ({ title, onLeading }: { title: string; onLeading: () => void }) =>
        createElement('button', { 'aria-label': '뒤로', onClick: onLeading }, title),
    },
  });
  const { BlockedMembers } = load('src/features/settings/BlockedMembers.tsx') as {
    BlockedMembers: ComponentType<Record<string, unknown>>;
  };
  let blocked = [{ memberId: 'friend', nickname: '운동 친구' }];
  const unblocked: string[] = [];
  const session = {
    api: {
      blockedMembers: async () => ({ items: blocked }),
      unblockMember: async (id: string) => {
        unblocked.push(id);
        blocked = [];
        return null;
      },
    },
  };
  const root = createRoot(document.getElementById('root')!);
  const click = async (label: string) => {
    const element = document.querySelector(`[aria-label="${label}"]`);
    assert.ok(element, label);
    await act(async () =>
      element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    );
  };
  try {
    await act(async () => root.render(createElement(BlockedMembers, { session, onBack() {} })));
    assert.match(document.body.textContent!, /운동 친구/);
    await click('운동 친구 차단 해제');
    assert.deepEqual(unblocked, [], '확인 전에는 차단을 풀지 않습니다.');
    assert.match(document.body.textContent!, /예전 친구 관계는 돌아오지 않아요/);
    await click('해제');
    assert.deepEqual(unblocked, ['friend']);
    assert.match(document.body.textContent!, /차단한 회원이 없어요/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
