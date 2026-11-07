import { AppModal as Modal } from '../../components/AppModal';
/**
 * 운동 종목의 검색, 부위·장비 필터, 선택 처리를 담당합니다.
 * 종목 데이터와 미디어 표현을 별도 모듈에 위임하여 카탈로그 확장 시 화면 수정을 줄입니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  KeyboardAvoidingView,
  Linking,

  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BodyPart, Equipment } from '../../api/client';
import { Button } from '../../components/Button';
import { colors, radius, size, spacing, typography } from '../../theme/tokens';
import { bodyParts, equipmentLabels, searchExercises, type CatalogExercise } from './catalog';
import { ExerciseDetail } from './ExerciseDetail';
import { ExerciseMedia } from './ExerciseMedia';
import { exercisePickerFocusStyles } from './ExercisePickerFocus.styles';
import { stackedExerciseItem } from './exercisePickerView';
import { hasExerciseImage } from './images';
import { useExerciseResultAnnouncement } from './useExerciseResultAnnouncement';

type Props = {
  visible: boolean;
  selectedIds: string[];
  onClose(): void;
  onSelect(exercises: (Pick<CatalogExercise, 'name'> & { id?: string })[]): void;
};
const announceResult = (message: string) => {
  if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
};
function ExerciseResultAnnouncement({ signature, count }: { signature: string; count: number }) {
  const message = useExerciseResultAnnouncement(signature, count, announceResult);
  return Platform.OS !== 'ios' ? (
    <Text
      testID="exercise-result-announcement"
      style={s.announcement}
      accessibilityLiveRegion="polite"
      aria-atomic
    >
      {message}
    </Text>
  ) : null;
}

export function ExercisePicker({ visible, selectedIds, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const viewport = useWindowDimensions();
  const [pending, setPending] = useState<(Pick<CatalogExercise, 'name'> & { id?: string })[]>([]);
  const [detail, setDetail] = useState<CatalogExercise | null>(null);
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState<BodyPart>();
  const [equipment, setEquipment] = useState<Equipment>();
  const [showEquipment, setShowEquipment] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const listRef = useRef<FlatList<CatalogExercise>>(null);
  const searchRef = useRef<TextInput>(null);
  const searchWasActive = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeFocusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorOffset = useRef<number | null>(null);
  const revealPending = useRef(false);
  const choosing = useRef(false);
  const results = useMemo(
    () => searchExercises(query, bodyPart, equipment),
    [bodyPart, equipment, query],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasConditions = !!(query || bodyPart || equipment);
  const conditionLabel = [
    bodyPart ? bodyParts[bodyPart] : '',
    equipment ? equipmentLabels[equipment] : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const resultSignature = results.map((item) => item.id).join('|');

  useEffect(() => {
    // 반응형 렌더와 같은 창 크기 값을 사용해 회전 뒤에도 같은 검색 노드와 커서를 복구합니다.
    if (!searchWasActive.current) return;
    requestAnimationFrame(() => searchRef.current?.focus());
    if (resizeFocusTimer.current) clearTimeout(resizeFocusTimer.current);
    resizeFocusTimer.current = setTimeout(() => searchRef.current?.focus(), 80);
  }, [viewport.height, viewport.width]);
  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      if (resizeFocusTimer.current) clearTimeout(resizeFocusTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (visible) choosing.current = false;
  }, [visible]);

  // 실패했을 때만 오류 위치로 이동하고 검색·필터 변경에는 현재 스크롤을 유지합니다.
  function revealError() {
    if (!revealPending.current || errorOffset.current === null) return;
    listRef.current?.scrollToOffset({ offset: errorOffset.current, animated: true });
    revealPending.current = false;
  }
  function reportError(title: string, body: string) {
    revealPending.current = true;
    setError({ title, body });
    revealError();
  }
  function resetConditions() {
    setQuery('');
    setBodyPart(undefined);
    setEquipment(undefined);
  }
  function close() {
    stopSearchFocusRecovery();
    setQuery('');
    setBodyPart(undefined);
    setEquipment(undefined);
    setShowEquipment(false);
    setCustom(false);
    setCustomName('');
    setError(null);
    setPending([]);
    setDetail(null);
    onClose();
  }
  function stopSearchFocusRecovery() {
    searchWasActive.current = false;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (resizeFocusTimer.current) clearTimeout(resizeFocusTimer.current);
  }
  function handleSearchBlur(relatedTarget: unknown) {
    const webTarget =
      Platform.OS === 'web'
        ? (relatedTarget as { tagName?: string; getAttribute?(name: string): string | null } | null)
        : null;
    const webTargetIsControl =
      !!webTarget &&
      (['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(webTarget.tagName ?? '') ||
        ['button', 'link'].includes(webTarget.getAttribute?.('role') ?? ''));
    if ((Platform.OS === 'web' && webTargetIsControl) || (Platform.OS !== 'web' && relatedTarget)) {
      stopSearchFocusRecovery();
      return;
    }
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (Platform.OS === 'web') {
      blurTimer.current = setTimeout(() => {
        if (searchWasActive.current) searchRef.current?.focus();
      }, 80);
      return;
    }
    blurTimer.current = setTimeout(() => {
      searchWasActive.current = false;
    }, 300);
  }
  // 목록에서는 임시 선택만 변경합니다. 확인할 때 한 번에 전달하여 과거 날짜 기록도 누락 없이 추가합니다.
  function choose(exercise: Pick<CatalogExercise, 'name'> & { id?: string }) {
    stopSearchFocusRecovery();
    if (exercise.id && selectedIdSet.has(exercise.id)) return;
    const key = (item: typeof exercise) => item.id ?? item.name.trim();
    setPending((items) => items.some((item) => key(item) === key(exercise))
      ? items.filter((item) => key(item) !== key(exercise))
      : [...items, { ...exercise, name: exercise.name.trim() }]);
  }
  function confirmSelection() {
    if (choosing.current || !pending.length) return;
    choosing.current = true;
    try {
      onSelect(pending);
      close();
    } catch {
      choosing.current = false;
      reportError('종목을 추가하지 못했어요', '선택은 유지했습니다. 다시 시도해 주세요.');
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={[s.backdrop, { paddingTop: Math.max(insets.top, spacing.xxl) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={s.dismissArea}
          accessibilityLabel="종목 선택 닫기"
          accessibilityRole="button"
          onPress={close}
        />
        <View
          style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
          accessibilityViewIsModal
        >
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>종목 추가</Text>
            <Pressable
              style={s.close}
              accessibilityRole="button"
              accessibilityLabel="닫기"
              onPress={close}
            >
              <Text style={s.closeText}>×</Text>
            </Pressable>
          </View>
          {detail ? (
            <ExerciseDetail exercise={detail} onClose={() => setDetail(null)} />
          ) : <>
          {/* 저높이 창에서도 검색부터 직접 입력까지 하나의 세로 목록으로 탐색합니다. */}
          <FlatList
            ref={listRef}
            data={results}
            extraData={{ selectedIds, pending }}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
            disableVirtualization={Platform.OS === 'web'}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={7}
            style={s.scroll}
            contentContainerStyle={s.list}
            ListHeaderComponent={
              <View>
                <View style={[s.searchField, exercisePickerFocusStyles.field]}>
                  <TextInput
                    ref={searchRef}
                    style={s.searchInput}
                    accessibilityLabel="종목 이름 검색"
                    placeholder="이름이나 별칭 검색"
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    maxLength={80}
                    autoCorrect={false}
                    returnKeyType="search"
                    onFocus={() => {
                      if (blurTimer.current) clearTimeout(blurTimer.current);
                      searchWasActive.current = true;
                    }}
                    onBlur={(event) =>
                      handleSearchBlur(
                        (
                          event.nativeEvent as typeof event.nativeEvent & {
                            relatedTarget?: unknown;
                          }
                        ).relatedTarget,
                      )
                    }
                  />
                  {!!query && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="검색어 지우기"
                      style={s.clear}
                      onPress={() => {
                        setQuery('');
                        searchRef.current?.focus();
                      }}
                    >
                      <Text style={s.clearText}>×</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={s.filterLabel}>부위</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chips}
                  style={s.filterRow}
                  keyboardShouldPersistTaps="handled"
                >
                  <Chip label="전체" selected={!bodyPart} onPress={() => setBodyPart(undefined)} />
                  {(Object.entries(bodyParts) as [BodyPart, string][]).map(([value, label]) => (
                    <Chip
                      key={value}
                      label={label}
                      selected={bodyPart === value}
                      onPress={() => setBodyPart(value)}
                    />
                  ))}
                </ScrollView>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`장비 필터, ${equipment ? equipmentLabels[equipment] : '전체'}, ${showEquipment ? '접기' : '펼치기'}`}
                  accessibilityState={{ expanded: showEquipment }}
                  style={s.equipmentButton}
                  onPress={() => setShowEquipment((value) => !value)}
                >
                  <Text style={s.equipmentButtonText}>
                    장비: {equipment ? equipmentLabels[equipment] : '전체'}
                  </Text>
                  <Text style={s.equipmentButtonText}>{showEquipment ? '⌃' : '⌄'}</Text>
                </Pressable>
                {showEquipment && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.chips}
                    style={s.filterRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Chip
                      label="전체"
                      selected={!equipment}
                      onPress={() => setEquipment(undefined)}
                    />
                    {(Object.entries(equipmentLabels) as [Equipment, string][]).map(
                      ([value, label]) => (
                        <Chip
                          key={value}
                          label={label}
                          selected={equipment === value}
                          onPress={() => setEquipment(value)}
                        />
                      ),
                    )}
                  </ScrollView>
                )}
                <View style={s.resultHeader}>
                  <View style={s.resultCopy}>
                    <Text testID="exercise-result-count" style={s.resultCount}>
                      검색 결과 {results.length}개
                    </Text>
                    {!!conditionLabel && <Text style={s.muted}>{conditionLabel}</Text>}
                  </View>
                  {hasConditions && (
                    <Pressable accessibilityRole="button" style={s.reset} onPress={resetConditions}>
                      <Text style={s.link}>조건 초기화</Text>
                    </Pressable>
                  )}
                </View>
                {error && (
                  <View
                    accessibilityRole="alert"
                    style={s.errorNotice}
                    onLayout={(event) => {
                      errorOffset.current = event.nativeEvent.layout.y;
                      revealError();
                    }}
                  >
                    <Text style={s.noticeTitle}>{error.title}</Text>
                    <Text style={s.errorText}>{error.body}</Text>
                  </View>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <ExerciseListItem
                item={item}
                selectionOrder={pending.findIndex((entry) => entry.id === item.id) + 1}
                alreadyAdded={selectedIdSet.has(item.id)}
                onDetail={(exercise) => { stopSearchFocusRecovery(); setDetail(exercise); }}
                onChoose={choose}
              />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.noticeTitle}>일치하는 종목이 없어요</Text>
                <Text style={s.muted}>검색어나 조건을 바꾸거나 직접 입력해 주세요.</Text>
                {hasConditions && (
                  <Button title="조건 초기화" secondary onPress={resetConditions} />
                )}
              </View>
            }
            ListFooterComponent={
              <View style={s.footer}>
                {custom ? (
                  <View style={s.custom}>
                    <Text style={s.noticeTitle}>내 종목 직접 입력</Text>
                    <TextInput
                      style={s.customInput}
                      accessibilityLabel="직접 입력할 운동 이름"
                      placeholder="운동 이름"
                      maxLength={80}
                      value={customName}
                      onChangeText={setCustomName}
                      onFocus={stopSearchFocusRecovery}
                    />
                    <Button
                      title="이 이름으로 선택"
                      disabled={!customName.trim()}
                      onPress={() => { choose({ name: customName }); setCustom(false); setCustomName(''); }}
                    />
                    <Button title="직접 입력 취소" secondary onPress={() => setCustom(false)} />
                  </View>
                ) : (
                  <Button
                    title="목록에 없는 종목 직접 입력"
                    secondary
                    onPress={() => {
                      setCustomName(query);
                      setCustom(true);
                    }}
                  />
                )}
                <Text style={s.credit}>동작 사진 · Free Exercise DB · Unlicense</Text>
                <Pressable
                  accessibilityRole="link"
                  style={s.sourceLink}
                  onPress={() => {
                    void Linking.openURL('https://github.com/yuhonas/free-exercise-db').catch(() =>
                      reportError('출처 링크를 열지 못했어요', '잠시 후 다시 시도해 주세요.'),
                    );
                  }}
                >
                  <Text style={s.link}>사진 출처 보기</Text>
                </Pressable>
              </View>
            }
          />
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm }}>
            <Text style={s.muted}>선택한 순서대로 추가됩니다 · 이미지를 눌러 상세 보기</Text>
            <Button title={`선택한 운동 ${pending.length}개 추가`} disabled={!pending.length} onPress={confirmSelection} />
          </View>
          </>}
          {/* 항상 mount되는 Picker와 분리해 닫을 때 예약을 취소하고 재개방 때 알림 서명을 초기화합니다. */}
          {visible && (
            <ExerciseResultAnnouncement signature={resultSignature} count={results.length} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ExerciseListItem({
  item,
  selectionOrder,
  alreadyAdded,
  onDetail,
  onChoose,
}: {
  item: CatalogExercise;
  selectionOrder: number;
  alreadyAdded: boolean;
  onDetail(exercise: CatalogExercise): void;
  onChoose(exercise: CatalogExercise): void;
}) {
  // 임시 선택 배열의 순서를 사용하므로 해제 시 번호가 당겨지고 다시 선택하면 마지막에 추가됩니다.
  const selected = selectionOrder > 0;
  const window = useWindowDimensions();
  const stacked = stackedExerciseItem(window.width - 40, window.fontScale);
  const [mediaMissing, setMediaMissing] = useState(() => !hasExerciseImage(item.id));
  const updateMissing = useCallback((missing: boolean) => setMediaMissing(missing), []);

  return (
    <View style={[s.exercise, stacked && s.exerciseStacked, selected && s.exercisePressed]}>
      {/* 상세 보기와 선택을 형제 버튼으로 분리하여 이미지 터치가 선택으로 전파되지 않도록 합니다. */}
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.name} 이미지와 상세 설명`} onPress={() => onDetail(item)}>
        <ExerciseMedia exercise={item} onMissingChange={updateMissing} />
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${item.name}${alreadyAdded ? ', 추가됨' : selected ? `, ${selectionOrder}번째 선택됨` : ', 운동 선택'}`}
        accessibilityState={{ checked: selected || alreadyAdded, disabled: alreadyAdded }}
        aria-checked={selected || alreadyAdded}
        disabled={alreadyAdded}
        onPress={() => onChoose(item)}
        style={s.exerciseBody}
      >

        <View style={s.action} accessible={false}>
          <Text style={s.actionText}>{alreadyAdded ? '✓' : selected ? selectionOrder : '+'}</Text>
        </View>
        <View style={s.exerciseInfo}>
          <Text style={s.exerciseName}>{item.name}</Text>
          <Text style={s.muted}>
            {bodyParts[item.bodyPart]} · {equipmentLabels[item.equipment]}
          </Text>
          {mediaMissing && <Text style={s.muted}>동작 사진 없음</Text>}
          {(selected || alreadyAdded) && <Text style={s.selectedText}>{alreadyAdded ? '추가됨' : `${selectionOrder}번째 선택됨`}</Text>}
        </View>
      </Pressable>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected && s.chipSelected]}
    >
      <Text style={[s.chipLabel, selected && s.chipLabelSelected]}>
        {selected ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#13221C70', justifyContent: 'flex-end' },
  dismissArea: { flex: 1, minHeight: 12 },
  sheet: {
    height: '91%',
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...typography.title, color: colors.text },
  close: {
    width: size.controlMin,
    height: size.controlMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.background,
  },
  closeText: { fontSize: 30, color: colors.textSecondary },
  scroll: { flex: 1, minHeight: 0 },
  list: { paddingBottom: spacing.md },
  searchField: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    minHeight: size.controlMin,
    borderRadius: radius.input,
    borderWidth: size.borderWidth,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    minWidth: 0,
    minHeight: size.controlMin,
    paddingHorizontal: spacing.lg,
    outlineWidth: 0,
    outlineStyle: 'solid',
  },
  clear: {
    width: size.controlMin,
    height: size.controlMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontSize: 24, color: colors.textSecondary },
  filterLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  filterRow: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.md },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  chip: {
    minHeight: size.controlMin,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipLabel: { ...typography.body, fontWeight: '600', color: colors.textSecondary },
  chipLabelSelected: { color: colors.onPrimary },
  equipmentButton: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    minHeight: size.controlMin,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  equipmentButtonText: { ...typography.button, color: colors.primary },
  resultHeader: {
    paddingHorizontal: spacing.xl,
    minHeight: size.controlMin,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultCopy: { flex: 1, minWidth: 180 },
  resultCount: { ...typography.caption, color: colors.text, fontWeight: '700' },
  reset: { minHeight: size.controlMin, justifyContent: 'center' },
  link: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  exercise: {
    marginHorizontal: spacing.xl,
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: size.borderWidth,
    borderColor: colors.border,
  },
  exerciseStacked: { alignItems: 'flex-start', flexDirection: 'column' },
  exercisePressed: { backgroundColor: colors.primarySoft },
  exerciseBody: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseInfo: { flex: 1, minWidth: 0, gap: spacing.xs },
  exerciseName: { ...typography.button, color: colors.text },
  muted: { ...typography.caption, color: colors.textSecondary },
  selectedText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  action: {
    width: size.controlMin,
    minHeight: size.controlMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 26, color: colors.primary, fontWeight: '700' },
  empty: {
    margin: spacing.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.status,
    backgroundColor: colors.primarySoft,
  },
  noticeTitle: { ...typography.heading, color: colors.text },
  errorNotice: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.sm,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.status,
    backgroundColor: colors.dangerSurface,
  },
  errorText: { ...typography.caption, color: colors.danger },
  footer: { marginHorizontal: spacing.xl, paddingTop: spacing.xxl, gap: spacing.sm },
  custom: { gap: spacing.md },
  customInput: {
    ...typography.body,
    color: colors.text,
    borderWidth: size.borderWidth,
    borderColor: colors.inputBorder,
    padding: spacing.lg,
    borderRadius: radius.input,
    minHeight: size.controlMin,
  },
  credit: { color: colors.textSecondary, textAlign: 'center', fontSize: 11, marginTop: spacing.md },
  sourceLink: { minHeight: size.controlMin, alignItems: 'center', justifyContent: 'center' },
  announcement: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
});
