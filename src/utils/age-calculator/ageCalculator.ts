// Age Calculator Utilities
// Calendar-based age calculation (no division by 365)

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  totalHours: number;
  bornOnWeekday: string;
  nextBirthday: Date;
  daysUntilBirthday: number;
  isBirthdayToday: boolean;
}

export interface AgeCalculationInput {
  dob: Date;
  asOf: Date;
}

export function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

export function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  if (year % 4 === 0) return true;
  return false;
}

export function getDaysInMonth(year: number, month: number): number {
  // month is 0-indexed (0 = January)
  if (month === 1) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([3, 5, 8, 10].includes(month)) {
    return 30;
  }
  return 31;
}

export function cloneDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseLocalDate(input: string): Date | null {
  // Parse YYYY-MM-DD as local date (avoid timezone issues)
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;
  // Check if it was a valid calendar date (e.g., 2023-02-30 should fail)
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return null;
  }
  return d;
}

export function formatDateForInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getWeekdayName(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long' });
}

export function calculateAge(dob: Date, asOf: Date): AgeResult {
  if (!isValidDate(dob) || !isValidDate(asOf)) {
    throw new Error('Invalid date');
  }

  const dobCloned = cloneDate(dob);
  const asOfCloned = cloneDate(asOf);

  if (asOfCloned < dobCloned) {
    throw new Error('Calculation date cannot be before date of birth');
  }

  // Calculate age in years, months, days (calendar-based)
  let years = asOfCloned.getFullYear() - dobCloned.getFullYear();
  let months = asOfCloned.getMonth() - dobCloned.getMonth();
  let days = asOfCloned.getDate() - dobCloned.getDate();

  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = getDaysInMonth(asOfCloned.getFullYear(), asOfCloned.getMonth() - 1);
    days += daysInPrevMonth;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Total days (calendar days difference)
  const totalDays = Math.floor((asOfCloned.getTime() - dobCloned.getTime()) / (1000 * 60 * 60 * 24));

  // Total weeks (completed weeks) - show completed weeks and also note remaining? But spec says "Total weeks lived" and "if useful, also display remaining days" - we'll return total completed weeks
  const totalWeeks = Math.floor(totalDays / 7);

  // Total hours (approximate based on elapsed calendar days * 24)
  const totalHours = totalDays * 24;

  // Born weekday
  const bornOnWeekday = getWeekdayName(dobCloned);

  // Calculate next birthday
  let nextBirthdayYear = asOfCloned.getFullYear();
  let nextBirthdayMonth = dobCloned.getMonth();
  let nextBirthdayDay = dobCloned.getDate();

  // Handle Feb 29 for non-leap years - use Feb 28 (consistent convention)
  if (dobCloned.getMonth() === 1 && dobCloned.getDate() === 29 && !isLeapYear(nextBirthdayYear)) {
    nextBirthdayDay = 28;
  }

  let nextBirthday = new Date(nextBirthdayYear, nextBirthdayMonth, nextBirthdayDay);

  // If birthday has already passed this year (or is before asOf)
  if (nextBirthday < asOfCloned) {
    nextBirthdayYear = asOfCloned.getFullYear() + 1;
    if (dobCloned.getMonth() === 1 && dobCloned.getDate() === 29 && !isLeapYear(nextBirthdayYear)) {
      nextBirthdayDay = 28;
    }
    nextBirthday = new Date(nextBirthdayYear, nextBirthdayMonth, nextBirthdayDay);
  } else if (nextBirthday.getTime() === asOfCloned.getTime()) {
    // Birthday is today
  }

  const daysUntilBirthday = Math.floor((nextBirthday.getTime() - asOfCloned.getTime()) / (1000 * 60 * 60 * 24));
  const isBirthdayToday = daysUntilBirthday === 0;

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks,
    totalHours,
    bornOnWeekday,
    nextBirthday,
    daysUntilBirthday,
    isBirthdayToday,
  };
}

export function validateDob(dobInput: string, asOfInput?: string): { valid: boolean; message: string } {
  if (!dobInput || dobInput.trim() === '') {
    return { valid: false, message: 'Date of birth is required.' };
  }
  const dob = parseLocalDate(dobInput);
  if (!dob) {
    return { valid: false, message: 'Please enter a valid date of birth.' };
  }
  const today = new Date();
  const todayCloned = cloneDate(today);
  if (dob > todayCloned) {
    return { valid: false, message: 'Date of birth cannot be in the future.' };
  }
  if (asOfInput) {
    const asOf = parseLocalDate(asOfInput);
    if (asOf && dob > asOf) {
      return { valid: false, message: 'Date of birth cannot be after calculation date.' };
    }
  }
  return { valid: true, message: '' };
}

export function validateAsOf(asOfInput: string, dobInput?: string): { valid: boolean; message: string } {
  if (!asOfInput || asOfInput.trim() === '') {
    return { valid: false, message: 'Calculation date is required.' };
  }
  const asOf = parseLocalDate(asOfInput);
  if (!asOf) {
    return { valid: false, message: 'Please enter a valid calculation date.' };
  }
  if (dobInput) {
    const dob = parseLocalDate(dobInput);
    if (dob && asOf < dob) {
      return { valid: false, message: 'Calculation date cannot be before date of birth.' };
    }
  }
  return { valid: true, message: '' };
}
