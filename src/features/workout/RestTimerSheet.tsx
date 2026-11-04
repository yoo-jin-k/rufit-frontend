import { AppModal as Modal } from '../../components/AppModal';
/** 휴식 시간은 임시 선택 후 적용합니다. 배경 닫기와 취소는 저장값을 바꾸지 않습니다. */
import { useRef, useState } from 'react';
import {  Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
import { colors } from '../../theme/tokens';
function TimeWheel({ value, max, label, onChange }: { value: number; max: number; label: string; onChange(value: number): void }) {
  const scroll = useRef<ScrollView>(null);
  const initialized = useRef(false);
  return <View style={{ flex: 1, height: 156 }}>
    <ScrollView ref={scroll} snapToInterval={52} decelerationRate="fast" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 52 }}
      onLayout={() => { if (!initialized.current) { initialized.current = true; scroll.current?.scrollTo({ y: value * 52, animated: false }); } }}
      scrollEventThrottle={32}
      onScroll={(event) => onChange(Math.max(0, Math.min(max, Math.round(event.nativeEvent.contentOffset.y / 52))))}>
      {Array.from({ length: max + 1 }, (_, index) => <Pressable key={index} accessibilityRole="button"
        accessibilityLabel={`${index}${label}`} accessibilityState={{ selected: index === value }}
        onPress={() => { onChange(index); scroll.current?.scrollTo({ y: index * 52, animated: true }); }}
        style={{ height: 52, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: value === index ? colors.text : colors.textSecondary }}>{String(index).padStart(2, '0')}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}
export function RestTimerSheet({ name, seconds, recommended, onApply, onClose }: {
  name: string; seconds: number; recommended: number;
  onApply(value: number | null, all: boolean): void; onClose(): void;
}) {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState(Math.floor(seconds / 60));
  const [secs, setSecs] = useState(seconds % 60);
  const [useRecommended, setUseRecommended] = useState(false);
  const [error, setError] = useState('');
  function apply(all: boolean, off = false) {
    try {
      const value = off ? 0 : useRecommended ? null : minutes * 60 + secs;
      if (value !== null && value > 3600) throw new Error('휴식시간은 60분까지 설정할 수 있습니다.');
      onApply(value, all); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '시간을 확인해 주세요.'); }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="휴식 설정 취소" onPress={onClose} style={{ flex: 1 }} />
      <View style={{ backgroundColor: colors.surface, width: '100%', maxWidth: 640, alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Math.max(20, insets.bottom), maxHeight: '85%' }}>
        <ScrollView contentContainerStyle={{ gap: 20 }}>
          <View style={ui.between}><Text style={ui.heading}>휴식 타이머</Text><Pressable accessibilityRole="button" accessibilityLabel="휴식 설정 닫기" onPress={onClose} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }}><Text style={ui.body}>닫기</Text></Pressable></View>
          <Text style={ui.muted}>{name} · 분 / 초</Text>
          {!useRecommended && <View style={[ui.row, { backgroundColor: colors.primarySoft, borderRadius: 20 }]}>
            <TimeWheel value={minutes} max={60} label="분" onChange={setMinutes} />
            <Text style={{ fontSize: 32 }}>:</Text>
            <TimeWheel value={secs} max={59} label="초" onChange={setSecs} />
          </View>}
          <View style={ui.between}><Text style={ui.body}>권장 휴식시간 사용</Text><Switch accessibilityLabel="권장 휴식시간 사용" value={useRecommended} onValueChange={setUseRecommended} /></View>
          <Text style={ui.muted}>{useRecommended ? `이 종목 기본값 ${Math.floor(recommended / 60)}분 ${recommended % 60}초 · 전체 적용 시 각 종목 기본값을 사용합니다.` : `선택: ${minutes}분 ${secs}초`}</Text>
          <Text style={ui.muted}>적용 대상의 진행 중인 휴식도 선택한 시간부터 다시 시작합니다.</Text>
          {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
          <Button title="이 종목만 적용" secondary onPress={() => apply(false)} />
          <Button title="모든 종목에 적용" onPress={() => apply(true)} />
          <Button title="이 종목 휴식 타이머 끄기" secondary onPress={() => apply(false, true)} />
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
