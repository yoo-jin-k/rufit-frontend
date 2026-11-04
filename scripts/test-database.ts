const localTestUrl = /^jdbc:postgresql:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::([0-9]+))?\/rufit_test$/;
export function testDatabaseEnvironment(environment: Record<string,string | undefined>): Record<string,string | undefined> {
  const match = localTestUrl.exec(environment.DB_URL ?? '');
  if (!match || match[0] !== environment.DB_URL || (match[1] !== undefined && (!Number.isSafeInteger(Number(match[1])) || Number(match[1]) < 1 || Number(match[1]) > 65535)) ||
    environment.DB_USERNAME !== 'rufit_test' || !environment.DB_PASSWORD)
    throw new Error('Test DB guard: 로컬 PostgreSQL의 rufit_test DB·계정과 DB_PASSWORD가 필요합니다.');
  return Object.fromEntries(Object.entries(environment).filter(([key]) => !key.startsWith('SPRING_') &&
    !['JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS'].includes(key)));
}
