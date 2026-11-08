/**
 * Figma 01-01 시작 화면입니다. 로고, 소개 문구, 이번 주 예시 카드, 간편 로그인과 둘러보기 버튼으로 구성합니다.
 * 공급자 연결 여부는 실제 인증 화면에서 확인하며 가짜 성공을 만들지 않습니다.
 * 이번 주 카드는 기록이 쌓였을 때의 모양을 보여 주는 예시이며 실제 기록으로 표시하지 않습니다.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { Screen } from '../../components/kit/Screen';
import { LogoMark } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';

const c = tokens.color;
const days = ['월', '화', '수', '목', '금', '토', '일'];
const example = [1, 2, 4, 5, 6];

export function WelcomeScreen({ onLogin, onGuest }: { onLogin: () => void; onGuest: () => void }) {
  return (
    <Screen
      footer={
        <>
          <Button
            title="카카오로 시작하기"
            accessibilityLabel="카카오로 계속하기"
            variant="kakao"
            icon={<AppIcon name="kakao" color={c.brand.kakaoText} />}
            onPress={onLogin}
          />
          <Button title="Google로 계속하기" variant="google" icon={<Text style={[text.headline, { color: c.text.primary }]}>G</Text>} onPress={onLogin} />
          <View style={s.links}>
            <Pressable accessibilityRole="button" onPress={onLogin} hitSlop={8}>
              <Text style={[text.caption, s.link]}>이메일로 로그인</Text>
            </Pressable>
            <Text style={[text.caption, { color: c.line.strong }]}>|</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="로그인 없이 둘러보기" onPress={onGuest} hitSlop={8}>
              <Text style={[text.caption, s.link]}>로그인 없이 둘러보기</Text>
            </Pressable>
          </View>
          <Text style={[text.label, { color: c.text.muted, textAlign: 'center' }]}>둘러보는 동안 기록은 이 기기에 저장됩니다.</Text>
        </>
      }
    >
      <View style={s.hero}>
        <LogoMark size={44} />
        <Text accessibilityRole="header" style={[text.titleL, { color: c.text.primary }]}>
          오늘 한 세트,{'\n'}루핏에 기록하세요
        </Text>
        <Text style={[text.callout, { color: c.text.secondary }]}>운동 기록 · 분석 · 오운완을 한곳에서</Text>
      </View>
      <View accessible accessibilityLabel="이번 주 운동 기록 예시" style={s.card}>
        <View style={s.cardHead}>
          <Text style={[text.captionBold, { color: c.text.primary, flex: 1 }]}>이번 주</Text>
          <Text style={[text.label, { color: c.text.secondary }]}>예시 · {example.length}일 운동</Text>
        </View>
        <View style={s.week}>
          {days.map((d, i) => (
            <View key={d} style={s.day}>
              <Text style={[text.label, { color: c.text.muted }]}>{d}</Text>
              <View style={[s.circle, example.includes(i) ? s.done : s.plain]}>
                {example.includes(i) ? (
                  <AppIcon name="check" size={16} color={c.text.inverse} strokeWidth={2} />
                ) : (
                  <Text style={[text.label, { color: c.text.muted }]}>{i + 2}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { gap: tokens.space[12], paddingTop: tokens.space[32] },
  card: { backgroundColor: c.bg.surface, borderRadius: tokens.radius.xl, padding: tokens.space[16], gap: tokens.space[12], marginTop: tokens.space[16] },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6 },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: c.bg.inverse },
  plain: { backgroundColor: c.bg.default, borderWidth: 1, borderColor: c.line.input },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: tokens.space[12], minHeight: 36 },
  link: { color: c.text.secondary, textDecorationLine: 'underline' },
});
