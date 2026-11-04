# 백엔드 연결 코드

`src/api/client.ts`는 화면과 분리된 API 계층이다. `createRufitApi({ baseUrl, getAccessToken })`으로 생성하고 로그인 모듈이 최신 액세스 토큰을 공급한다. 토큰을 저장하거나 로그로 출력하지 않는다. 쿠키를 보내지 않으며 OIDC Bearer 인증을 사용한다.

운동 생성에는 같은 작업 동안 유지하는 UUID Idempotency-Key를 전달한다. 세트 수정·완료·종료·취소에는 마지막 응답의 version을 전달한다. 네트워크 실패 뒤 쓰기를 자동 반복하지 않는다. `ApiError.outcomeUnknown`이면 서버에서 이미 저장했을 수 있으므로 active/workout을 다시 조회한 뒤 화면에서 상태를 맞춰야 한다. 409 확인 요청 및 충돌 code는 유지한다. 취소는 화면의 명시적 확인 후 confirmed=true로 호출한다.

## 실제 백엔드 통합 검증

전용 테스트 PostgreSQL, Java21, Node24를 사용한다. 별도 rufit-backend에서 `./mvnw verify`로 최신 JAR를 만든 뒤, 프론트에서 DB_URL·DB_USERNAME·DB_PASSWORD·JAVA_HOME을 지정하고 `npm run test:backend`를 실행한다. JAR 위치가 기본 형제 저장소와 다르면 RUFIT_BACKEND_JAR를 지정한다.

스크립트는 임시 RSA 키/JWKS 서버/백엔드 프로세스를 만들고 실제 토큰 서명 검증과 PostgreSQL 저장을 통과한다. 운동 시작·중복 요청·세트 편집·완료·휴식·종료·취소·루틴·이전 기록·달력·타인 접근 차단·버전 충돌을 확인한 뒤 프로세스를 종료한다. 테스트 데이터는 지정한 전용 DB에 남는다. 운영 DB에는 실행하지 않는다.

타입/린트/14개 테스트 및 실제 백엔드 통합 검증을 통과했다. 현재 화면은 로컬 기록 모드를 유지한다. 로그인 제공자와 화면의 서버 상태 연결, 오프라인 변경 병합, 실제 모바일 기기 검증은 후속 작업이다. 디자인 변경 없이 재사용할 수 있도록 전송 계층을 독립시켰다.
