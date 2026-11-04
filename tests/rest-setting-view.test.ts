import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRestInput} from '../src/features/workout/restSettingView.ts';
test('휴식 입력은 빈 초안을 거부하고 정수0~3600만 적용한다', () => {
  for (const [input,expected] of [['0',0],['90',90],['120',120],['3600',3600],['0090',90]] as const) assert.equal(parseRestInput(input),expected);
  for (const input of ['', '3601', '-1', '1.5', '1e2', '１２', ' 90', '90 ', '12345', '0x10', 'a']) assert.throws(()=>parseRestInput(input), /0~3600초/);
});
