/**
 * Formatting helpers for logged class results.
 *
 * A result carries a `metricType` (time/reps/weight/rounds/note), a `value`
 * (always a string), and a `unit` (seconds/minutes/reps/kg/lb/rounds/none).
 * These helpers turn that into the compact "<value> · <Metric>" display used
 * on the athlete's Training History and Class Details screens, matching the
 * designs (e.g. "08:42 · Time", "95 kg · Weight", "12 · Rounds").
 */

type MetricType = 'time' | 'reps' | 'weight' | 'rounds' | 'note';
type ResultUnit = 'seconds' | 'minutes' | 'reps' | 'kg' | 'lb' | 'rounds' | 'none';

/** Minimal shape shared by the result DTOs across endpoints. */
export interface FormattableResult {
  metricType: MetricType;
  value: string;
  unit: ResultUnit;
}

const METRIC_LABEL: Record<MetricType, string> = {
  time: 'Time',
  reps: 'Reps',
  weight: 'Weight',
  rounds: 'Rounds',
  note: 'Note',
};

/** Human-readable metric label ("Time", "Weight", …). */
export function formatMetricLabel(metricType: MetricType): string {
  return METRIC_LABEL[metricType] ?? metricType;
}

/**
 * Formats a time result's numeric seconds into "MM:SS" (or "H:MM:SS" past an
 * hour). Falls back to the raw value if it isn't a finite number.
 */
function formatTimeValue(value: string): string {
  const totalSeconds = Number(value);
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return value;
  const secs = Math.round(totalSeconds);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats a result's value with its unit for display.
 * - time → "MM:SS" (seconds/minutes rendered as a clock)
 * - weight → "95 kg" / "135 lb"
 * - reps/rounds → "20 reps" / "12 rounds" (unit appended when meaningful)
 * - note or unit "none" → the raw value
 */
export function formatResultValue(result: FormattableResult): string {
  const { metricType, value, unit } = result;

  if (metricType === 'time') {
    return formatTimeValue(value);
  }
  if (unit === 'none') {
    return value;
  }
  return `${value} ${unit}`;
}

/**
 * Compact "<value> · <Metric>" display, e.g. "08:42 · Time".
 */
export function formatResultSummary(result: FormattableResult): string {
  return `${formatResultValue(result)} · ${formatMetricLabel(result.metricType)}`;
}
