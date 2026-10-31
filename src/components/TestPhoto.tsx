/** 한 장의 합성 사진 아틀라스를 셀 단위로 표시합니다. 외부 이미지 요청 없이 테스트 사진을 제공합니다. */
import { useState } from 'react';
import { Image, View } from 'react-native';
export function TestPhoto({
  tile,
  size,
  label,
  round = false,
}: {
  tile: number;
  size?: number;
  label: string;
  round?: boolean;
}) {
  const [width, setWidth] = useState(size ?? 0);
  const column = tile % 3,
    row = Math.floor(tile / 3);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      onLayout={(event) => {
        if (!size) setWidth(event.nativeEvent.layout.width);
      }}
      style={{
        width: size ?? '100%',
        aspectRatio: 1,
        overflow: 'hidden',
        borderRadius: round ? 999 : 0,
        backgroundColor: '#F5F5F7',
      }}
    >
      {width > 0 && (
        <Image
          accessible={false}
          source={require('../../assets/test-social/fitness-atlas.png')}
          style={{
            position: 'absolute',
            width: width * 3,
            height: width * 3,
            left: -column * width,
            top: -row * width,
          }}
        />
      )}
    </View>
  );
}
