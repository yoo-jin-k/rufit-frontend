import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testDatabaseEnvironment } from '../scripts/test-database.ts';
test('통합 검증은 전용 로컬 DB만 허용하고 별도 Spring 설정을 상속하지 않는다', () => {
  for (const host of ['localhost','127.0.0.1','[::1]']) {
    const result=testDatabaseEnvironment({DB_URL:`jdbc:postgresql://${host}:5435/rufit_test`,DB_USERNAME:'rufit_test',DB_PASSWORD:'test-only',
      SPRING_APPLICATION_JSON:'ignored',SPRING_FLYWAY_URL:'ignored',JAVA_TOOL_OPTIONS:'ignored',JAVA_HOME:'kept'});
    assert.equal(result.JAVA_HOME,'kept');assert.equal(result.SPRING_APPLICATION_JSON,undefined);
    assert.equal(result.SPRING_FLYWAY_URL,undefined);assert.equal(result.JAVA_TOOL_OPTIONS,undefined);
  }
});
test('테스트 시작 전 다른 DB·계정·원격 주소·URL 옵션을 거절한다', () => {
  for(const DB_URL of ['jdbc:postgresql://localhost/rufit','jdbc:postgresql://remote.test/rufit_test',
    'jdbc:postgresql://localhost/rufit_test?currentSchema=other','jdbc:postgresql://localhost:0/rufit_test',
    'jdbc:postgresql://localhost:65536/rufit_test','jdbc:postgresql://user:secret@localhost/rufit_test','jdbc:postgresql://localhost/rufit_test\n',''])
    assert.throws(() => testDatabaseEnvironment({DB_URL,DB_USERNAME:'rufit_test',DB_PASSWORD:'test-only'}), /Test DB guard/);
  assert.throws(() => testDatabaseEnvironment({DB_URL:'jdbc:postgresql://localhost/rufit_test',DB_USERNAME:'rufit',DB_PASSWORD:'test-only'}), /Test DB guard/);
});
