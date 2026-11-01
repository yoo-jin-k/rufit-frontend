import { NotificationButton } from '../../components/NotificationButton';
/** 설정 항목은 실제 지원 범위를 명시합니다. 미연결 기능을 켜짐이나 로그인 완료로 표시하지 않습니다. */
import { useState } from 'react';
import { Platform, Pressable, Share, Text, TextInput, View } from 'react-native';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import type { Workout } from '../workout/model';
export function SettingsScreen({
  defaultRest,
  onRest,
  nickname,
  history,
  onProfile,
  onAuth,
  authLabel,
}: {
  defaultRest?: number;
  onRest: (value: number | null) => void;
  nickname: string;
  history: Workout[];
  onProfile: () => void;
  onAuth?: () => void;
  authLabel: string;
}) {
  const [notice, setNotice] = useState('');
  const [restEditing, setRestEditing] = useState(false);
  const [restInput, setRestInput] = useState('90');
  async function exportRecords() {
    try {
      const text = JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), workouts: history },
        null,
        2,
      );
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rufit-workouts.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else await Share.share({ message: text });
      setNotice('운동 기록을 내보냈습니다.');
    } catch {
      setNotice('내보내지 못했습니다. 다시 시도해 주세요.');
    }
  }
  const groups = [
    {
      title: '운동',
      rows: [
        ['휴식 시간', defaultRest === undefined ? '종목 권장값' : `${defaultRest}초`, 'rest'],
        [
          '푸시 알림',
          '준비 중',
          '앱 밖에서 받는 푸시 알림은 아직 연결되지 않았습니다. 앱 안의 친구 신청은 상단 알림에서 확인할 수 있습니다.',
        ],
      ],
    },
    { title: '데이터', rows: [['운동 기록 내보내기', '', 'export']] },
    {
      title: '이용 안내',
      rows: [
        [
          '도움말',
          '',
          '운동 시작 → 종목 추가 → 무게·횟수 입력 → 세트 완료 → 운동 종료 순서로 기록합니다. 기록은 이 기기에 보관됩니다.',
        ],
        ['이용약관', '', '정식 서비스 이용약관은 출시 전 제공됩니다.'],
        [
          '개인정보처리방침',
          '',
          '현재 운동과 사진은 이 기기에 저장됩니다. 정식 개인정보처리방침은 서버 연동 범위 확정 후 제공됩니다.',
        ],
      ],
    },
  ];
  return (
    <ScreenLayout>
      <View style={ui.between}>
        <Text style={ui.title}>설정</Text>
        <NotificationButton />
      </View>
      <Pressable accessibilityRole="button" onPress={onProfile} style={[ui.card, ui.row]}>
        <AppIcon name="profile" />
        <View style={{ flex: 1 }}>
          <Text style={ui.heading}>{nickname}</Text>
          <Text style={ui.muted}>{authLabel === '계정' ? '계정 연결됨' : '이 기기에 기록 중'}</Text>
        </View>
        <Text style={ui.muted}>내 정보</Text>
        <AppIcon name="chevron" size={16} />
      </Pressable>
      {groups.map((group) => (
        <View key={group.title} style={{ gap: 10 }}>
          <Text style={ui.muted}>{group.title}</Text>
          {group.rows.map(([label, value, message]) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              onPress={() =>
                message === 'export'
                  ? void exportRecords()
                  : message === 'rest'
                    ? (setRestInput(String(defaultRest ?? 90)), setRestEditing(true))
                    : setNotice(message)
              }
              style={[ui.between, { minHeight: 52 }]}
            >
              <Text style={ui.body}>{label}</Text>
              <View style={ui.row}>
                <Text style={ui.muted}>{value}</Text>
                <AppIcon name="chevron" size={16} />
              </View>
            </Pressable>
          ))}
        </View>
      ))}
      <Text style={ui.muted}>내보내기는 완료한 운동 기록만 포함합니다. 사진·프로필·체중·삼대 측정은 포함되지 않습니다.</Text>
      {restEditing && (
        <View style={ui.card}>
          <Text style={ui.heading}>공통 휴식 시간</Text>
          <TextInput
            accessibilityLabel="공통 휴식시간 초"
            keyboardType="number-pad"
            value={restInput}
            onChangeText={setRestInput}
            style={ui.input}
          />
          <Text style={ui.muted}>
            0은 끄기, 최대 3600초입니다. 종목별 개인 설정이 우선하며 현재 휴식은 유지됩니다.
          </Text>
          <Button
            title="휴식시간 저장"
            onPress={() => {
              try {
                if (!/^\d+$/.test(restInput)) throw new Error('초 단위 숫자를 입력해 주세요.');
                onRest(Number(restInput));
                setRestEditing(false);
                setNotice('다음 세트부터 새 휴식시간을 적용합니다.');
              } catch (e) {
                setNotice(e instanceof Error ? e.message : '설정하지 못했습니다.');
              }
            }}
          />
          <Button
            title="종목 권장값 사용"
            secondary
            onPress={() => {
              onRest(null);
              setRestEditing(false);
            }}
          />
          <Button title="취소" secondary onPress={() => setRestEditing(false)} />
        </View>
      )}
      {!!notice && (
        <View style={ui.card}>
          <Text accessibilityLiveRegion="polite" style={ui.body}>
            {notice}
          </Text>
          <Button title="확인" secondary onPress={() => setNotice('')} />
        </View>
      )}
      <Button
        title={authLabel === '계정' ? '계정 관리 · 로그아웃' : '로그인'}
        secondary
        onPress={() => onAuth?.()}
      />
      <Text style={[ui.muted, { textAlign: 'center' }]}>버전 0.1.0</Text>
    </ScreenLayout>
  );
}
