import { ApiError, createRufitApi } from './client.ts';
import type { Draft } from './client.ts';

export type AccountScope = { server: string; accountId: string };
type Options = Parameters<typeof createRufitApi>[0];

// 계정 확인과 쓰기 요청 사이에 계정이 바뀌지 않도록 한 세션에서 같은 토큰을 사용합니다.
// 만료 후에는 검증된 세션을 새로 생성하며, 토큰을 전송 대기 큐에 저장하지 않습니다.
export async function createRufitSession(options: Options) {
  const token = await options.getAccessToken();
  let closed = false;
  const api = createRufitApi({ ...options, getAccessToken: () => (closed ? null : token) });
  const account = await api.me();
  if (!account || typeof account.id !== 'string' || !account.id.trim() || account.id.length > 100)
    throw new ApiError(200, 'INVALID_RESPONSE', '계정 정보를 확인하지 못했습니다.');
  const scope: AccountScope = {
    server: new URL(options.baseUrl).toString().replace(/\/$/, ''),
    accountId: account.id,
  };
  return {
    scope: Object.freeze(scope),
    api: Object.freeze(api),
    isActive: () => !closed,
    saveDraft: (id: string, draft: Draft) => api.saveDraft(id, draft),
    close: () => {
      closed = true;
    },
  };
}
export type RufitSession = Awaited<ReturnType<typeof createRufitSession>>;
