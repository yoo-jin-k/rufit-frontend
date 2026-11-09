import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Workout } from '../workout/model';
import { isWorkout } from '../workout/storage';

export type JournalDraft = { workout: Workout; memo: string; photos: string[]; visibility: 'private' | 'friends' };
const queues = new Map<string, Promise<void>>();
const key = (scope: string) => `rufit.journal-draft.v1:${encodeURIComponent(scope)}`;
/** 권한 설정으로 앱이 종료되어도 작성본을 복구합니다. 계정별 키를 사용하고 로그에는 내용을 남기지 않습니다. */
export const journalDraftStorage = {
  async load(scope: string): Promise<JournalDraft | null> {
    await queues.get(scope)?.catch(() => {});
    const raw = await AsyncStorage.getItem(key(scope));
    if (!raw) return null;
    const v = JSON.parse(raw) as JournalDraft;
    if (!isWorkout(v.workout) || typeof v.memo !== 'string' || v.memo.length > 200 ||
      !Array.isArray(v.photos) || v.photos.length > 5 || v.photos.some(p => typeof p !== 'string' || !p.startsWith('data:image/')) ||
      !['private', 'friends'].includes(v.visibility)) throw new Error('작성 중인 오운완을 불러오지 못했습니다.');
    return v;
  },
  save(scope: string, draft: JournalDraft | null) {
    const raw = draft ? JSON.stringify(draft) : null;
    const next = (queues.get(scope) ?? Promise.resolve()).catch(() => {}).then(() =>
      raw === null ? AsyncStorage.removeItem(key(scope)) : AsyncStorage.setItem(key(scope), raw));
    queues.set(scope, next);
    return next;
  },
};
