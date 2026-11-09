import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import type { AuthCoordinator } from './authCoordinator';
import { authReturnUrl, nativeAuthClient } from './nativeAuth';
import type { SocialProvider } from './types';

type Purpose = 'REGISTER' | 'RESET' | 'LINK';
/** 인증 원문과 비밀번호는 화면 메모리에만 보관하고 닫으면 폐기합니다. */
export function EmailAccountPanel({ coordinator, signedIn, enabled }: {
  coordinator: AuthCoordinator; signedIn: boolean; enabled: Record<SocialProvider, boolean>;
}) {
  const [mode, setMode] = useState<'LOGIN' | Purpose>(signedIn ? 'LINK' : 'LOGIN');
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [token, setToken] = useState(''), [requestId, setRequest] = useState('');
  const [mergeComplete, setMergeComplete] = useState(false);
  const [emailLinkOpen, setEmailLinkOpen] = useState(false);
  const [mergeProvider, setMergeProvider] = useState<SocialProvider | null>(null);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [methods, setMethods] = useState<{ email: string | null; providers: SocialProvider[] } | null>(null);
  const alive = useRef(true), locked = useRef(false);
  useEffect(() => {
    alive.current = true;
    let current = true;
    if (signedIn) void coordinator.loginMethods().then(v => { if (current && alive.current) setMethods(v); })
      .catch(e => { if (current && alive.current) setNotice(e instanceof Error ? e.message : '연결 상태를 확인하지 못했습니다.'); });
    return () => { current = false; alive.current = false; };
  }, [coordinator, signedIn]);
  async function run(work: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setNotice('');
    try { await work(); } catch (e) { if (alive.current) setNotice(e instanceof Error ? e.message : '처리하지 못했습니다.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  // 통합 결과를 읽기 전에 화면이 사라지지 않도록 사용자가 확인한 뒤 로그아웃합니다.
  if (mergeComplete) return <View style={[ui.card, { gap: 12 }]}>
    <Text style={ui.heading}>계정 통합 완료</Text>
    <Text style={ui.body}>운동 기록과 게시물을 하나의 계정으로 합쳤습니다. 변경된 계정 정보를 안전하게 적용하기 위해 다시 로그인해 주세요. 연결된 카카오 또는 Google 중 어느 방법으로 로그인해도 같은 기록을 사용합니다.</Text>
    <Button title="확인하고 다시 로그인" disabled={busy} onPress={() => void run(() => coordinator.logout())} />
    {!!notice && <Text accessibilityRole="alert" style={ui.body}>{notice}</Text>}
  </View>;
  const choose = (value: 'LOGIN' | Purpose) => { setMode(value); setRequest(''); setToken(''); setPassword(''); setNotice(''); };
  return <View style={[ui.card, { gap: 12 }]}>
    <Text style={ui.heading}>{signedIn ? '로그인 방법 연결' : '이메일 로그인'}</Text>
    {signedIn && <>
      <Text style={ui.muted}>이메일·카카오·Google을 각각 연결하면 어느 방법으로 로그인해도 같은 기록을 사용합니다. 이메일은 로그아웃하여 새로 가입하지 않고 아래에서 연결해 주세요.</Text>
      <Text style={ui.body}>{methods ? `이메일: ${methods.email ?? '연결 안 됨'}` : '연결 상태 확인 중'}</Text>
      {(['KAKAO', 'GOOGLE'] as const).map(provider => <Button key={provider} secondary
        title={`${provider === 'KAKAO' ? '카카오' : 'Google'} ${methods?.providers.includes(provider) ? '연결됨' : '연결하기'}`}
        disabled={busy || !methods || !enabled[provider] || methods.providers.includes(provider)}
        onPress={() => void run(async () => {
          if (!nativeAuthClient) throw new Error('이 환경에서는 연결할 수 없습니다.');
          await coordinator.linkSocial(provider, nativeAuthClient, authReturnUrl);
          if (!alive.current) return;
          setMethods(await coordinator.loginMethods()); setNotice('로그인 방법을 연결했습니다. 기존 기록을 그대로 사용합니다.');
        })} />)}
      <Text style={ui.muted}>이미 각각 가입했다면 아래에서 기존 계정을 통합할 수 있습니다.</Text>
      {(['KAKAO', 'GOOGLE'] as const).filter(p => !methods?.providers.includes(p)).map(provider =>
        <Button key={`merge-${provider}`} secondary title={`기존 ${provider === 'KAKAO' ? '카카오' : 'Google'} 계정 통합`}
          disabled={busy || !methods || !enabled[provider]} onPress={() => setMergeProvider(provider)} />)}
      {mergeProvider && <View style={{ gap: 8 }}>
        <Text style={ui.body}>현재 루핏 계정을 유지하며, 다음 화면에서 인증할 계정의 서버 운동 기록·게시물·친구를 가져옵니다. 현재 프로필과 설정을 우선하며 충돌 시 중단합니다. 기기에만 저장된 기록은 포함되지 않습니다. 반드시 본인 계정으로 인증해 주세요.</Text>
        <Button title="동의하고 본인 인증 · 통합" disabled={busy} onPress={() => void run(async () => {
          if (!nativeAuthClient) throw new Error('이 환경에서는 통합할 수 없습니다.');
          await coordinator.linkSocial(mergeProvider, nativeAuthClient, authReturnUrl, true);
          if (!alive.current) return;
          setMergeProvider(null);
          setMergeComplete(true);
        })} />
        <Button secondary title="취소" disabled={busy} onPress={() => setMergeProvider(null)} />
      </View>}
    </>}
    {signedIn && methods && !methods.email && <Button secondary title="이메일 연결하기"
      disabled={busy} onPress={() => { choose('LINK'); setEmailLinkOpen(true); }} />}
    {(!signedIn || (methods && !methods.email && emailLinkOpen)) && <>
      {signedIn && <Text style={ui.heading}>이메일 · 비밀번호 연결</Text>}
      {!signedIn && <View style={{ gap: 8 }}>
        <Button title="이메일 로그인" secondary disabled={busy} onPress={() => choose('LOGIN')} />
        <Button title="이메일 회원가입" secondary disabled={busy} onPress={() => choose('REGISTER')} />
        <Button title="비밀번호 찾기" secondary disabled={busy} onPress={() => choose('RESET')} />
      </View>}
      <TextInput accessibilityLabel="이메일 주소" placeholder="이메일 주소" value={email}
        editable={!busy && !requestId} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
        textContentType="emailAddress" onChangeText={setEmail} style={ui.input} maxLength={254} />
      {(mode === 'LOGIN' || !!requestId) && <>
        {!!requestId && <TextInput accessibilityLabel="이메일 인증값" placeholder="메일에 받은 인증값 붙여넣기" value={token}
          editable={!busy} autoCapitalize="none" autoCorrect={false} onChangeText={setToken} style={ui.input} maxLength={43} />}
        <TextInput accessibilityLabel={mode === 'LOGIN' ? '비밀번호' : '새 비밀번호'} placeholder={mode === 'LOGIN' ? '비밀번호' : '새 비밀번호 (15~128자)'}
          secureTextEntry value={password} editable={!busy} autoCapitalize="none" autoCorrect={false}
          onChangeText={setPassword} style={ui.input} maxLength={128} />
      </>}
      <Button title={mode === 'LOGIN' ? '이메일로 로그인' : requestId ? '인증 확인하고 완료' : '인증 메일 받기'}
        disabled={busy || !email.trim() || (mode === 'LOGIN' && !password) || (!!requestId && (token.length !== 43 || password.length < 15))}
        onPress={() => void run(async () => {
          if (mode === 'LOGIN') { await coordinator.emailLogin(email, password); return; }
          if (!requestId) {
            const request = await coordinator.emailRequest(email, mode);
            if (alive.current) { setRequest(request.requestId); setNotice('인증 메일을 보냈습니다. 10분 안에 인증값을 입력해 주세요.'); }
          } else {
            await coordinator.emailConfirm(mode, requestId, token, password);
            if (!alive.current) return;
            setPassword(''); setToken(''); setRequest('');
            if (mode === 'LINK') { setMethods(await coordinator.loginMethods()); setNotice('이메일을 연결했습니다.'); }
            if (mode === 'RESET') { setMode('LOGIN'); setNotice('비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.'); }
          }
        })} />
      {!!requestId && <Button title="이메일 변경 · 다시 요청" secondary disabled={busy} onPress={() => { setRequest(''); setToken(''); setPassword(''); }} />}
    </>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text>}
  </View>;
}
