/** 게시물 사진을 좌우로 넘깁니다. 좁은 화면과 키보드 사용자도 이전·다음 버튼을 이용할 수 있습니다. */
import { useRef, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ui } from '../../components/ScreenLayout';
export function JournalGallery({ photos }: { photos: string[] }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroll = useRef<ScrollView>(null);
  function go(next: number) {
    setIndex(next);
    scroll.current?.scrollTo({ x: next * width, animated: true });
  }
  return <View style={{ gap: 12 }} onLayout={(event) => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth(nextWidth);
    scroll.current?.scrollTo({ x: index * nextWidth, animated: false });
  }}>
    <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={(event) => { if (width) setIndex(Math.max(0, Math.min(photos.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)))); }}>
      {width > 0 && photos.map((photo, i) => <Image key={i} source={{ uri: photo }}
        accessibilityLabel={`오운완 사진 ${i + 1}`} accessible resizeMode="contain" style={{ width, height: width }} />)}
    </ScrollView>
    {photos.length > 1 && <View style={[ui.row, { justifyContent: 'space-between' }]}>
      <Button title="이전" secondary disabled={index === 0} onPress={() => go(index - 1)} />
      <Text style={ui.muted}>{index + 1} / {photos.length}</Text>
      <Button title="다음" secondary disabled={index === photos.length - 1} onPress={() => go(index + 1)} />
    </View>}
  </View>;
}
