import classes from '../../theme/web/Calendar.module.css';
import {createWebStyles} from '../../theme/webStyles';
import type {calendarStyles as nativeStyles} from './Calendar.styles';
export const calendarStyles=createWebStyles('rufit-calendar',classes) as unknown as typeof nativeStyles;
