import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>루핏</Text>
        <Text style={styles.title}>오늘의 움직임을\n나의 기록으로.</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>운동을 이어갈 준비</Text>
          <Text style={styles.body}>운동기록부터 루틴과 이전 기록까지, 차근차근 연결합니다.</Text>
        </View>
        <Text style={styles.caption}>나만의 속도로, 꾸준하게.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  brand: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 44,
    marginVertical: 24,
  },
  card: { backgroundColor: colors.surface, padding: 24, borderRadius: 20, gap: 12 },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 26 },
  caption: { color: colors.muted, fontSize: 14 },
});
