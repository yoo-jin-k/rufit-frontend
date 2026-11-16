import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeFavorites,
  FAVORITE_LIMIT,
  mergeFavorites,
  toggleFavorite,
} from '../src/features/favorites/model.ts';

test('기기 저장값을 읽을 때 형식이 틀리면 빈 목록, 중복은 하나로 봅니다', () => {
  assert.deepEqual(decodeFavorites(null), []);
  assert.deepEqual(decodeFavorites('{bad'), []);
  assert.deepEqual(decodeFavorites('{"a":1}'), []);
  assert.deepEqual(decodeFavorites('["a","b","a",3]'), ['a', 'b']);
});

test('누르면 맨 앞에 추가, 다시 누르면 해제, 최대 개수를 넘지 않습니다', () => {
  assert.deepEqual(toggleFavorite(['a'], 'b'), ['b', 'a']);
  assert.deepEqual(toggleFavorite(['b', 'a'], 'b'), ['a']);
  const full = Array.from({ length: FAVORITE_LIMIT }, (_, i) => `id${i}`);
  assert.throws(() => toggleFavorite(full, 'new'));
  assert.deepEqual(toggleFavorite(full, 'id0').length, FAVORITE_LIMIT - 1);
});

test('로그인하면 서버 목록 뒤에 기기에만 있던 종목을 붙이고, 그것만 서버에 올립니다', () => {
  assert.deepEqual(mergeFavorites(['s1', 'both'], ['both', 'l1']), {
    merged: ['s1', 'both', 'l1'],
    upload: ['l1'],
  });
  assert.deepEqual(mergeFavorites([], []), { merged: [], upload: [] });
});
