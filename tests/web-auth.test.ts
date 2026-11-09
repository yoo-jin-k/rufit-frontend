import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebAuthBrowser, createWebSessionStore } from '../src/features/auth/webAuth.ts';

test('web login reports popup blocking before any provider navigation', () => {
  const browser = createWebAuthBrowser({ open: () => null } as unknown as Window);
  assert.throws(() => browser.prepare(), /팝업/);
});

test('web popup ignores other paths, returns exact callback and clears URL before close', async () => {
  let tick = () => {};
  let cleared = false;
  let scrubbed = false;
  const popup = { closed: false, location: { href: 'about:blank', replace(url: string) { this.href = url; } },
    history: { replaceState() { scrubbed = true; } }, close() { this.closed = true; } };
  const browser = createWebAuthBrowser({ open: () => popup,
    setInterval: (fn: () => void) => { tick = fn; return 1; }, clearInterval: () => { cleared = true; },
  } as unknown as Window);
  browser.prepare();
  const result = browser.open('https://kauth.kakao.com/oauth/authorize', 'http://localhost:8100/auth/callback.html');
  tick();
  assert.equal(popup.closed, false);
  popup.location.href = 'http://localhost:8100/other?handoffCode=example';
  tick();
  assert.equal(popup.closed, false);
  popup.location.href = 'http://localhost:8100/auth/callback.html?attemptId=example';
  tick();
  assert.deepEqual(await result, { type: 'success', url: popup.location.href });
  assert.equal(cleared && scrubbed && popup.closed, true);
});

test('closing login resolves pending operation as cancelled', async () => {
  const popup = { closed: false, location: { replace() {} }, close() { this.closed = true; } };
  const browser = createWebAuthBrowser({ open: () => popup, setInterval: () => 1, clearInterval() {} } as unknown as Window);
  browser.prepare();
  const pending = browser.open('https://kauth.kakao.com', 'http://localhost:8100/auth/callback.html');
  browser.close();
  assert.deepEqual(await pending, { type: 'cancel' });
  assert.equal(popup.closed, true);
});

test('invalid saved web session is rejected and logout removes only authentication data', async () => {
  const items = new Map([['rufit.web-auth-session.v1', '{invalid'], ['workout', 'keep']]);
  const storage = { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => items.set(k,v), removeItem: (k: string) => items.delete(k) } as unknown as Storage;
  const store = createWebSessionStore(storage);
  await assert.rejects(store.load!());
  await store.clear();
  assert.equal(await store.hasSavedSession(), false);
  assert.equal(items.get('workout'), 'keep');
});
