/** 웹 프레임의 반응형 폭과 포커스는 Sass 원본에서 수정해 주세요. CSS는 빌드 생성물입니다. */
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import classes from '../theme/web/AppSurface.module.css';
import { createWebStyles } from '../theme/webStyles';
const styles = createWebStyles('rufit-surface', classes);
export function AppSurface({ children }: { children: ReactNode }) {
  return <View style={styles.frame as unknown as ViewStyle}>{children}</View>;
}
