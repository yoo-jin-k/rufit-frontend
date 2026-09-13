import { ApiError, createRufitApi } from './client.ts';
import type { Draft } from './client.ts';

export type AccountScope = { server: string; accountId: string };
type Options = Parameters<typeof createRufitApi>[0];

// Capture one token for the whole session so account changes cannot occur between /me and a write.
// After expiry, create a new verified session; never persist the token with the outbox.
export async function createRufitSession(options: Options) {
  const token = await options.getAccessToken();
  let closed = false;
  const api = createRufitApi({ ...options, getAccessToken: () => closed ? null : token });
  const account = await api.me();
  if (!account || typeof account.id !== 'string' || !account.id.trim() || account.id.length > 100)
    throw new ApiError(200, 'INVALID_RESPONSE', '계정 정보를 확인하지 못했습니다.');
  const scope: AccountScope = { server: new URL(options.baseUrl).toString().replace(/\/$/, ''), accountId: account.id };
  return {
    scope: Object.freeze(scope),
    api: Object.freeze(api),
    isActive: () => !closed,
    saveDraft: (id: string, draft: Draft) => api.saveDraft(id, draft),
    close: () => { closed = true; },
  };
}
export type RufitSession = Awaited<ReturnType<typeof createRufitSession>>;
