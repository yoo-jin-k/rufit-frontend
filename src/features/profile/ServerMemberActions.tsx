import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import type { ReportReason } from '../../api/client';

const reasons: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: '스팸·광고' }, { value: 'HARASSMENT', label: '괴롭힘' },
  { value: 'INAPPROPRIATE', label: '부적절한 내용' }, { value: 'OTHER', label: '기타' },
];
/** 관계 변경은 설명 후 확인하며 신고 재시도에는 같은 접수 번호를 사용합니다. */
export function ServerMemberActions({ nickname, disabled, onBlock, onRemove, onReport }: {
  nickname: string; disabled: boolean; onBlock: () => void;
  onRemove?: () => void; onReport: (id: string, reason: ReportReason) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<'closed' | 'menu' | 'block' | 'remove' | 'report'>('closed');
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [sent, setSent] = useState(false);
  const ids = useRef(new Map<ReportReason, string>());
  return <View>
    <View style={[ui.row, { justifyContent: 'flex-end', flexWrap: 'wrap' }]}>
      {onRemove && <Button title="친구 해제" compact secondary disabled={disabled} onPress={() => setMode('remove')} />}
      <Pressable accessibilityRole="button" accessibilityLabel={`${nickname} 더보기`} accessibilityState={{ expanded: mode !== 'closed', disabled }} disabled={disabled} onPress={() => setMode(mode === 'closed' ? 'menu' : 'closed')} style={{ padding: 12 }}>
        <AppIcon name="more" size={18} />
      </Pressable>
    </View>
    {mode !== 'closed' && <View style={ui.card}>
      {mode === 'menu' && <>
        <Button title="차단하기" compact secondary disabled={disabled} onPress={() => setMode('block')} />
        <Button title="신고하기" compact secondary disabled={disabled} onPress={() => setMode('report')} />
      </>}
      {mode === 'block' && <>
        <Text style={ui.body}>{nickname} 님을 차단하시겠어요?</Text>
        <Text style={ui.muted}>친구 관계와 대기 신청이 삭제됩니다. 차단 해제 후에도 복원되지 않습니다.</Text>
        <Button title="차단 확인" compact disabled={disabled} onPress={onBlock} />
      </>}
      {mode === 'remove' && <>
        <Text style={ui.body}>{nickname} 님을 친구에서 해제하시겠어요?</Text>
        <Text style={ui.muted}>다시 연결하려면 친구 신청과 수락이 필요합니다.</Text>
        <Button title="친구 해제 확인" compact disabled={disabled} onPress={onRemove!} />
      </>}
      {mode === 'report' && (sent ? <Text accessibilityLiveRegion="polite" style={ui.body}>신고가 접수되었습니다. 검토가 완료된 것은 아니며 차단은 별도로 선택할 수 있습니다.</Text> : <>
        <Text style={ui.heading}>신고 사유를 선택해 주세요.</Text>
        <View style={[ui.row, { flexWrap: 'wrap' }]}>{reasons.map(item => <Button key={item.value} title={`${reason === item.value ? '✓ ' : ''}${item.label}`} compact secondary disabled={disabled} onPress={() => setReason(item.value)} />)}</View>
        <Button title="신고 접수" compact disabled={disabled} onPress={() => {
          const id = ids.current.get(reason) ?? randomUUID(); ids.current.set(reason, id);
          void onReport(id, reason).then(ok => { if (ok) setSent(true); });
        }} />
      </>)}
      <Button title="닫기" compact secondary disabled={disabled} onPress={() => setMode('closed')} />
    </View>}
  </View>;
}
