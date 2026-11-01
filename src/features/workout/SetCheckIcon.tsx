/** 체크 표시의 시각 크기만 줄입니다. 바깥 버튼의 48px 터치 영역은 유지합니다. */
import { Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
export function SetCheckIcon({ checked, all = false }: { checked: boolean; all?: boolean }) {
  return (
    <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: checked ? colors.primary : colors.border }}>
      <Text style={{ fontSize: all ? 15 : 18, lineHeight: 22, fontWeight: '700', color: colors.onPrimary }}>{all ? '✓✓' : '✓'}</Text>
    </View>
  );
}
