export interface KeywordFrequency {
  word: string;
  count: number;
}

export interface TextAnalysis {
  wordCount: number;
  characters: number;
  charactersWithoutWhitespace: number;
  letters: number;
  digits: number;
  spaces: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  averageWordLength: number;
  longestWord: string | null;
  shortestWord: string | null;
  keywords: KeywordFrequency[];
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for',
  'from', 'had', 'has', 'have', 'he', 'her', 'hers', 'him', 'his', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'no', 'not', 'of',
  'on', 'or', 'our', 'ours', 'she', 'so', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
  'to', 'too', 'up', 'us', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'who', 'will', 'with', 'you', 'your', 'yours',
]);

const HAS_LETTER_OR_NUMBER = /[\p{L}\p{M}\p{N}]/u;
const SURROUNDING_PUNCTUATION = /^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu;
const LETTER = /\p{L}/gu;
const DIGIT = /\p{N}/gu;
const WHITESPACE = /\s/u;
const SENTENCE_ENDINGS = /[.!?…]+/gu;

function getWords(text: string): string[] {
  return text.normalize('NFC')
    .split(/\s+/u)
    .map((word) => word.replace(SURROUNDING_PUNCTUATION, ''))
    .filter((word) => HAS_LETTER_OR_NUMBER.test(word));
}

function countParagraphs(text: string): number {
  if (!text) return 0;

  let paragraphs = 0;
  let inParagraph = false;
  for (const line of text.split(/\r\n|\r|\n/u)) {
    if (line.trim().length > 0) {
      if (!inParagraph) paragraphs += 1;
      inParagraph = true;
    } else {
      inParagraph = false;
    }
  }
  return paragraphs;
}

export function analyzeText(text: string): TextAnalysis {
  const characters = Array.from(text);
  const words = getWords(text);
  const wordLengths = words.map((word) => Array.from(word).length);
  const frequencies = new Map<string, number>();

  for (const word of words) {
    const keyword = word.replace(/\p{P}/gu, '').toLowerCase();
    if (!keyword || STOP_WORDS.has(keyword)) continue;
    frequencies.set(keyword, (frequencies.get(keyword) ?? 0) + 1);
  }

  const keywords = Array.from(frequencies, ([word, count]) => ({ word, count }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word))
    .slice(0, 10);
  const longestIndex = wordLengths.reduce(
    (best, length, index) => length > (wordLengths[best] ?? -1) ? index : best,
    -1,
  );
  const shortestIndex = wordLengths.reduce(
    (best, length, index) => length < (wordLengths[best] ?? Infinity) ? index : best,
    -1,
  );

  return {
    wordCount: words.length,
    characters: characters.length,
    charactersWithoutWhitespace: characters.filter((character) => !WHITESPACE.test(character)).length,
    letters: (text.match(LETTER) ?? []).length,
    digits: (text.match(DIGIT) ?? []).length,
    spaces: (text.match(/ /gu) ?? []).length,
    lines: text.length === 0 ? 0 : text.split(/\r\n|\r|\n/u).length,
    sentences: (text.match(SENTENCE_ENDINGS) ?? []).length,
    paragraphs: countParagraphs(text),
    averageWordLength: wordLengths.length === 0
      ? 0
      : wordLengths.reduce((sum, length) => sum + length, 0) / wordLengths.length,
    longestWord: longestIndex === -1 ? null : words[longestIndex],
    shortestWord: shortestIndex === -1 ? null : words[shortestIndex],
    keywords,
  };
}

export function formatReadingTime(wordCount: number, wordsPerMinute: number): string {
  if (wordCount <= 0) return '0 sec';
  const totalSeconds = Math.ceil(wordCount * 60 / wordsPerMinute);
  if (totalSeconds < 60) return `${totalSeconds} sec`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} sec`;
}
