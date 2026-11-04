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

test('계정 게시물 삭제는 확인 후 전송하며 실패하면 화면과 게시물을 보존합니다', async () => {
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
  let calls = 0,
    closed = false;
  const session = {
    isActive: () => true,
    api: {
      post: async () => ({
        id: 'post',
        sourceId: 'workout',
        version: 4,
        date: '2026-11-04',
        summary: '원본 유지',
        memo: '완료',
        photos: [],
        visibility: 'PRIVATE',
        likes: 0,
        mine: true,
      }),
      deletePost: async (id: string, version: number) => {
        assert.equal(id, 'post');
        assert.equal(version, 4);
        calls++;
        if (calls === 1) throw new Error('삭제 연결 실패');
      },
    },
  };
  const root = createRoot(document.getElementById('root')!);
  const click = async (label: string) => {
    const el = document.querySelector(`[aria-label="${label}"]`);
    assert.ok(el, label);
    await act(async () => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  };
  try {
    await act(async () =>
      root.render(
        createElement(ServerPostDetail, {
          session,
          id: 'post',
          onClose: () => {
            closed = true;
          },
        }),
      ),
    );
    await click('계정 게시물 삭제');
    assert.equal(calls, 0);
    assert.match(document.body.textContent!, /운동 기록과 기기 저장본은 유지/);
    await click('삭제 취소');
    assert.equal(calls, 0);
    await click('계정 게시물 삭제');
    await click('확인 후 게시물 삭제');
    assert.equal(closed, false);
    assert.match(document.body.textContent!, /삭제 연결 실패/);
    await click('확인 후 게시물 삭제');
    assert.equal(closed, true);
    assert.equal(calls, 2);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test('다른 기기 게시물 편집도 날짜와 요약을 보존하며 저장 실패 후 다시 시도합니다', async () => {
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
  const { ServerPostEditor } = load('src/features/posts/ServerPostEditor.tsx') as {
    ServerPostEditor: ComponentType<Record<string, unknown>>;
  };
  const post = {
    id: 'post',
    sourceId: 'original',
    version: 3,
    date: '2026-11-01',
    summary: '5종목',
    memo: '기존 글',
    photos: ['data:image/jpeg;base64,eA=='],
    visibility: 'PRIVATE',
    mine: true,
  };
  let attempts = 0,
    saved = false;
  const session = {
    isActive: () => true,
    api: {
      savePost: async (source: string, body: Record<string, unknown>) => {
        assert.equal(source, 'original');
        assert.equal(body.version, 3);
        assert.equal(body.date, '2026-11-01');
        assert.equal(body.summary, '5종목');
        assert.equal(body.visibility, 'FRIENDS');
        assert.deepEqual(body.photos, []);
        if (++attempts === 1) throw new Error('저장 연결 실패');
        return { ...post, ...body };
      },
    },
  };
  const root = createRoot(document.getElementById('root')!);
  const click = async (label: string) => {
    const el = document.querySelector(`[aria-label="${label}"]`);
    assert.ok(el, label);
    await act(async () => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  };
  try {
    await act(async () =>
      root.render(
        createElement(ServerPostEditor, {
          session,
          post,
          onSaved: () => {
            saved = true;
          },
          onClose() {},
        }),
      ),
    );
    await click('친구 공개');
    await click('1번 사진 삭제');
    await click('변경 내용 저장');
    assert.equal(saved, false);
    assert.match(document.body.textContent!, /저장 연결 실패/);
    await click('변경 내용 저장');
    assert.equal(saved, true);
    assert.equal(attempts, 2);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test('편집 충돌은 초안을 유지하고 반복 저장을 막으며 명시적으로 버릴 때만 닫습니다', async () => {
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
  const { ServerPostEditor } = load('src/features/posts/ServerPostEditor.tsx') as {
    ServerPostEditor: ComponentType<Record<string, unknown>>;
  };
  const { ApiError } = load('src/api/client.ts') as {
    ApiError: new (status: number, code: string, message: string) => Error;
  };
  let attempts = 0,
    closed = false;
  const session = {
    isActive: () => true,
    api: {
      savePost: async () => {
        attempts++;
        throw new ApiError(409, 'CONFLICT', '최신 게시물 충돌');
      },
    },
  };
  const root = createRoot(document.getElementById('root')!);
  const click = async (label: string) => {
    const el = document.querySelector(`[aria-label="${label}"]`);
    assert.ok(el, label);
    await act(async () => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  };
  try {
    await act(async () =>
      root.render(
        createElement(ServerPostEditor, {
          session,
          post: {
            sourceId: 'old',
            version: 2,
            date: '2026-11-04',
            summary: '운동',
            memo: '보존할 초안',
            photos: [],
            visibility: 'PRIVATE',
          },
          onSaved() {
            assert.fail('충돌 저장 성공 처리 금지');
          },
          onClose() {
            closed = true;
          },
        }),
      ),
    );
    await click('친구 공개');
    await click('변경 내용 저장');
    assert.match(document.body.textContent!, /최신 게시물 충돌/);
    assert.equal(
      (document.querySelector('[aria-label="오운완 글"]') as HTMLTextAreaElement).value,
      '보존할 초안',
    );
    assert.equal(
      document.querySelector('[aria-label="변경 내용 저장"]')?.getAttribute('aria-disabled'),
      'true',
    );
    assert.equal(attempts, 1);
    await click('편집 닫기');
    assert.equal(closed, false);
    await click('계속 편집');
    assert.equal(closed, false);
    await click('편집 닫기');
    await click('변경 내용 버리고 닫기');
    assert.equal(closed, true);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test('게시물 조회 실패는 로딩을 종료하고 등록 안내 후 재시도로 복구됩니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    ShadowRoot: dom.window.ShadowRoot,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  const load = nativeWebLoader({ '../../components/ScreenLayout': { ui: {} } });
  const { ServerPostList } = load('src/features/posts/ServerPosts.tsx') as {
    ServerPostList: ComponentType<Record<string, unknown>>;
  };
  const { ApiError } = load('src/api/client.ts') as {
    ApiError: new (status: number, code: string, message: string) => Error;
  };
  let attempts = 0;
  const statuses: string[] = [],
    totals: number[] = [];
  const session = {
    isActive: () => true,
    api: {
      posts: async () => {
        if (++attempts === 1) throw new ApiError(404, 'NOT_FOUND', '찾을 수 없습니다.');
        return { items: [], total: 0, hasNext: false };
      },
    },
  };
  const root = createRoot(document.getElementById('root')!);
  try {
    await act(async () =>
      root.render(
        createElement(ServerPostList, {
          session,
          onLoadStatus: (status: string) => statuses.push(status),
          onTotal: (n: number) => totals.push(n),
        }),
      ),
    );
    assert.deepEqual(statuses, ['loading', 'error']);
    assert.deepEqual(totals, []);
    assert.match(document.body.textContent!, /닉네임을 먼저 저장/);
    assert.doesNotMatch(document.body.textContent!, /불러오고 있습니다/);
    const retry = document.querySelector('[aria-label="게시물 새로고침"]');
    assert.ok(retry);
    await act(async () =>
      retry.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
    );
    assert.deepEqual(statuses, ['loading', 'error', 'loading', 'ready']);
    assert.deepEqual(totals, [0]);
    assert.doesNotMatch(document.body.textContent!, /닉네임을 먼저 저장/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
