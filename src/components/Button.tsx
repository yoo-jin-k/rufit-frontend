import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/tokens';
export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
    <Text style={[styles.text, secondary && { color: colors.primary }]}>{title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }, secondary: { backgroundColor: '#E7F0EB' }, text: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' } });
