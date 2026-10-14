export type DiffKind = 'add' | 'remove' | 'equal';

export interface DiffSection<T> {
  kind: DiffKind;
  values: T[];
}

export interface DiffCounts {
  addedLines: number;
  removedLines: number;
  unchangedLines: number;
  addedCharacters: number;
  removedCharacters: number;
  addedWords: number;
  removedWords: number;
}

export class DiffLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiffLimitError';
  }
}

const MAX_TEXT_CHARACTERS = 200_000;
const MAX_TOKENS = 30_000;
const MAX_MIDDLE_TOKENS = 12_000;
const MAX_EDIT_DISTANCE = 1_600;
const MAX_DIFF_WORK = 10_000_000;
const WORD_TOKEN_PATTERN = /[\p{L}\p{M}\p{N}_]+(?:['’][\p{L}\p{M}\p{N}_]+)*|\s+|[^\s]/gu;
const WORD_PATTERN = /^[\p{L}\p{M}\p{N}_]+(?:['’][\p{L}\p{M}\p{N}_]+)*$/u;

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

export function countLines(text: string): number {
  if (text.length === 0) return 0;
  return splitLines(text).length;
}

export function countCharacters(text: string): number {
  return Array.from(normalizeLineEndings(text)).length;
}

export function splitLines(text: string): string[] {
  const normalized = normalizeLineEndings(text);
  if (normalized.length === 0) return [];
  return normalized.split('\n');
}

export function tokenizeWords(text: string): string[] {
  return normalizeLineEndings(text).match(WORD_TOKEN_PATTERN) ?? [];
}

export function diffSequences<T>(original: T[], modified: T[]): DiffSection<T>[] {
  let prefixLength = 0;
  while (
    prefixLength < original.length
    && prefixLength < modified.length
    && original[prefixLength] === modified[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < original.length - prefixLength
    && suffixLength < modified.length - prefixLength
    && original[original.length - suffixLength - 1] === modified[modified.length - suffixLength - 1]
  ) {
    suffixLength += 1;
  }

  const originalMiddle = original.slice(prefixLength, original.length - suffixLength);
  const modifiedMiddle = modified.slice(prefixLength, modified.length - suffixLength);

  if (original.length + modified.length > MAX_TOKENS) {
    throw new DiffLimitError('This comparison is too large. Try comparing smaller sections of text.');
  }

  const middleSections = originalMiddle.length === 0
    ? modifiedMiddle.map((value) => ({ kind: 'add' as const, values: [value] }))
    : modifiedMiddle.length === 0
      ? originalMiddle.map((value) => ({ kind: 'remove' as const, values: [value] }))
      : buildMiddleDiff(originalMiddle, modifiedMiddle);

  return coalesceSections([
    ...(prefixLength > 0 ? [{ kind: 'equal' as const, values: original.slice(0, prefixLength) }] : []),
    ...middleSections,
    ...(suffixLength > 0
      ? [{ kind: 'equal' as const, values: original.slice(original.length - suffixLength) }]
      : []),
  ]);
}

export function compareLines(original: string, modified: string): DiffSection<string>[] {
  return diffSequences(splitLines(original), splitLines(modified));
}

export function compareWords(original: string, modified: string): DiffSection<string>[] {
  const normalizedOriginal = normalizeLineEndings(original);
  const normalizedModified = normalizeLineEndings(modified);
  if (countCharacters(normalizedOriginal) + countCharacters(normalizedModified) > MAX_TEXT_CHARACTERS) {
    throw new DiffLimitError('This comparison is too large. Try comparing smaller sections of text.');
  }
  return diffSequences(tokenizeWords(normalizedOriginal), tokenizeWords(normalizedModified));
}

export function countDiffCharacters(sections: DiffSection<string>[], kind: 'add' | 'remove'): number {
  return sections
    .filter((section) => section.kind === kind)
    .reduce((total, section) => (
      total + section.values.reduce((length, value) => length + Array.from(value).length, 0)
    ), 0);
}

export function countDiffWords(sections: DiffSection<string>[], kind: 'add' | 'remove'): number {
  return sections
    .filter((section) => section.kind === kind)
    .reduce((total, section) => (
      total + section.values.filter((value) => WORD_PATTERN.test(value)).length
    ), 0);
}

export function countDiffLines(sections: DiffSection<string>[], kind: DiffKind): number {
  return sections
    .filter((section) => section.kind === kind)
    .reduce((total, section) => total + section.values.length, 0);
}

export function getDiffCounts(
  lineSections: DiffSection<string>[],
  activeSections: DiffSection<string>[],
): DiffCounts {
  return {
    addedLines: countDiffLines(lineSections, 'add'),
    removedLines: countDiffLines(lineSections, 'remove'),
    unchangedLines: countDiffLines(lineSections, 'equal'),
    addedCharacters: countDiffCharacters(activeSections, 'add'),
    removedCharacters: countDiffCharacters(activeSections, 'remove'),
    addedWords: countDiffWords(activeSections, 'add'),
    removedWords: countDiffWords(activeSections, 'remove'),
  };
}

function buildMiddleDiff<T>(original: T[], modified: T[]): DiffSection<T>[] {
  if (original.length + modified.length > MAX_MIDDLE_TOKENS) {
    throw new DiffLimitError('This comparison has too many changes to process at once. Try smaller text sections.');
  }

  const maxDistance = Math.min(original.length + modified.length, MAX_EDIT_DISTANCE);
  const offset = maxDistance + 1;
  const frontier = new Int32Array((maxDistance + 1) * 2 + 1);
  frontier.fill(-1);
  frontier[offset + 1] = 0;
  const trace: Int32Array[] = [];
  let work = 0;

  for (let distance = 0; distance <= maxDistance; distance += 1) {
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      work += 1;
      if (work > MAX_DIFF_WORK) {
        throw new DiffLimitError('This comparison needs too much processing. Try smaller text sections.');
      }

      let x: number;
      if (
        diagonal === -distance
        || (diagonal !== distance && frontier[offset + diagonal - 1] < frontier[offset + diagonal + 1])
      ) {
        x = frontier[offset + diagonal + 1];
      } else {
        x = frontier[offset + diagonal - 1] + 1;
      }

      let y = x - diagonal;
      while (x < original.length && y < modified.length && original[x] === modified[y]) {
        x += 1;
        y += 1;
        work += 1;
        if (work > MAX_DIFF_WORK) {
          throw new DiffLimitError('This comparison needs too much processing. Try smaller text sections.');
        }
      }

      frontier[offset + diagonal] = x;
      if (x >= original.length && y >= modified.length) {
        return backtrackDiff(original, modified, trace, distance, x, y);
      }
    }

    const snapshot = new Int32Array(distance * 2 + 1);
    for (let diagonal = -distance; diagonal <= distance; diagonal += 1) {
      snapshot[diagonal + distance] = frontier[offset + diagonal];
    }
    trace.push(snapshot);
  }

  throw new DiffLimitError('This comparison has too many changes to process at once. Try smaller text sections.');
}

function backtrackDiff<T>(
  original: T[],
  modified: T[],
  trace: Int32Array[],
  finalDistance: number,
  finalX: number,
  finalY: number,
): DiffSection<T>[] {
  const reversed: DiffSection<T>[] = [];
  let x = finalX;
  let y = finalY;

  for (let distance = finalDistance; distance > 0; distance -= 1) {
    const previous = trace[distance - 1];
    const diagonal = x - y;
    const previousDiagonal = (
      diagonal === -distance
      || (diagonal !== distance
        && previous[diagonal - 1 + distance - 1] < previous[diagonal + 1 + distance - 1])
    ) ? diagonal + 1 : diagonal - 1;
    const previousX = previous[previousDiagonal + distance - 1];
    const previousY = previousX - previousDiagonal;

    while (x > previousX && y > previousY) {
      reversed.push({ kind: 'equal', values: [original[x - 1]] });
      x -= 1;
      y -= 1;
    }

    if (x === previousX) {
      reversed.push({ kind: 'add', values: [modified[y - 1]] });
      y -= 1;
    } else {
      reversed.push({ kind: 'remove', values: [original[x - 1]] });
      x -= 1;
    }
  }

  while (x > 0 && y > 0) {
    reversed.push({ kind: 'equal', values: [original[x - 1]] });
    x -= 1;
    y -= 1;
  }
  while (x > 0) {
    reversed.push({ kind: 'remove', values: [original[x - 1]] });
    x -= 1;
  }
  while (y > 0) {
    reversed.push({ kind: 'add', values: [modified[y - 1]] });
    y -= 1;
  }

  return coalesceSections(reversed.reverse());
}

function coalesceSections<T>(sections: DiffSection<T>[]): DiffSection<T>[] {
  const result: DiffSection<T>[] = [];
  for (const section of sections) {
    if (section.values.length === 0) continue;
    const previous = result[result.length - 1];
    if (previous?.kind === section.kind) {
      previous.values.push(...section.values);
    } else {
      result.push({ kind: section.kind, values: [...section.values] });
    }
  }
  return result;
}
