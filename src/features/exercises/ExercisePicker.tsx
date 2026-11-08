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
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BodyPart, Equipment } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { CheckMark, Chip, ChipRow, TextField } from '../../components/kit/Controls';
import { IconButton, NavBar } from '../../components/kit/Screen';
import { BottomSheet, EmptyCard } from '../../components/kit/Surfaces';
import { size, text, tokens } from '../../theme/tokens';
import type { Workout } from '../workout/model';
import { previousExercises } from '../workout/previousSetModel';
import { bodyParts, equipmentLabels, searchExercises, type CatalogExercise } from './catalog';
import { ExerciseDetail } from './ExerciseDetail';
import { ExerciseMedia } from './ExerciseMedia';
import { exercisePickerFocusStyles } from './ExercisePickerFocus.styles';
import { hasExerciseImage } from './images';
import { useExerciseResultAnnouncement } from './useExerciseResultAnnouncement';

type Props = {
  visible: boolean;
  /** 상단 제목입니다. 지난 운동 입력에서는 '11월 5일 · 종목 선택'처럼 날짜를 넣습니다. */
  title?: string;
  /** 종목마다 '지난번 65kg × 8회'를 보여 주고 상세의 내 기록을 계산할 때 씁니다. */
  history?: Workout[];
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

export function ExercisePicker({ visible, title = '종목 추가', history = [], selectedIds, onClose, onSelect }: Props) {
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
  // 같은 종목의 가장 최근 완료 기록에서 마지막 세트를 '65kg × 8회'로 보여 줍니다.
  const lastRecord = (item: CatalogExercise) => {
    const set = previousExercises(history, { id: item.id, name: item.name, catalogId: item.id, sets: [] })[0]?.exercise.sets.at(-1);
    return set ? `${set.weight}kg × ${set.reps}회` : undefined;
  };
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
    <Modal visible={visible} animationType={Platform.OS === 'web' ? 'none' : 'slide'} onRequestClose={close}>
      <SafeAreaView style={s.page} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {detail ? (
            <ExerciseDetail
              exercise={detail}
              history={history}
              alreadyAdded={selectedIdSet.has(detail.id)}
              onClose={() => setDetail(null)}
              onAdd={() => {
                if (!pending.some((item) => item.id === detail.id)) choose(detail);
                setDetail(null);
              }}
            />
          ) : (
            <>
              <View style={s.head}>
                <NavBar
                  title={title}
                  leading="close"
                  onLeading={close}
                  trailing={
                    <IconButton
                      icon="filter"
                      label={`장비 필터, ${equipment ? equipmentLabels[equipment] : '전체'}, 펼치기`}
                      badge={!!equipment}
                      onPress={() => setShowEquipment(true)}
                    />
                  }
                />
              </View>
              {/* 낮은 창에서도 검색부터 직접 입력까지 하나의 세로 목록으로 탐색합니다. */}
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
                  <View style={s.listHead}>
                    <View style={[s.search, exercisePickerFocusStyles.field]}>
                      <AppIcon name="search" color={tokens.color.text.muted} />
                      <TextInput
                        ref={searchRef}
                        style={s.searchInput}
                        accessibilityLabel="종목 이름 검색"
                        placeholder="종목 이름 검색"
                        placeholderTextColor={tokens.color.text.muted}
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
                            (event.nativeEvent as typeof event.nativeEvent & { relatedTarget?: unknown }).relatedTarget,
                          )
                        }
                      />
                      {!!query && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="검색어 지우기"
                          hitSlop={10}
                          onPress={() => {
                            setQuery('');
                            searchRef.current?.focus();
                          }}
                        >
                          <AppIcon name="close" color={tokens.color.text.muted} />
                        </Pressable>
                      )}
                    </View>
                    <ChipRow>
                      <Chip label="전체" selected={!bodyPart} onPress={() => setBodyPart(undefined)} />
                      {(Object.entries(bodyParts) as [BodyPart, string][]).map(([value, label]) => (
                        <Chip key={value} label={label} selected={bodyPart === value} onPress={() => setBodyPart(value)} />
                      ))}
                    </ChipRow>
                    <View style={s.resultHeader}>
                      <Text testID="exercise-result-count" style={[text.captionBold, s.secondary, { flex: 1 }]}>
                        {conditionLabel ? `${conditionLabel} · ` : ''}검색 결과 {results.length}개
                      </Text>
                      {hasConditions && (
                        <Pressable accessibilityRole="button" hitSlop={8} onPress={resetConditions}>
                          <Text style={[text.label, s.link]}>조건 초기화</Text>
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
                        <Text style={[text.captionBold, { color: tokens.color.danger.default }]}>{error.title}</Text>
                        <Text style={[text.label, { color: tokens.color.danger.default }]}>{error.body}</Text>
                      </View>
                    )}
                  </View>
                }
                renderItem={({ item }) => (
                  <ExerciseListItem
                    item={item}
                    last={lastRecord(item)}
                    selectionOrder={pending.findIndex((entry) => entry.id === item.id) + 1}
                    alreadyAdded={selectedIdSet.has(item.id)}
                    onDetail={(exercise) => {
                      stopSearchFocusRecovery();
                      setDetail(exercise);
                    }}
                    onChoose={choose}
                  />
                )}
                ListEmptyComponent={
                  <View style={s.empty}>
                    <EmptyCard icon="search" title="일치하는 종목이 없어요" body="검색어나 조건을 바꾸거나 직접 입력해 주세요." />
                    {hasConditions && <Button title="조건 초기화" variant="soft" size="md" onPress={resetConditions} />}
                  </View>
                }
                ListFooterComponent={
                  <View style={s.footer}>
                    {custom ? (
                      <View style={s.custom}>
                        <TextField
                          label="내 종목 직접 입력"
                          accessibilityLabel="직접 입력할 운동 이름"
                          placeholder="운동 이름"
                          maxLength={80}
                          value={customName}
                          onChangeText={setCustomName}
                          inputProps={{ onFocus: stopSearchFocusRecovery }}
                        />
                        <Button
                          title="이 이름으로 선택"
                          size="md"
                          disabled={!customName.trim()}
                          onPress={() => {
                            choose({ name: customName });
                            setCustom(false);
                            setCustomName('');
                          }}
                        />
                        <Button title="직접 입력 취소" size="md" variant="soft" onPress={() => setCustom(false)} />
                      </View>
                    ) : (
                      <Button
                        title="목록에 없는 종목 직접 입력"
                        size="md"
                        variant="soft"
                        icon={<AppIcon name="plus" />}
                        onPress={() => {
                          setCustomName(query);
                          setCustom(true);
                        }}
                      />
                    )}
                    {pending.filter((item) => !item.id).map((item) => (
                      <Text key={item.name} style={[text.label, s.secondary]}>
                        직접 입력: {item.name}
                      </Text>
                    ))}
                    <Pressable
                      accessibilityRole="link"
                      style={s.sourceLink}
                      onPress={() => {
                        void Linking.openURL('https://github.com/yuhonas/free-exercise-db').catch(() =>
                          reportError('출처 링크를 열지 못했어요', '잠시 후 다시 시도해 주세요.'),
                        );
                      }}
                    >
                      <Text style={[text.label, s.muted]}>동작 사진 · Free Exercise DB · Unlicense · 사진 출처 보기</Text>
                    </Pressable>
                  </View>
                }
              />
              {!!pending.length && (
                <View style={s.dock}>
                  <Button title={`${pending.length}개 종목 추가`} onPress={confirmSelection} />
                </View>
              )}
            </>
          )}
          {/* 항상 mount되는 Picker와 분리해 닫을 때 예약을 취소하고 재개방 때 알림 서명을 초기화합니다. */}
          {visible && <ExerciseResultAnnouncement signature={resultSignature} count={results.length} />}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BottomSheet visible={showEquipment} title="장비로 고르기" onClose={() => setShowEquipment(false)}>
        <ChipRow wrap>
          <Chip label="전체" selected={!equipment} onPress={() => setEquipment(undefined)} />
          {(Object.entries(equipmentLabels) as [Equipment, string][]).map(([value, label]) => (
            <Chip key={value} label={label} selected={equipment === value} onPress={() => setEquipment(value)} />
          ))}
        </ChipRow>
        <View style={s.sheetFoot}>
          <Text style={[text.label, s.secondary, { flex: 1 }]}>{equipment ? `${equipmentLabels[equipment]} 선택됨` : '전체 장비'}</Text>
          {!!equipment && (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setEquipment(undefined)}>
              <Text style={[text.label, s.link]}>초기화</Text>
            </Pressable>
          )}
        </View>
        <Button title={`결과 보기 · ${results.length}개`} onPress={() => setShowEquipment(false)} />
      </BottomSheet>
    </Modal>
  );
}

