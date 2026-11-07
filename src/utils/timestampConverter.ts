export type TimestampUnit = 'seconds' | 'milliseconds';
export type TimestampUnitMode = 'auto' | TimestampUnit;

export interface ParsedTimestamp {
  date: Date;
  epochMilliseconds: number;
  unit: TimestampUnit;
  unitIsAmbiguous: boolean;
}

export type TimestampParseResult =
  | { success: true; value: ParsedTimestamp }
  | { success: false; error: string };

export const MAX_DATE_MILLISECONDS = 8.64e15;

export function parseUnixTimestamp(
  input: string,
  unitMode: TimestampUnitMode,
): TimestampParseResult {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return { success: false, error: 'Enter a Unix timestamp.' };
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmedInput)) {
    return { success: false, error: 'Enter a valid numeric timestamp.' };
  }

  const timestamp = Number(trimmedInput);
  if (!Number.isFinite(timestamp)) {
    return { success: false, error: 'Enter a valid numeric timestamp.' };
  }

  const absoluteTimestamp = Math.abs(timestamp);
  const unitIsAmbiguous =
    unitMode === 'auto' &&
    absoluteTimestamp >= 10_000_000_000 &&
    absoluteTimestamp < 100_000_000_000;
  const unit: TimestampUnit =
    unitMode === 'auto'
      ? absoluteTimestamp >= 100_000_000_000
        ? 'milliseconds'
        : 'seconds'
      : unitMode;
  const epochMilliseconds = unit === 'seconds' ? timestamp * 1000 : timestamp;

  if (
    !Number.isFinite(epochMilliseconds) ||
    Math.abs(epochMilliseconds) > MAX_DATE_MILLISECONDS
  ) {
    return {
      success: false,
      error: 'This timestamp is outside the date range supported by JavaScript.',
    };
  }

  const date = new Date(epochMilliseconds);
  if (Number.isNaN(date.getTime())) {
    return {
      success: false,
      error: 'This timestamp cannot be represented as a valid date.',
    };
  }

  return {
    success: true,
    value: { date, epochMilliseconds: date.getTime(), unit, unitIsAmbiguous },
  };
}

export function parseLocalDateTime(input: string): Date | null {
  if (!input || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(input)) {
    return null;
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, secondsPart = '0'] = timePart.split(':');
  const [second, millisecondPart = '0'] = secondsPart.split('.');
  const millisecond = Number(millisecondPart.padEnd(3, '0'));

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== Number(hour) ||
    date.getMinutes() !== Number(minute) ||
    date.getSeconds() !== Number(second) ||
    date.getMilliseconds() !== millisecond
  ) {
    return null;
  }

  return date;
}

export function formatDateTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function formatHumanReadableDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'long',
  }).format(date);
}

export function formatRelativeTime(date: Date, now: number): string {
  const differenceSeconds = (date.getTime() - now) / 1000;
  if (Math.abs(differenceSeconds) < 5) return 'Just now';

  const units: Array<{ size: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { size: 60, unit: 'second' },
    { size: 60, unit: 'minute' },
    { size: 24, unit: 'hour' },
    { size: 7, unit: 'day' },
    { size: 4.345, unit: 'week' },
    { size: 12, unit: 'month' },
    { size: Number.POSITIVE_INFINITY, unit: 'year' },
  ];

  let value = differenceSeconds;
  for (const { size, unit } of units) {
    if (Math.abs(value) < size) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(
        Math.round(value),
        unit,
      );
    }
    value /= size;
  }

  return 'Just now';
}

export function getSupportedTimeZones(): string[] {
  const intlWithTimeZones = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  if (typeof intlWithTimeZones.supportedValuesOf === 'function') {
    return intlWithTimeZones.supportedValuesOf('timeZone');
  }

  return [
    'Africa/Accra',
    'America/Los_Angeles',
    'America/New_York',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Europe/London',
    'Europe/Paris',
    'Pacific/Auckland',
  ];
}

export function getLocalDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${milliseconds}`;
}
