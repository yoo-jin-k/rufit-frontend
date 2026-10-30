import {useEffect, useRef, useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Button} from '../../components/Button';
import {today} from '../strength/model';
import {MeasurementDate} from '../strength/MeasurementDate';
import {TrendChart} from '../strength/TrendChart';
import {s} from '../strength/styles';
import {decodeWeight, saveWeight, weightRecord, weightStorageKey, type WeightRecord} from './model';
export function BodyWeightScreen({onClose}: {onClose: () => void}) {
  const [records,setRecords] = useState<WeightRecord[]>([]);
  const [date,setDate] = useState(today);
  const [weight,setWeight] = useState('');
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(()=>{
    let active = true;
    AsyncStorage.getItem(weightStorageKey).then(decodeWeight).then(value=>{if(active){setRecords(value);setReady(true);const current=value.find(r=>r.date===today());if(current)setWeight(String(current.weight));}})
      .catch(()=>{if(active)setError('기록을 불러오지 못했습니다. 기존 데이터는 보존했습니다. 닫은 뒤 다시 열어 주세요.');});
    return ()=>{active=false;};
  },[]);
  function selectDate(value:string) {
    setDate(value);const current=records.find(r=>r.date===value);setWeight(current ? String(current.weight) : '');setNotice('');setError('');
  }
  async function save() {
    if(!ready || lock.current)return;
    try {
      const next=saveWeight(records,weightRecord(date,weight));
      lock.current=true;setBusy(true);setError('');setNotice('');
      // 삼대 기록과 별도의 저장 키를 사용하고 저장 성공 후에만 그래프를 갱신한다.
      await AsyncStorage.setItem(weightStorageKey,JSON.stringify({version:1,records:next}));
      setRecords(next);setNotice(`${date} 체중을 저장했습니다.`);
    } catch(e) {setError(e instanceof Error ? e.message : '저장하지 못했습니다. 다시 시도해 주세요.');}
    finally {lock.current=false;setBusy(false);}
  }
  const existing=records.some(r=>r.date===date);
  const latest=records.at(-1);
  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={s.page} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={s.row}><Text style={s.title}>체중측정</Text><Button title="닫기" secondary disabled={busy} onPress={onClose}/></View>
      <Text style={s.muted}>오늘의 체중을 기록하고, 나의 변화를 차근차근 확인해요.</Text>
      {latest && <View style={s.card}><Text style={s.muted}>최근 측정 · {latest.date}</Text><Text style={s.total}>{latest.weight} kg</Text></View>}
      <View style={s.card}>
        <Text style={s.heading}>{existing?'체중 기록 수정':'새 체중 기록'}</Text>
        <Text style={s.muted}>측정 날짜</Text><MeasurementDate value={date} onChange={selectDate} disabled={!ready||busy}/>
        <Text style={s.muted}>체중 (kg)</Text><TextInput accessibilityLabel="체중 kg" keyboardType="decimal-pad" placeholder="예: 72.5" value={weight} editable={ready&&!busy} onChangeText={value=>{setWeight(value);setNotice('');}} style={s.input}/>
        <Text style={s.muted}>같은 날짜를 선택하면 기존 체중을 수정할 수 있어요.</Text>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={s.success}>{notice}</Text>}
        <Button title={!ready?error?'기록을 불러올 수 없음':'기록 불러오는 중':busy?'저장 중…':existing?'이 날짜 체중 수정':'체중 기록 저장'} disabled={!ready||busy} onPress={()=>void save()}/>
      </View>
      <View style={s.card}><Text style={s.heading}>체중 변화 그래프</Text><TrendChart zeroBaseline={false} name="체중" points={records.map(r=>({date:r.date,value:r.weight}))} onSelect={value=>{if(!busy){selectDate(value);scroll.current?.scrollTo({y:0,animated:true});}}}/></View>
      <Text style={s.muted}>이 기기에 저장됩니다. 다른 기기와 자동 동기화되지 않습니다.</Text>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
