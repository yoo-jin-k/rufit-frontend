import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';

test('서버 친구 화면은 실명 대신 닉네임을 표시하고 수락 뒤 목록을 다시 읽습니다', async () => {
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
      ScreenLayout: ({ children, onBack }: { children: ReactNode; onBack: () => void }) =>
        createElement(
          'div',
          null,
          createElement('button', { 'aria-label': '뒤로', onClick: onBack }, '뒤로'),
          children,
        ),
    },
  });
  const { ServerFriendsScreen } = load('src/features/profile/ServerFriendsScreen.tsx') as {
    ServerFriendsScreen: ComponentType<Record<string, unknown>>;
  };
  const root = createRoot(document.getElementById('root')!);
  let accepted = false,
    updates = 0,
    blocked = false,
    blockCalls = 0,
    removeCalls = 0;
  const reports: string[] = [];
  const api = {
    posts: async () => ({ items: [], hasNext: false, total: 0 }),
    directorySettings: async () => ({
      memberId: 'me',
      nickname: '테스트 회원',
      discoverable: false,
      version: 1,
    }),
    blockedMembers: async () => ({
      items: blocked ? [{ memberId: 'friend', nickname: '운동 친구' }] : [],
    }),
    blockMember: async (id: string) => {
      assert.equal(id, 'friend');
      blockCalls++;
      blocked = true;
      accepted = false;
    },
    unblockMember: async () => {
      blocked = false;
    },
    friends: async () => ({
      items: accepted ? [{ memberId: 'friend', nickname: '운동 친구' }] : [],
    }),
    friendRequests: async () => ({
      incoming:
        accepted || blocked
          ? []
          : [
              {
                id: 'request',
                requesterId: 'friend',
                targetId: 'me',
                requesterNickname: '운동 친구',
                targetNickname: '테스트 회원',
                state: 'PENDING',
              },
            ],
      outgoing: [],
    }),
    respondFriendRequest: async (id: string, action: string) => {
      assert.equal(id, 'request');
      assert.equal(action, 'ACCEPT');
      accepted = true;
    },
    updateDirectory: async () => {
      updates++;
    },
    memberProfile: async (id: string) => {
      assert.equal(id, 'friend');
      return { memberId: id, nickname: '운동 친구', relationship: 'FRIEND' };
    },
    removeFriend: async (id: string) => {
      assert.equal(id, 'friend');
      removeCalls++;
      accepted = false;
    },
    reportMember: async (id: string, target: string, reason: string) => {
      assert.equal(target, 'friend');
      assert.equal(reason, 'HARASSMENT');
      reports.push(id);
      if (reports.length === 1) throw new Error('일시적인 연결 오류');
      return { id, status: 'RECEIVED' };
    },
  };
  try {
    await act(async () =>
      root.render(
        createElement(ServerFriendsScreen, {
          session: { api, isActive: () => true },
          nickname: '기기 닉네임',
          onClose() {},
        }),
      ),
    );
    assert.equal(updates, 0, '화면 진입만으로 검색 허용을 변경하면 안 됩니다.');
    assert.match(document.body.textContent!, /받은 신청 · 1/);
    assert.match(document.body.textContent!, /친구 · 0/);
    const accept = document.querySelector('[aria-label="수락"]');
    assert.ok(accept);
    await act(async () =>
      accept.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    );
    assert.match(document.body.textContent!, /받은 신청 · 0/);
    assert.match(document.body.textContent!, /친구 · 1/);
    const click = async (label: string) => {
      const element = document.querySelector(`[aria-label="${label}"]`);
      assert.ok(element, label);
      await act(async () =>
        element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
      );
    };
    await click('운동 친구 프로필 보기');
    assert.match(document.body.textContent!, /공개된 닉네임과 친구에게 공개한 오운완/);
    await click('운동 친구 더보기');
    await click('신고하기');
    await click('괴롭힘');
    await click('신고 접수');
    assert.match(document.body.textContent!, /일시적인 연결 오류/);
    await click('신고 접수');
    assert.equal(reports.length, 2);
    assert.equal(reports[0], reports[1], '응답 실패 재시도는 같은 신고 번호를 사용합니다.');
    assert.match(document.body.textContent!, /신고가 접수되었습니다/);
    assert.equal(blockCalls, 0, '신고가 차단이나 친구 해제를 자동 실행하지 않습니다.');
    await click('닫기');
    await click('친구 해제');
    assert.equal(removeCalls, 0);
    await click('친구 해제 확인');
    assert.equal(removeCalls, 1);
    assert.match(document.body.textContent!, /친구 · 0/);
    await click('수락');
    await click('운동 친구 더보기');
    assert.equal(blockCalls, 0, '더보기만 눌러서는 차단하지 않습니다.');
    await click('차단하기');
    assert.equal(blockCalls, 0);
    assert.match(document.body.textContent!, /차단 해제 후에도 복원되지 않습니다/);
    await click('차단 확인');
    assert.equal(blockCalls, 1);
    assert.match(document.body.textContent!, /친구 · 0/);
    await click('차단 목록 · 1');
    await click('차단 해제');
    assert.match(document.body.textContent!, /차단 목록 접기/);
    assert.match(document.body.textContent!, /친구 · 0/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
