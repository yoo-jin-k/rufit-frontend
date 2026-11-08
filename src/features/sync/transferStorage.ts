import type { AccountScope, RufitSession } from '../../api/session.ts';
export type TransferStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
const bindingKey = 'rufit.device-record-owner.v1';
export const scopeKey = (scope: AccountScope) =>
  `${encodeURIComponent(scope.server)}:${encodeURIComponent(scope.accountId)}`;
const locks = new WeakMap<TransferStorage, Promise<unknown>>();
/** 같은 앱에서 여러 전송을 누르더라도 소유권 확인과 장부 저장 순서를 유지합니다. */
export function transferSerial<T>(storage: TransferStorage, action: () => Promise<T>): Promise<T> {
  const next = (locks.get(storage) ?? Promise.resolve()).catch(() => {}).then(action);
  locks.set(storage, next);
  return next;
}
export function requireActive(session: RufitSession) {
  if (!session.isActive()) throw new Error('로그인이 변경되었습니다. 다시 로그인해 주세요.');
}
/** 기기의 기존 자료는 최초 전송한 계정에 귀속합니다. 다른 계정으로 조용히 재전송하지 않습니다. */
export async function bindDeviceRecords(storage: TransferStorage, session: RufitSession) {
  requireActive(session);
  const raw = await storage.getItem(bindingKey);
  if (raw !== null) {
    const binding = JSON.parse(raw);
    if (binding.version !== 1 || binding.scope !== scopeKey(session.scope))
      throw new Error(
        '이 기기 기록은 다른 계정에 연결되어 있습니다. 원래 계정으로 로그인해 주세요.',
      );
  } else {
    requireActive(session);
    await storage.setItem(
      bindingKey,
      JSON.stringify({ version: 1, scope: scopeKey(session.scope) }),
    );
  }
  requireActive(session);
}
