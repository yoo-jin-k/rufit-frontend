import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';

/** 차단은 관계를 해제하므로 더보기만 눌러서는 실행되지 않고 설명 후 확인을 받습니다. */
export function ServerMemberActions({ nickname, disabled, onBlock }: {
  nickname: string; disabled: boolean; onBlock: () => void;
}) {
  const [open, setOpen] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${nickname} 더보기`} accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => setOpen(!open)} style={{ alignSelf: 'flex-end', padding: 12 }}>
      <AppIcon name="more" size={18} />
    </Pressable>
    {open && <View style={ui.card}>
      <Text style={ui.body}>{nickname} 님을 차단하시겠어요?</Text>
      <Text style={ui.muted}>친구 관계와 대기 중인 신청이 삭제됩니다. 차단을 해제해도 친구 관계는 복구되지 않습니다.</Text>
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        <Button title="차단하기" compact disabled={disabled} onPress={onBlock} />
        <Button title="닫기" compact secondary disabled={disabled} onPress={() => setOpen(false)} />
      </View>
    </View>}
  </View>;
}
