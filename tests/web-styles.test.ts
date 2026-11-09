import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createWebStyles } from '../src/theme/webStyles.ts';
const require = createRequire(`${process.cwd()}/package.json`);
const { styleq } = require('styleq') as {
  styleq(...styles: unknown[]): [string, unknown, unknown];
};
// 실제 react-native-web의 합성기를 사용해 기본 버튼 클래스가 상태 변경에 사라지는 회귀를 방지합니다.
// styleq는 react-native-web 의존성으로 설치됩니다.
test('웹 보조·눌림 버튼에도 기본 크기 클래스와 글자 클래스를 보존한다', () => {
  const styles = createWebStyles('button', {
    button: 'base',
    secondary: 'soft',
    pressed: 'pressed',
    text: 'label',
    secondaryText: 'green',
  });
  for (const state of [styles.secondary, styles.pressed]) {
    const [names] = styleq([styles.button, state]);
    assert.ok(names.split(' ').includes('base'));
    assert.equal(names.split(' ').length, 2);
  }
  const [names] = styleq([styles.text, styles.secondaryText]);
  assert.deepEqual(new Set(names.split(' ')), new Set(['label', 'green']));
});
