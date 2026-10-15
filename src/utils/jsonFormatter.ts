export type JsonIndentation = 2 | 4 | 'tab';

export type JsonStatistics = {
  characters: number;
  bytes: number;
  objectProperties: number;
  arrayElements: number;
  maximumDepth: number;
};

export type JsonParseResult =
  | { success: true; value: unknown }
  | { success: false; error: string };

type JsonContainer = Record<string, unknown> | unknown[];

function isJsonContainer(value: unknown): value is JsonContainer {
  return typeof value === 'object' && value !== null;
}

function getParseErrorMessage(error: SyntaxError, input: string): string {
  const location = error.message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (location) {
    return `Invalid JSON at line ${location[1]}, column ${location[2]}: ${error.message}`;
  }

  const position = error.message.match(/position\s+(\d+)/i);
  if (position) {
    const offset = Number(position[1]);
    const precedingText = input.slice(0, offset);
    const line = precedingText.split('\n').length;
    const lastLineBreak = precedingText.lastIndexOf('\n');
    const column = offset - lastLineBreak;
    return `Invalid JSON at line ${line}, column ${column}: ${error.message}`;
  }

  return `Invalid JSON: ${error.message}`;
}

export function parseJson(input: string): JsonParseResult {
  if (!input.trim()) {
    return { success: false, error: 'Enter JSON to validate.' };
  }

  try {
    return { success: true, value: JSON.parse(input) as unknown };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, error: getParseErrorMessage(error, input) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to parse this JSON input.',
    };
  }
}

export function stringifyJson(value: unknown, indentation: JsonIndentation | 0): string {
  const spacing = indentation === 'tab' ? '\t' : indentation;
  const output = JSON.stringify(value, null, spacing);
  if (output === undefined) {
    throw new Error('Unable to serialize this JSON value.');
  }
  return output;
}

export function getJsonStatistics(output: string, value: unknown): JsonStatistics {
  let objectProperties = 0;
  let arrayElements = 0;
  let maximumDepth = 0;
  const pending: Array<{ value: JsonContainer; depth: number }> = [];

  if (isJsonContainer(value)) {
    pending.push({ value, depth: 1 });
  }

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;

    maximumDepth = Math.max(maximumDepth, current.depth);
    if (Array.isArray(current.value)) {
      arrayElements += current.value.length;
      for (const item of current.value) {
        if (isJsonContainer(item)) {
          pending.push({ value: item, depth: current.depth + 1 });
        }
      }
      continue;
    }

    const values = Object.values(current.value);
    objectProperties += values.length;
    for (const item of values) {
      if (isJsonContainer(item)) {
        pending.push({ value: item, depth: current.depth + 1 });
      }
    }
  }

  return {
    characters: output.length,
    bytes: new TextEncoder().encode(output).length,
    objectProperties,
    arrayElements,
    maximumDepth,
  };
}
