import { useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BodyPart, Equipment } from '../../api/client';
import { Button } from '../../components/Button';
import { colors } from '../../theme/tokens';
import { bodyParts, equipmentLabels, searchExercises, type CatalogExercise } from './catalog';
import { exerciseImages } from './images';

type Props = { selectedIds: string[]; onClose(): void; onSelect(exercise: Pick<CatalogExercise, 'name'> & { id?: string }): void };
export function ExercisePicker({ selectedIds, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState<BodyPart>();
  const [equipment, setEquipment] = useState<Equipment>();
  const [showEquipment, setShowEquipment] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<CatalogExercise>>(null);
  const errorOffset = useRef<number | null>(null);
  const revealPending = useRef(false);
  // 실패했을 때만 오류 위치로 이동하고, 검색하거나 필터를 바꿀 때는 스크롤을 유지해요.
  function revealError() {
    if (!revealPending.current || errorOffset.current === null) return;
    listRef.current?.scrollToOffset({ offset: errorOffset.current, animated: true });
    revealPending.current = false;
  }
  function reportError(message: string) {
    revealPending.current = true;
    setError(message);
    revealError();
  }
  const results = searchExercises(query, bodyPart, equipment);
  function choose(exercise: Pick<CatalogExercise, 'name'> & { id?: string }) {
    try { onSelect(exercise); onClose(); } catch (e) { reportError(e instanceof Error ? e.message : '종목을 추가하지 못했습니다.'); }
  }
  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={[s.backdrop, { paddingTop: Math.max(insets.top, 24) }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={s.dismissArea} accessibilityLabel="종목 선택 닫기" accessibilityRole="button" onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
        <View style={s.handle} />
        <View style={s.header}><View><Text style={s.eyebrow}>오늘의 움직임</Text><Text style={s.title}>종목 추가</Text></View>
          <Pressable style={s.close} accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose}><Text style={s.closeText}>×</Text></Pressable></View>
        {/* 낮은 창에서도 검색과 목록을 같은 영역에서 스크롤해 선택할 수 있어요. */}
        <FlatList ref={listRef} data={results} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" style={s.scroll} contentContainerStyle={s.list}
          ListHeaderComponent={<View>
            <TextInput style={s.search} accessibilityLabel="종목 이름 검색" placeholder="종목 이름 검색 (예: 스쿼트)" value={query} onChangeText={setQuery} maxLength={80} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.filterRow} keyboardShouldPersistTaps="handled">
              <Chip label={`${equipment ? equipmentLabels[equipment] : '운동 도구'} ${showEquipment ? '⌃' : '⌄'}`} selected={!!equipment || showEquipment} onPress={() => setShowEquipment(!showEquipment)} />
              <Chip label="전체" selected={!bodyPart} onPress={() => setBodyPart(undefined)} />
              {(Object.entries(bodyParts) as [BodyPart, string][]).map(([value, label]) => <Chip key={value} label={label} selected={bodyPart === value} onPress={() => setBodyPart(value)} />)}
            </ScrollView>
            {showEquipment && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.filterRow} keyboardShouldPersistTaps="handled">
              <Chip label="도구 전체" selected={!equipment} onPress={() => setEquipment(undefined)} />
              {(Object.entries(equipmentLabels) as [Equipment, string][]).map(([value, label]) => <Chip key={value} label={label} selected={equipment === value} onPress={() => setEquipment(value)} />)}
            </ScrollView>}
            <View style={s.resultHeader}><Text accessibilityLiveRegion="polite" style={s.muted}>{results.length}개 종목{bodyPart ? ` · ${bodyParts[bodyPart]}` : ''}{equipment ? ` · ${equipmentLabels[equipment]}` : ''}</Text>
              {!!(query || bodyPart || equipment) && <Pressable accessibilityRole="button" style={s.reset} onPress={() => { setQuery(''); setBodyPart(undefined); setEquipment(undefined); }}><Text style={s.link}>검색 초기화</Text></Pressable>}</View>
            {!!error && <Text accessibilityRole="alert" style={s.error} onLayout={event => { errorOffset.current = event.nativeEvent.layout.y; revealError(); }}>{error}</Text>}
          </View>}
          renderItem={({ item }) => {
            const selected = selectedIds.includes(item.id);
            return <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${bodyParts[item.bodyPart]}, ${equipmentLabels[item.equipment]}${selected ? ', 추가됨' : ', 추가'}`} accessibilityState={{ disabled: selected }} disabled={selected} onPress={() => choose(item)} style={({ pressed }) => [s.exercise, { opacity: pressed ? 0.65 : 1 }]}>
              <Image source={exerciseImages[item.id]} style={s.picture} resizeMode="contain" accessibilityLabel={`${item.name} 동작 사진`} />
              <View style={s.exerciseInfo}><Text style={s.exerciseName}>{item.name}</Text><Text style={s.muted}>{bodyParts[item.bodyPart]} · {equipmentLabels[item.equipment]}</Text></View>
              <Text style={[s.add, selected && s.selected]}>{selected ? '추가됨' : '+'}</Text>
            </Pressable>;
          }}
          ListEmptyComponent={<View style={s.empty}><Text style={s.exerciseName}>일치하는 종목이 없어요</Text><Text style={s.muted}>검색어나 필터를 바꾸거나 직접 추가해 주세요.</Text></View>}
          ListFooterComponent={<View style={s.footer}>
            {custom ? <View style={s.custom}><Text style={s.exerciseName}>내 종목 직접 입력</Text><TextInput style={s.customInput} accessibilityLabel="직접 입력할 운동 이름" placeholder="운동 이름" maxLength={80} value={customName} onChangeText={setCustomName} /><Button title="이 이름으로 추가" disabled={!customName.trim()} onPress={() => choose({ name: customName })} /><Button title="직접 입력 취소" secondary onPress={() => setCustom(false)} /></View> : <Button title="목록에 없는 종목 직접 입력" secondary onPress={() => { setCustomName(query); setCustom(true); }} />}
            <Text style={s.credit}>동작 사진 · Free Exercise DB · Unlicense</Text>
            <Pressable accessibilityRole="link" style={s.sourceLink} onPress={() => { void Linking.openURL('https://github.com/yuhonas/free-exercise-db').catch(() => reportError('출처 링크를 열지 못했습니다.')); }}><Text style={s.link}>사진 출처 보기</Text></Pressable>
          </View>} />
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[s.chip, selected && s.chipSelected]}><Text style={[s.chipLabel, selected && s.chipLabelSelected]}>{label}</Text></Pressable>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#13221C70', justifyContent: 'flex-end' }, dismissArea: { flex: 1, minHeight: 12 },
  sheet: { height: '91%', width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
  header: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 }, title: { fontSize: 26, fontWeight: '800', color: colors.text },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.background }, closeText: { fontSize: 30, color: colors.muted },
  search: { marginHorizontal: 20, marginBottom: 16, minHeight: 54, borderRadius: 16, backgroundColor: colors.background, paddingHorizontal: 16, fontSize: 16, color: colors.text },
  filterRow: { flexGrow: 0, flexShrink: 0, marginBottom: 8 }, chips: { gap: 8, paddingHorizontal: 20 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.background }, chipSelected: { backgroundColor: colors.primary },
  chipLabel: { fontSize: 15, fontWeight: '600', color: colors.muted }, chipLabelSelected: { color: '#fff' },
  resultHeader: { paddingHorizontal: 20, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, reset: { minHeight: 44, justifyContent: 'center' },
  scroll: { flex: 1, minHeight: 0 }, list: { paddingBottom: 12 }, exercise: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14, borderBottomWidth: 1, borderColor: '#F0F3F1' },
  picture: { width: 88, height: 88, borderRadius: 16, backgroundColor: colors.background }, exerciseInfo: { flex: 1, gap: 6 }, exerciseName: { color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 }, add: { color: colors.primary, fontSize: 26, minWidth: 28, textAlign: 'center' }, selected: { fontSize: 12, color: colors.muted },
  empty: { marginHorizontal: 20, paddingVertical: 32, gap: 8 }, footer: { marginHorizontal: 20, paddingTop: 24, gap: 10 }, custom: { gap: 12 }, customInput: { borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 12, fontSize: 16, minHeight: 48 },
  credit: { color: colors.muted, textAlign: 'center', fontSize: 11, marginTop: 12 }, sourceLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, link: { color: colors.primary, fontSize: 13 }, error: { color: '#B42318', paddingHorizontal: 20 },
});
