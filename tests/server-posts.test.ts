import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';
import { createRufitApi } from '../src/api/client.ts';

test('계정 게시물 요청은 공개 범위를 보존하고 사진을 목록 조회에 보내지 않습니다', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const api = createRufitApi({
    baseUrl: 'https://api.example.test',
    getAccessToken: () => 'token',
    fetch: async (url, init) => {
      calls.push({
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return Response.json({});
    },
  });
  await api.posts('friend/id', 1);
  await api.likePost('post/id', true);
  await api.hidePost('post/id');
  assert.deepEqual(calls, [
    {
      url: 'https://api.example.test/api/v1/social/posts?page=1&memberId=friend%2Fid',
      method: 'GET',
      body: null,
    },
    {
      url: 'https://api.example.test/api/v1/social/posts/post%2Fid/like',
      method: 'PUT',
      body: { liked: true },
    },
    {
      url: 'https://api.example.test/api/v1/social/posts/post%2Fid/hide',
      method: 'POST',
      body: null,
    },
  ]);
});

test('친구 게시물은 서버에서 사진과 좋아요를 읽고 실패한 좋아요를 완료로 표시하지 않습니다', async () => {
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
    '../../components/ScreenLayout': {
      ui: {},
      ScreenLayout: ({ children, footer }: { children: ReactNode; footer: ReactNode }) =>
        createElement('div', null, children, footer),
    },
  });
  const { ServerPostDetail } = load('src/features/posts/ServerPosts.tsx') as {
    ServerPostDetail: ComponentType<Record<string, unknown>>;
  };
  const root = createRoot(document.getElementById('root')!);
  let attempts = 0,
    liked = false;
  const post = () => ({
    id: 'post',
    nickname: '운동친구',
    date: '2026-11-04',
    summary: '3종목',
    photos: ['data:image/jpeg;base64,eA=='],
    memo: '완료했어요',
    visibility: 'FRIENDS',
    likes: liked ? 1 : 0,
    liked,
    mine: false,
  });
  const session = {
    isActive: () => true,
    api: {
      post: async () => post(),
      likePost: async (id: string, value: boolean) => {
        assert.equal(id, 'post');
        attempts++;
        if (attempts === 1) throw new Error('네트워크 오류');
        liked = value;
        return post();
      },
    },
  };
  const click = async (label: string) => {
    const item = document.querySelector(`[aria-label="${label}"]`);
    assert.ok(item, label);
    await act(async () =>
      item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    );
  };
  try {
    await act(async () =>
      root.render(createElement(ServerPostDetail, { session, id: 'post', onClose() {} })),
    );
    assert.match(document.body.textContent!, /완료했어요/);
    assert.match(document.body.textContent!, /좋아요 0개/);
    await click('♡ 좋아요');
    assert.match(document.body.textContent!, /네트워크 오류/);
    assert.match(document.body.textContent!, /좋아요 0개/);
    await click('♡ 좋아요');
    assert.match(document.body.textContent!, /좋아요 1개/);
    await click('♥ 좋아요 취소');
    assert.match(document.body.textContent!, /좋아요 0개/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
