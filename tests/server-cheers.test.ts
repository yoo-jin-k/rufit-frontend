import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { nativeWebLoader } from './helpers/nativeWeb.ts';
import { createRufitApi } from '../src/api/client.ts';
import type { RufitSession } from '../src/api/session.ts';
import type { useServerLive as Hook } from '../src/features/cheers/useServerLive.ts';

test('운동 상태와 응원 요청에는 본인 계정 ID 대신 운동과 수신자만 포함합니다', async () => {
  const calls: unknown[] = [];
  const api = createRufitApi({
    baseUrl: 'https://api.example.test',
    getAccessToken: () => 'token',
    fetch: async (url, init) => {
      calls.push([String(url), init?.method, init?.body ? JSON.parse(String(init.body)) : null]);
      return new Response(null, { status: 204 });
    },
  });
  await api.shareLiveWorkout(true);
  await api.liveHeartbeat('session-1', true);
  await api.cheerWorkout('friend', 'session-1');
  await api.liveHeartbeat('session-1', false);
  assert.deepEqual(calls, [
    ['https://api.example.test/api/v1/social/live/sharing', 'PUT', { enabled: true }],
    ['https://api.example.test/api/v1/social/live/mine/session-1', 'PUT', { active: true }],
    ['https://api.example.test/api/v1/social/live/friend/session-1/cheer', 'POST', null],
    ['https://api.example.test/api/v1/social/live/mine/session-1', 'PUT', { active: false }],
  ]);
});

test('공유 동의·종료·백그라운드 신호와 전송 실패를 실제 훅에서 검증합니다', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    ShadowRoot: dom.window.ShadowRoot,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  let appState = 'active';
  const listeners = new Set<() => void>();
  const load = nativeWebLoader({
    'react-native': {
      AppState: {
        get currentState() {
          return appState;
        },
        addEventListener: (_event: string, fn: () => void) => {
          listeners.add(fn);
          return { remove: () => listeners.delete(fn) };
        },
      },
    },
  });
  const { useServerLive } = load('src/features/cheers/useServerLive.ts') as {
    useServerLive: typeof Hook;
  };
  const root = createRoot(document.getElementById('root')!);
  let live!: ReturnType<typeof Hook>;
  let sharing = false,
    sent = false,
    fail = true;
  const heartbeats: unknown[] = [];
  const session = {
    isActive: () => true,
    api: {
      liveWorkouts: async () => ({
        sharing,
        workoutId: sharing ? 'one' : null,
        items: [{ memberId: 'friend', nickname: '친구', workoutId: 'friend-workout', sent }],
        received: [],
      }),
      shareLiveWorkout: async (enabled: boolean) => {
        sharing = enabled;
      },
      liveHeartbeat: async (id: string, active: boolean) => {
        heartbeats.push([id, active]);
      },
      cheerWorkout: async () => {
        if (fail) throw new Error('전송 실패');
        sent = true;
      },
    },
  } as unknown as RufitSession;
  function Harness({ workout }: { workout: string | null }) {
    live = useServerLive(session, workout);
    return null;
  }
  try {
    await act(async () => root.render(createElement(Harness, { workout: 'one' })));
    assert.deepEqual(heartbeats, []);
    await act(async () => {
      await live.share(true);
    });
    assert.deepEqual(heartbeats, [['one', true]]);
    await act(async () => {
      assert.equal(await live.cheer('friend', 'friend-workout'), false);
    });
    assert.match(live.error, /전송 실패/);
    assert.equal(live.data!.items[0].sent, false);
    fail = false;
    await act(async () => {
      assert.equal(await live.cheer('friend', 'friend-workout'), true);
    });
    assert.equal(live.data!.items[0].sent, true);
    await act(async () => {
      appState = 'background';
      listeners.forEach((fn) => fn());
    });
    assert.deepEqual(heartbeats.at(-1), ['one', false]);
    await act(async () => {
      appState = 'active';
      listeners.forEach((fn) => fn());
    });
    assert.deepEqual(heartbeats.at(-1), ['one', true]);
    await act(async () => root.render(createElement(Harness, { workout: null })));
    assert.deepEqual(heartbeats.at(-1), ['one', false]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test('이전 계정에서 늦게 도착한 친구 응답은 새 계정에 노출되지 않습니다', async () => {
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
    'react-native': {
      AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    },
  });
  const { useServerLive } = load('src/features/cheers/useServerLive.ts') as {
    useServerLive: typeof Hook;
  };
  const root = createRoot(document.getElementById('root')!);
  let release!: (value: unknown) => void;
  const old = {
    isActive: () => true,
    api: {
      liveWorkouts: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    },
  } as unknown as RufitSession;
  const next = {
    isActive: () => true,
    api: {
      liveWorkouts: async () => ({ sharing: false, workoutId: null, items: [], received: [] }),
    },
  } as unknown as RufitSession;
  let live!: ReturnType<typeof Hook>;
  function Harness({ session }: { session: RufitSession }) {
    live = useServerLive(session, null);
    return null;
  }
  try {
    await act(async () => root.render(createElement(Harness, { session: old })));
    await act(async () => root.render(createElement(Harness, { session: next })));
    await act(async () =>
      release({
        sharing: true,
        workoutId: 'old',
        items: [{ memberId: 'private-friend' }],
        received: [],
      }),
    );
    assert.equal(live.data?.sharing, false);
    assert.deepEqual(live.data?.items, []);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
