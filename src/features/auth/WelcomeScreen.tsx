/** 최종 시안의 로그인 진입 화면입니다. 공급자 연결 여부는 실제 인증 화면에서 확인하며 가짜 성공을 만들지 않습니다. */
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';
export function WelcomeScreen({ onLogin, onGuest }: { onLogin: () => void; onGuest: () => void }) {
  return (
    <SafeAreaView style={ui.page}>
      <ScreenLayout
        footer={
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카카오로 계속하기"
              onPress={onLogin}
              style={s.kakao}
            >
              <Text style={s.provider}>● 카카오로 계속하기</Text>
            </Pressable>
            <Button title="Google로 계속하기" secondary onPress={onLogin} />
            <Button title="로그인 없이 둘러보기" secondary onPress={onGuest} />
            <Text style={[ui.muted, { textAlign: 'center' }]}>
              현재 기록은 이 기기에 저장됩니다.
            </Text>
          </>
        }
      >
        <Text style={[ui.heading, { marginTop: 32 }]}>◉ 루핏</Text>
        <View style={{ gap: 12, marginTop: 20 }}>
          <Text style={[ui.title, { lineHeight: 38 }]}>운동 기록을{'\n'}시작해 볼까요?</Text>
          <Text style={ui.muted}>나의 운동을 기록하고 변화를 확인하세요.</Text>
        </View>
        <View style={[ui.card, { marginTop: 16 }]}>
          <Text style={ui.muted}>이번 주, 나의 운동 기록</Text>
          <View style={[ui.row, { gap: 8 }]}>
            {['월', '화', '수', '목', '금', '토', '일'].map((d, i) => (
              <View key={d} style={{ flex: 1, gap: 12, alignItems: 'center' }}>
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    borderRadius: 9,
                    backgroundColor: [2, 3, 5].includes(i) ? colors.text : colors.border,
                  }}
                />
                <Text style={ui.muted}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={ui.muted}>기록이 쌓이면 운동한 날을 한눈에 볼 수 있어요.</Text>
        </View>
      </ScreenLayout>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  kakao: {
    backgroundColor: '#FEE500',
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  provider: { fontSize: 15, fontWeight: '700', color: '#191919' },
});
