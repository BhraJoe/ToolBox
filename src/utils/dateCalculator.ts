const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type DateUnit = "days" | "weeks" | "months" | "years";
export type DateOperation = "add" | "subtract";

export interface DateDifferenceResult {
  totalDays: number;
  weeks: number;
  remainingWeekDays: number;
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  startWeekday: string;
  endWeekday: string;
}

export interface NewDateResult {
  date: Date;
}

function createCalendarDate(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, monthIndex, day);
  return date;
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return createCalendarDate(year, monthIndex + 1, 0).getUTCDate();
}

function createClampedDate(year: number, monthIndex: number, day: number): Date {
  return createCalendarDate(year, monthIndex, Math.min(day, getDaysInMonth(year, monthIndex)));
}

function toDayNumber(date: Date): number {
  return date.getTime() / MILLISECONDS_PER_DAY;
}

function fromDayNumber(dayNumber: number): Date {
  return new Date(dayNumber * MILLISECONDS_PER_DAY);
}

function isSupportedYear(date: Date): boolean {
  return date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999;
}

export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999 || month < 1 || month > 12) return null;

  const date = createCalendarDate(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatDateOnly(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function getWeekday(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
}

function addYears(date: Date, years: number): Date {
  return createClampedDate(
    date.getUTCFullYear() + years,
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

function addMonths(date: Date, months: number): Date {
  const monthIndex = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex % 12;
  return createClampedDate(year, month, date.getUTCDate());
}

export function calculateDateDifference(
  startDate: Date,
  endDate: Date,
  includeEndDate: boolean,
): DateDifferenceResult {
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    throw new Error("Enter valid start and end dates.");
  }
  if (toDayNumber(endDate) < toDayNumber(startDate)) {
    throw new Error("The end date must be on or after the start date.");
  }

  const startDayNumber = toDayNumber(startDate);
  const totalDays = toDayNumber(endDate) - startDayNumber + (includeEndDate ? 1 : 0);
  const effectiveEndDate = fromDayNumber(startDayNumber + totalDays);

  let years = effectiveEndDate.getUTCFullYear() - startDate.getUTCFullYear();
  while (toDayNumber(addYears(startDate, years)) > toDayNumber(effectiveEndDate)) {
    years -= 1;
  }

  const afterYears = addYears(startDate, years);
  let months =
    (effectiveEndDate.getUTCFullYear() - afterYears.getUTCFullYear()) * 12 +
    effectiveEndDate.getUTCMonth() -
    afterYears.getUTCMonth();
  while (months > 0 && toDayNumber(addMonths(afterYears, months)) > toDayNumber(effectiveEndDate)) {
    months -= 1;
  }
  while (toDayNumber(addMonths(afterYears, months + 1)) <= toDayNumber(effectiveEndDate)) {
    months += 1;
  }

  const afterMonths = addMonths(afterYears, months);
  const days = toDayNumber(effectiveEndDate) - toDayNumber(afterMonths);

  return {
    totalDays,
    weeks: Math.floor(totalDays / 7),
    remainingWeekDays: totalDays % 7,
    years,
    months,
    days,
    totalMonths: years * 12 + months,
    startWeekday: getWeekday(startDate),
    endWeekday: getWeekday(endDate),
  };
}

export function calculateNewDate(
  startDate: Date,
  operation: DateOperation,
  amount: number,
  unit: DateUnit,
): NewDateResult {
  if (!Number.isFinite(startDate.getTime())) {
    throw new Error("Enter a valid starting date.");
  }
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("Enter a non-negative whole number for the amount.");
  }

  const direction = operation === "add" ? 1 : -1;
  let result: Date;

  switch (unit) {
    case "days":
    case "weeks": {
      const days = amount * (unit === "weeks" ? 7 : 1) * direction;
      if (!Number.isSafeInteger(days)) {
        throw new Error("That amount is too large to calculate.");
      }
      result = fromDayNumber(toDayNumber(startDate) + days);
      break;
    }
    case "months":
      result = addMonths(startDate, amount * direction);
      break;
    case "years":
      result = addYears(startDate, amount * direction);
      break;
  }

  if (!isSupportedYear(result)) {
    throw new Error("The calculated date is outside the supported calendar range.");
  }
  return { date: result };
}
