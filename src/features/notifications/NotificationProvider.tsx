import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { RufitSession } from '../../api/session';
import type { ServerNotification } from '../../api/client';

type State = {
  session: RufitSession | null; accountMode: boolean; items: ServerNotification[];
  unreadCount: number; hasNext: boolean; busy: boolean; error: string;
  refresh: (more?: boolean) => Promise<void>;
};
const Context = createContext<State | null>(null);
export const useServerNotifications = () => useContext(Context);

/** 한 계정의 알림 조회를 모든 메뉴가 공유하고, 계정 변경 시 이전 상태를 폐기합니다. */
export function NotificationProvider({ session, accountMode, children }: {
  session: RufitSession | null; accountMode: boolean; children: ReactNode;
}) {
  return <InboxProvider key={session ? `${session.scope.server}:${session.scope.accountId}` : 'guest'} session={session} accountMode={accountMode}>{children}</InboxProvider>;
}
function InboxProvider({ session, accountMode, children }: { session: RufitSession | null; accountMode: boolean; children: ReactNode }) {
  const [items, setItems] = useState<ServerNotification[]>([]);
  const [unreadCount, setUnread] = useState(0), [hasNext, setNext] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const alive = useRef(true), sequence = useRef(0), cursor = useRef<string | undefined>(undefined);
  const refresh = useCallback(async (more = false) => {
    if (!session?.isActive()) return;
    const request = ++sequence.current; setBusy(true);
    try {
      const data = await session.api.notifications(more ? cursor.current : undefined);
      if (!alive.current || !session.isActive() || request !== sequence.current) return;
      setItems(previous => more ? [...previous, ...data.items.filter(item => !previous.some(p => p.id === item.id))] : data.items);
      setUnread(data.unreadCount); setNext(data.hasNext); setError('');
      cursor.current = data.items.at(-1)?.id;
    } catch (cause) {
      if (alive.current && session?.isActive() && request === sequence.current) setError(cause instanceof Error ? cause.message : '알림을 불러오지 못했습니다.');
    } finally { if (alive.current && request === sequence.current) setBusy(false); }
  }, [session]);
  useEffect(() => {
    alive.current = true;
    const requests = sequence;
    // 초기 조회도 비동기로 시작하여 렌더링 중 상태 갱신을 피합니다.
    void Promise.resolve().then(() => { if (alive.current) void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { alive.current = false; requests.current++; clearInterval(timer); listener.remove(); };
  }, [refresh]);
  return <Context.Provider value={{ session, accountMode, items, unreadCount, hasNext, busy, error, refresh }}>{children}</Context.Provider>;
}
