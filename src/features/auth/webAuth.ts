import type { SessionStore } from './secureSessionStore.ts';
import { decodeStoredSession } from './storedSession.ts';

/** 로컬 웹 시험에서는 장기 저장을 피하고 현재 탭의 새로고침만 복원합니다. */
export function createWebSessionStore(storage: Storage): SessionStore {
  const key = 'rufit.web-auth-session.v1';
  return {
    load: async () => decodeStoredSession(storage.getItem(key)),
    save: async (value) => { storage.setItem(key, JSON.stringify(value)); },
    clear: async () => { storage.removeItem(key); },
    hasSavedSession: async () => storage.getItem(key) !== null,
  };
}

/** 사용자 클릭 안에서 창을 먼저 열어 팝업 차단을 피합니다. 다른 원점의 내용은 읽지 않습니다. */
export function createWebAuthBrowser(host: Window) {
  let popup: Window | null = null;
  let finish: ((result: { type: 'cancel' } | { type: 'success'; url: string }) => void) | null = null;
  return {
    prepare() {
      popup = host.open('about:blank', '_blank', 'popup,width=480,height=740');
      if (!popup) throw new Error('로그인 팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 뒤 다시 시도해 주세요.');
    },
    open(url: string, returnUrl: string) {
      if (!popup || popup.closed) return Promise.resolve({ type: 'cancel' } as const);
      const active = popup;
      active.location.replace(url);
      return new Promise<{ type: 'cancel' } | { type: 'success'; url: string }>((resolve) => {
        const started = Date.now();
        const expected = new URL(returnUrl);
        const timer = host.setInterval(() => {
          if (active.closed || Date.now() - started > 10 * 60_000) {
            settle({ type: 'cancel' });
            return;
          }
          try {
            const current = new URL(active.location.href);
            if (current.origin === expected.origin && current.pathname === expected.pathname) {
              const result = current.href;
              active.history.replaceState(null, '', expected.pathname);
              settle({ type: 'success', url: result });
            }
          } catch { /* 제공자 로그인 중에는 동일 출처 정책에 따라 접근하지 않습니다. */ }
        }, 200);
        const settle = (result: { type: 'cancel' } | { type: 'success'; url: string }) => {
          host.clearInterval(timer);
          finish = null;
          active.close();
          if (popup === active) popup = null;
          resolve(result);
        };
        finish = settle;
      });
    },
    close() {
      finish?.({ type: 'cancel' });
      popup?.close();
      popup = null;
    },
  };
}
