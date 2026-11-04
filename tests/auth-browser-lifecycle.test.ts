import test from 'node:test';
import assert from 'node:assert/strict';
import { authBrowserLifecycle } from '../src/features/auth/authBrowserLifecycle.ts';

test('로그인 복귀 후 브라우저를 중복 닫지 않습니다', async () => {
 let closes = 0;
 const browser = authBrowserLifecycle(async () => ({ type: 'success' }), () => { closes++; });
 await browser.open('https://example.com', 'rufit://auth/callback');
 browser.close();
 assert.equal(closes, 0);
});
test('진행 중인 로그인 취소는 한 번만 닫고 실패 후에는 다시 닫지 않습니다', async () => {
 let reject!: (error: Error) => void;
 let closes = 0;
 const browser = authBrowserLifecycle(() => new Promise((_, fail) => { reject = fail; }), () => { closes++; });
 const pending = browser.open('https://example.com', 'rufit://auth/callback');
 browser.close(); browser.close();
 assert.equal(closes, 1);
 reject(new Error('cancel'));
 await assert.rejects(pending);
 browser.close();
 assert.equal(closes, 1);
});
