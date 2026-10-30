import classes from '../theme/web/Button.module.css';
import { createWebStyles } from '../theme/webStyles';
import type { buttonStyles as nativeStyles } from './Button.styles';
// 웹 전용 클래스는 역할별로 합칩니다. 네이티브 번들에는 CSS를 가져오지 않습니다.
export const buttonStyles = createWebStyles(
  'rufit-button',
  classes,
) as unknown as typeof nativeStyles;