/** Figma ExerciseRow: 사진 44, 이름, '부위 · 장비 · 지난번 기록', 오른쪽 동그란 선택 표시입니다. */
function ExerciseListItem({
  item,
  last,
  selectionOrder,
  alreadyAdded,
  onDetail,
  onChoose,
}: {
  item: CatalogExercise;
  last?: string;
  selectionOrder: number;
  alreadyAdded: boolean;
  onDetail(exercise: CatalogExercise): void;
  onChoose(exercise: CatalogExercise): void;
}) {
  // 임시 선택 배열의 순서를 사용하므로 해제 시 번호가 당겨지고 다시 선택하면 마지막에 추가됩니다.
  const selected = selectionOrder > 0;
  const [mediaMissing, setMediaMissing] = useState(() => !hasExerciseImage(item.id));
  const updateMissing = useCallback((missing: boolean) => setMediaMissing(missing), []);
  return (
    <View style={s.exercise}>
      {/* 상세 보기와 선택을 형제 버튼으로 분리하여 이미지 터치가 선택으로 전파되지 않도록 합니다. */}
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.name} 이미지와 상세 설명`} onPress={() => onDetail(item)}>
        <ExerciseMedia exercise={item} size={44} onMissingChange={updateMissing} />
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
        <View style={s.exerciseInfo}>
          <Text style={[text.bodyBold, { color: tokens.color.text.primary }]}>{item.name}</Text>
          <Text style={[text.label, s.secondary]}>
            {[bodyParts[item.bodyPart], equipmentLabels[item.equipment], last && `지난번 ${last}`, mediaMissing && '동작 사진 없음', alreadyAdded && '추가됨']
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <CheckMark checked={selected || alreadyAdded} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.color.bg.default },
  head: { paddingHorizontal: tokens.size.screenPadding, width: '100%', maxWidth: size.contentMax, alignSelf: 'center' },
  scroll: { flex: 1, minHeight: 0 },
  list: {
    paddingHorizontal: tokens.size.screenPadding,
    paddingBottom: tokens.space[16],
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
  },
  listHead: { gap: tokens.space[12], paddingTop: tokens.space[8], paddingBottom: tokens.space[4] },
  search: {
    minHeight: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.bg.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[8],
    paddingHorizontal: tokens.space[16],
  },
  searchInput: {
    ...text.bodyMedium,
    color: tokens.color.text.primary,
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    outlineWidth: 0,
    outlineStyle: 'solid',
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondary: { color: tokens.color.text.secondary },
  muted: { color: tokens.color.text.muted },
  link: { color: tokens.color.text.secondary, textDecorationLine: 'underline' },
  errorNotice: {
    backgroundColor: tokens.color.danger.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space[12],
    gap: 2,
  },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], minHeight: 68 },
  exerciseBody: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: tokens.space[12], minHeight: 68 },
  exerciseInfo: { flex: 1, minWidth: 0, gap: 2 },
  empty: { gap: tokens.space[12], paddingTop: tokens.space[8] },
  footer: { gap: tokens.space[12], paddingTop: tokens.space[16] },
  custom: { gap: tokens.space[8] },
  sourceLink: { minHeight: 32, justifyContent: 'center' },
  dock: {
    paddingHorizontal: tokens.size.screenPadding,
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[8],
    width: '100%',
    maxWidth: size.contentMax,
    alignSelf: 'center',
  },
  sheetFoot: { flexDirection: 'row', alignItems: 'center' },
  announcement: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
});
