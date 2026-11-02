export interface RegexMatch {
  index: number;
  end: number;
  value: string;
  captures: (string | null)[];
  namedCaptures: { name: string; value: string | null }[];
}

export interface RegexAnalysis {
  matches: RegexMatch[];
  truncated: boolean;
}

export type RegexWorkerRequest =
  | { id: number; operation: 'match'; pattern: string; flags: string; text: string }
  | {
    id: number;
    operation: 'replace';
    pattern: string;
    flags: string;
    text: string;
    replacement: string;
    all: boolean;
  };

export type RegexWorkerResponse =
  | { id: number; success: true; operation: 'match'; result: RegexAnalysis }
  | { id: number; success: true; operation: 'replace'; result: string }
  | { id: number; success: false; error: string };

const MAX_MATCHES = 1000;

function advanceStringIndex(value: string, index: number, unicode: boolean): number {
  if (!unicode || index + 1 >= value.length) return index + 1;

  const first = value.charCodeAt(index);
  const second = value.charCodeAt(index + 1);
  return first >= 0xd800 && first <= 0xdbff && second >= 0xdc00 && second <= 0xdfff
    ? index + 2
    : index + 1;
}

export function analyzeRegex(pattern: string, flags: string, text: string): RegexAnalysis {
  const expression = new RegExp(pattern, flags);
  const matches: RegexMatch[] = [];
  const global = flags.includes('g');

  while (matches.length < MAX_MATCHES) {
    const match = expression.exec(text);
    if (!match) break;

    const index = match.index;
    matches.push({
      index,
      end: index + match[0].length,
      value: match[0],
      captures: match.slice(1).map((value) => value ?? null),
      namedCaptures: Object.entries(match.groups ?? {}).map(([name, value]) => ({
        name,
        value: value ?? null,
      })),
    });

    if (!global) break;
    if (match[0].length === 0) {
      expression.lastIndex = advanceStringIndex(text, expression.lastIndex, flags.includes('u'));
    }
  }

  const truncated = global && matches.length === MAX_MATCHES && expression.exec(text) !== null;

  return {
    matches,
    truncated,
  };
}

export function replaceRegex(
  pattern: string,
  flags: string,
  text: string,
  replacement: string,
  all: boolean,
): string {
  const replacementFlags = all
    ? flags.includes('g') ? flags : `${flags}g`
    : flags.replace('g', '');

  return text.replace(new RegExp(pattern, replacementFlags), replacement);
}
