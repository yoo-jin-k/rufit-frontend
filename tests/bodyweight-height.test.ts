import test from 'node:test';
import assert from 'node:assert/strict';
import { weightRecord, decodeWeight, saveWeight } from '../src/features/bodyweight/model.ts';

test('기존 체중 기록은 키 없이 유지하고 새 키는 저장 후 다시 읽습니다', () => {
  const old = { date: '2026-10-01', weight: 70 };
  const next = weightRecord('2026-10-02', '71.2', '2026-10-03', '170.5');
  const records = decodeWeight(JSON.stringify({ version: 1, records: saveWeight([old], next) }));
  assert.deepEqual(records, [old, { date: '2026-10-02', weight: 71.2, height: 170.5 }]);
  for (const height of ['0', '301', '-1', 'abc', '170.123'])
    assert.throws(() => weightRecord('2026-10-02', '71', '2026-10-03', height));
  assert.throws(() => decodeWeight(JSON.stringify({ version: 1, records: [{ ...old, height: -10 }] })));
});
