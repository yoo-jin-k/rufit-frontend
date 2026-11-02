import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('서버 친구 화면은 실명 대신 닉네임을 표시하고 수락 뒤 목록을 다시 읽습니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, ShadowRoot: dom.window.ShadowRoot, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({
    'expo-crypto': { randomUUID: () => 'test-request-id' },
    '../../components/ScreenLayout': { ui: {}, ScreenLayout: ({ children }: {children: ReactNode}) => createElement('div', null, children) },
  });
  const { ServerFriendsScreen } = load('src/features/profile/ServerFriendsScreen.tsx') as { ServerFriendsScreen: ComponentType<Record<string, unknown>> };
  const root = createRoot(document.getElementById('root')!);
  let accepted = false, updates = 0;
  const api = {
    directorySettings: async () => ({ memberId: 'me', nickname: '테스트 회원', discoverable: false, version: 1 }),
    friends: async () => ({ items: accepted ? [{ memberId: 'friend', nickname: '운동 친구' }] : [] }),
    friendRequests: async () => ({ incoming: accepted ? [] : [{ id: 'request', requesterId: 'friend', targetId: 'me', requesterNickname: '운동 친구', targetNickname: '테스트 회원', state: 'PENDING' }], outgoing: [] }),
    respondFriendRequest: async (id: string, action: string) => { assert.equal(id, 'request'); assert.equal(action, 'ACCEPT'); accepted = true; },
    updateDirectory: async () => { updates++; },
  };
  try {
    await act(async () => root.render(createElement(ServerFriendsScreen, { session: { api, isActive: () => true }, nickname: '기기 닉네임', onClose() {} })));
    assert.equal(updates, 0, '화면 진입만으로 검색 허용을 변경하면 안 됩니다.');
    assert.match(document.body.textContent!, /받은 신청 · 1/);
    assert.match(document.body.textContent!, /친구 · 0/);
    const accept = document.querySelector('[aria-label="수락"]'); assert.ok(accept);
    await act(async () => accept.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.match(document.body.textContent!, /받은 신청 · 0/);
    assert.match(document.body.textContent!, /친구 · 1/);
  } finally { await act(async () => root.unmount()); dom.window.close(); }
});
