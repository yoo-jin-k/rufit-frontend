/** Figma 03-18 오운완 저장 완료 화면입니다. 프로필에서 다시 보거나 홈으로 돌아갑니다. */
import { Image, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { AppModal } from '../../components/AppModal';
import { Button } from '../../components/Button';
import { NavBar, Screen } from '../../components/kit/Screen';
import { ListGroup, ListRow, PhotoPlaceholder } from '../../components/kit/Surfaces';
import { text, tokens } from '../../theme/tokens';
import type { Journal } from './journalModel';

const c = tokens.color;

export function JournalSaved({
  journal,
  accountSaved,
  onProfile,
  onHome,
}: {
  journal: Journal | null;
  /** 계정에 저장했을 때만 공개 범위를 보여 줍니다. 기기 저장은 항상 나만 보기입니다. */
  accountSaved: boolean;
  onProfile: () => void;
  onHome: () => void;
}) {
  const photo = journal?.photos?.[0] ?? journal?.photo;
  return (
    <AppModal visible={!!journal} animationType="fade" onRequestClose={onHome}>
      <Screen
        header={<NavBar leading="close" onLeading={onHome} />}
        footer={
          <>
            <Button title="프로필에서 보기" variant="secondary" onPress={onProfile} />
            <Button title="홈으로" onPress={onHome} />
          </>
        }
      >
        <View style={s.center}>
          {photo ? (
            <Image source={{ uri: photo }} accessibilityLabel="오운완 대표 사진" style={s.photo} resizeMode="cover" />
          ) : (
            <PhotoPlaceholder style={s.photo} />
          )}
          <View style={s.check}>
            <AppIcon name="check" color={c.text.inverse} strokeWidth={2} />
          </View>
          <Text accessibilityRole="header" style={[text.titleM, { color: c.text.primary }]}>오운완을 저장했어요</Text>
          <Text style={[text.callout, { color: c.text.secondary }]}>프로필 오운완 탭에서 다시 볼 수 있어요</Text>
        </View>
        <ListGroup>
          <ListRow
            label="친구 공개 범위"
            value={accountSaved && journal?.visibility === 'friends' ? '친구 모두' : '나만 보기'}
            trailing="none"
          />
        </ListGroup>
      </Screen>
    </AppModal>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', gap: tokens.space[8], paddingBottom: tokens.space[8] },
  photo: { width: '66%', maxWidth: 240, aspectRatio: 240 / 300, borderRadius: tokens.radius.xl },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.bg.inverse,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.space[8],
  },
});
