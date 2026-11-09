/** 네이티브와 웹의 최상위 프레임을 분리합니다. 네이티브는 안전 영역을 상위 Provider에 맡깁니다. */
import type { ReactNode } from 'react';
import { View } from 'react-native';
export function AppSurface({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, minHeight: 0 }}>{children}</View>;
}
