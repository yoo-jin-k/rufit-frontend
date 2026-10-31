import { NotificationButton } from '../../components/NotificationButton';
import { MiniTrend } from '../../components/MiniTrend';
/** 측정 데이터는 진입 시 기기 저장소에서 조회합니다. 저장되지 않은 샘플 수치를 표시하지 않습니다. */
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenLayout, ui } from '../../components/ScreenLayout';
import { AppIcon } from '../../components/AppIcon';
import { monthlyProgress } from '../calendar/monthlyProgress';
import { localDay } from '../calendar/model';
import type { Workout } from '../workout/model';
import { decode, storageKey, total, type Measurement } from '../strength/model';
import { decodeWeight, weightStorageKey, type WeightRecord } from '../bodyweight/model';
export function AnalysisScreen({
  now,
  history,
  onStrength,
  onWeight,
}: {
  now: number;
  history: Workout[];
  onStrength: () => void;
  onWeight: () => void;
}) {
  const [strength, setStrength] = useState<Measurement[]>([]),
    [weight, setWeight] = useState<WeightRecord[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(storageKey).then(decode),
      AsyncStorage.getItem(weightStorageKey).then(decodeWeight),
    ])
      .then(([s, w]) => {
        if (active) {
          setStrength(s);
          setWeight(w);
        }
      })
      .catch(() => {
        if (active) setError('측정 기록을 불러오지 못했습니다. 측정 화면에서 다시 확인해 주세요.');
      });
    return () => {
      active = false;
    };
  }, []);
  const month = monthlyProgress(history, localDay(now).slice(0, 7));
  const latest = strength.at(-1),
    lastWeight = weight.at(-1);
  return (
    <ScreenLayout>
      <View style={{ gap: 8 }}>
        <View style={ui.between}>
          <Text style={ui.title}>분석</Text>
          <NotificationButton />
        </View>
        <Text style={ui.muted}>기록으로 보는 나의 변화</Text>
      </View>
      <View style={[ui.card, ui.row]}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={ui.muted}>{Number(month.month.slice(5))}월 운동</Text>
          <Text style={ui.title}>{month.workoutDays}일</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={ui.muted}>달성률</Text>
          <Text style={ui.title}>{month.percent}%</Text>
        </View>
      </View>
      <Text style={ui.heading}>측정 기록</Text>
      {[
        {
          title: '삼대 측정',
          values: strength.map(total),
          record: latest,
          value: latest ? `${total(latest)} kg` : '첫 기록 남기기',
          onPress: onStrength,
        },
        {
          title: '체중 측정',
          values: weight.map((r) => r.weight),
          record: lastWeight,
          value: lastWeight ? `${lastWeight.weight} kg` : '첫 기록 남기기',
          onPress: onWeight,
        },
      ].map((item) => (
        <Pressable
          key={item.title}
          accessibilityRole="button"
          onPress={item.onPress}
          style={[ui.card, ui.between]}
        >
          <View style={{ gap: 8 }}>
            <Text style={ui.heading}>{item.title}</Text>
            <Text style={ui.muted}>
              {item.record ? `최근 기록 · ${item.record.date}` : '아직 측정 기록이 없어요'}
            </Text>
            <Text style={ui.title}>{item.value}</Text>
          </View>
          <View style={ui.row}>
            <MiniTrend values={item.values} />
            <AppIcon name="chevron" size={16} />
          </View>
        </Pressable>
      ))}
      {!!error && <Text style={ui.error}>{error}</Text>}
      <Text style={[ui.muted, { textAlign: 'center' }]}>
        날짜별로 기록하면 변화가 그래프로 보여요.
      </Text>
    </ScreenLayout>
  );
}
