export const CASE_FORMATS = [
  'UPPERCASE',
  'lowercase',
  'Title Case',
  'Sentence case',
  'Alternating Case',
  'Inverse Case',
  'camelCase',
  'PascalCase',
  'snake_case',
  'UPPER_SNAKE_CASE',
  'kebab-case',
  'Train-Case',
  'CONSTANT_CASE',
] as const;

export type CaseFormat = (typeof CASE_FORMATS)[number];

const WORD_SEGMENTS = /[\p{L}\p{M}\p{N}]+/gu;
const LETTER = /\p{L}/u;
const NUMBER = /\p{N}/u;

function isCased(character: string): boolean {
  return character.toLowerCase() !== character.toUpperCase();
}

function isLowercase(character: string): boolean {
  return isCased(character) && character === character.toLowerCase();
}

function isUppercase(character: string): boolean {
  return isCased(character) && character === character.toUpperCase();
}

function titleCase(text: string): string {
  return text.toLowerCase().replace(WORD_SEGMENTS, (word) => {
    const characters = Array.from(word);
    const firstLetterIndex = characters.findIndex((character) => LETTER.test(character));
    if (firstLetterIndex === -1) return word;
    characters[firstLetterIndex] = characters[firstLetterIndex].toUpperCase();
    return characters.join('');
  });
}

function sentenceCase(text: string): string {
  let shouldCapitalize = true;
  let result = '';

  for (const character of text.toLowerCase()) {
    if (LETTER.test(character)) {
      result += shouldCapitalize ? character.toUpperCase() : character;
      shouldCapitalize = false;
    } else {
      result += character;
      if (character === '.' || character === '!' || character === '?' || character === '\n') {
        shouldCapitalize = true;
      }
    }
  }

  return result;
}

function alternatingCase(text: string): string {
  let letterIndex = 0;
  let result = '';

  for (const character of text) {
    if (!isCased(character)) {
      result += character;
      continue;
    }

    result += letterIndex % 2 === 0
      ? character.toLowerCase()
      : character.toUpperCase();
    letterIndex += 1;
  }

  return result;
}

function inverseCase(text: string): string {
  return Array.from(text, (character) => {
    if (isLowercase(character)) return character.toUpperCase();
    if (isUppercase(character)) return character.toLowerCase();
    return character;
  }).join('');
}

export function normalizeWords(text: string): string[] {
  const words: string[] = [];

  for (const segment of text.normalize('NFC').match(WORD_SEGMENTS) ?? []) {
    const characters = Array.from(segment);
    let wordStart = 0;

    for (let index = 1; index < characters.length; index += 1) {
      const previous = characters[index - 1];
      const current = characters[index];
      const next = characters[index + 1];
      const followsWordEnd = isLowercase(previous) || NUMBER.test(previous);
      const startsLowercaseAfterAcronym =
        isUppercase(previous) && isUppercase(current) && next !== undefined && isLowercase(next);

      if (followsWordEnd && isUppercase(current) || startsLowercaseAfterAcronym) {
        words.push(characters.slice(wordStart, index).join(''));
        wordStart = index;
      }
    }

    words.push(characters.slice(wordStart).join(''));
  }

  return words;
}

function capitalizeWord(word: string): string {
  const [firstCharacter, ...remainingCharacters] = Array.from(word.toLowerCase());
  return `${firstCharacter.toUpperCase()}${remainingCharacters.join('')}`;
}

function joinNamingWords(words: string[], format: CaseFormat): string {
  const lowerWords = words.map((word) => word.toLowerCase());
  const upperWords = words.map((word) => word.toUpperCase());

  switch (format) {
    case 'camelCase':
      return lowerWords.map((word, index) => index === 0 ? word : capitalizeWord(word)).join('');
    case 'PascalCase':
      return lowerWords.map(capitalizeWord).join('');
    case 'snake_case':
      return lowerWords.join('_');
    case 'UPPER_SNAKE_CASE':
    case 'CONSTANT_CASE':
      return upperWords.join('_');
    case 'kebab-case':
      return lowerWords.join('-');
    case 'Train-Case':
      return lowerWords.map(capitalizeWord).join('-');
    default:
      return '';
  }
}

export function convertText(text: string, format: CaseFormat): string {
  if (text.length === 0) return '';

  switch (format) {
    case 'UPPERCASE':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'Title Case':
      return titleCase(text);
    case 'Sentence case':
      return sentenceCase(text);
    case 'Alternating Case':
      return alternatingCase(text);
    case 'Inverse Case':
      return inverseCase(text);
    default:
      return joinNamingWords(normalizeWords(text), format);
  }
}
