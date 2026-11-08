import classes from '../../theme/web/SetDrag.module.css';
import { createWebStyles } from '../../theme/webStyles';
import type { setDragStyles as nativeStyles } from './SetDrag.styles';
export const setDragStyles = createWebStyles('rufit-set-drag', classes) as unknown as typeof nativeStyles;
