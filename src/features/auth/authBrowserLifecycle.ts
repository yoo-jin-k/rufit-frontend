/** 인증 브라우저가 스스로 닫힌 뒤에는 dismiss를 다시 호출하지 않습니다.
 * iOS의 다른 모달까지 중복 해제되는 상황을 피하고 취소 요청에만 닫기를 전달합니다.
 */
export function authBrowserLifecycle<T>(open: (url: string, returnUrl: string) => Promise<T>, dismiss: () => void) {
  let active = false;
  return {
    async open(url: string, returnUrl: string) {
      active = true;
      try { return await open(url, returnUrl); }
      finally { active = false; }
    },
    close() {
      if (!active) return;
      active = false;
      dismiss();
    },
  };
}
