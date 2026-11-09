import classes from '../../theme/web/ExercisePickerFocus.module.css';
import { createWebStyles } from '../../theme/webStyles';
import type { exercisePickerFocusStyles as nativeStyles } from './ExercisePickerFocus.styles';

export const exercisePickerFocusStyles = createWebStyles(
  'rufit-exercise-picker-focus',
  classes,
) as unknown as typeof nativeStyles;
