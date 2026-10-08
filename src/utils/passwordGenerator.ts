export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export function getCharacterSet(options: PasswordOptions): string {
  let set = '';
  if (options.lowercase) set += LOWERCASE;
  if (options.uppercase) set += UPPERCASE;
  if (options.numbers) set += NUMBERS;
  if (options.symbols) set += SYMBOLS;
  return set;
}

export function getCharacterSets(options: PasswordOptions): string[] {
  const sets: string[] = [];
  if (options.lowercase) sets.push(LOWERCASE);
  if (options.uppercase) sets.push(UPPERCASE);
  if (options.numbers) sets.push(NUMBERS);
  if (options.symbols) sets.push(SYMBOLS);
  return sets;
}

export function secureRandomIndex(max: number): number {
  if (max <= 0) throw new Error('Max must be greater than 0');
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

export function pickRandomCharacter(charset: string): string {
  if (!charset) throw new Error('Character set cannot be empty');
  return charset[secureRandomIndex(charset.length)];
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export function generatePassword(options: PasswordOptions): string {
  const charsets = getCharacterSets(options);
  if (charsets.length === 0) {
    throw new Error('No character types selected');
  }

  const allChars = getCharacterSet(options);
  const passwordChars: string[] = [];

  charsets.forEach((charset) => {
    passwordChars.push(pickRandomCharacter(charset));
  });

  while (passwordChars.length < options.length) {
    passwordChars.push(pickRandomCharacter(allChars));
  }

  return shuffleArray(passwordChars).join('');
}

export interface StrengthResult {
  score: number;
  label: string;
  color: string;
}

export function calculateStrength(password: string): StrengthResult {
  if (password.length === 0) {
    return { score: 0, label: 'None', color: 'transparent' };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (password.length >= 24) score += 1;

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLowercase, hasUppercase, hasNumbers, hasSymbols].filter(Boolean).length;
  score += Math.min(varietyCount, 4);

  const maxScore = 8;
  const normalizedScore = Math.min(score, maxScore);

  if (normalizedScore <= 2) {
    return { score: normalizedScore, label: 'Weak', color: '#ef4444' };
  }
  if (normalizedScore <= 4) {
    return { score: normalizedScore, label: 'Fair', color: '#f59e0b' };
  }
  if (normalizedScore <= 6) {
    return { score: normalizedScore, label: 'Strong', color: '#2563eb' };
  }
  return { score: normalizedScore, label: 'Very Strong', color: '#16a34a' };
}