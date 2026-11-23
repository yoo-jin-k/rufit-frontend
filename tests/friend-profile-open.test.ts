import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('친구를 눌러 프로필을 못 열면 아무 반응 없이 끝나지 않고 이유를 알려 줍니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    ShadowRoot: dom.window.ShadowRoot,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({
    'expo-crypto': { randomUUID: () => 'test-request-id' },
    '../../components/ScreenLayout': {
      ui: {},
      ScreenLayout: ({ children }: { children: ReactNode }) => createElement('div', null, children),
    },
  });
  const { ServerFriendsScreen } = load('src/features/profile/ServerFriendsScreen.tsx') as {
    ServerFriendsScreen: ComponentType<Record<string, unknown>>;
  };
  let failProfile = true;
  let signedIn = true;
  const api = {
    posts: async () => ({ items: [], hasNext: false, total: 0 }),
    directorySettings: async () => ({
      memberId: 'me',
      nickname: '테스트 회원',
      discoverable: true,
      version: 1,
    }),
    friends: async () => ({ items: [{ memberId: 'friend', nickname: '운동 친구' }] }),
    friendRequests: async () => ({ incoming: [], outgoing: [] }),
    memberProfile: async (id: string) => {
      if (failProfile) throw new Error('친구 프로필을 불러오지 못했어요.');
      return { memberId: id, nickname: '운동 친구', relationship: 'FRIEND' };
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
    await act(async () =>
      root.render(
        createElement(ServerFriendsScreen, {
          session: { api, isActive: () => signedIn },
          nickname: '테스트 회원',
          onClose() {},
        }),
      ),
    );
    await click('운동 친구 프로필 보기');
    // 실패 이유가 목록 위치와 상관없이 보이는 알림으로도 나옵니다.
    assert.equal(
      document.querySelectorAll('[role="alert"]').length >= 2,
      true,
      '맨 위 오류와 알림이 함께 보여야 합니다.',
    );
    assert.match(document.body.textContent!, /친구 프로필을 불러오지 못했어요/);

    // 로그인이 풀린 상태에서 누르면 다시 로그인하라고 알려 줍니다.
    signedIn = false;
    await click('운동 친구 프로필 보기');
    assert.match(document.body.textContent!, /다시 로그인해 주세요/);

    // 정상일 때는 친구 프로필로 이동합니다.
    signedIn = true;
    failProfile = false;
    await click('운동 친구 프로필 보기');
    // 친구 홈: 닉네임 제목, 관계, 오운완 수, 친구 공개 오운완 목록이 보입니다.
    assert.match(document.body.textContent!, /친구 공개 오운완/);
    assert.match(document.body.textContent!, /0오운완/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
