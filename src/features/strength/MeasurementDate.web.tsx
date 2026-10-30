import css from '../../theme/web/MeasurementDate.module.css';
import { today } from './model';
// 날짜 선택기의 input 이벤트도 즉시 반영해 표시 날짜와 저장 날짜를 일치시킵니다.
export function MeasurementDate({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      className={css.input}
      aria-label="측정 날짜"
      type="date"
      min="1900-01-01"
      max={today()}
      value={value}
      disabled={disabled}
      onInput={(event) => onChange(event.currentTarget.value)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
