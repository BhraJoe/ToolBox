export type UrlToolMode = 'encode-component' | 'decode-component' | 'encode-full' | 'decode-full';

export interface QueryParameterRow {
  name: string;
  value: string;
  encodedName: string;
  encodedValue: string;
}

function parseAbsoluteUrl(value: string): URL | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  try {
    return new URL(trimmedValue);
  } catch {
    return null;
  }
}

function decodeSafeComponent(value: string, label: string): string {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`Malformed percent-encoded ${label}. Please check the value and try again.`);
  }
}

function decodeQuerySegment(value: string): string {
  const normalized = value.replace(/\+/g, ' ');
  return decodeSafeComponent(normalized, 'query value');
}

export function isFullUrl(value: string): boolean {
  return Boolean(parseAbsoluteUrl(value));
}

export function encodeUrlComponent(value: string): string {
  return encodeURIComponent(value);
}

export function decodeUrlComponent(value: string): string {
  if (value.length === 0) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error('Malformed percent-encoded URL component. Check the input and try again.');
  }
}

export function encodeFullUrl(value: string): string {
  const parsedUrl = parseAbsoluteUrl(value);

  if (!parsedUrl) {
    throw new Error('Enter a valid full URL including a protocol and hostname, such as https://example.com/search?q=hello+world.');
  }

  return parsedUrl.toString();
}

export function decodeFullUrl(value: string): string {
  const parsedUrl = parseAbsoluteUrl(value);

  if (!parsedUrl) {
    throw new Error('Enter a valid full URL before decoding it.');
  }

  const username = parsedUrl.username ? decodeSafeComponent(parsedUrl.username, 'username') : '';
  const password = parsedUrl.password ? `:${decodeSafeComponent(parsedUrl.password, 'password')}` : '';
  const auth = username || password ? `${username}${password}@` : '';

  const pathname = parsedUrl.pathname
    .split('/')
    .map((segment) => (segment ? decodeSafeComponent(segment, 'path segment') : segment))
    .join('/');

  const query = parsedUrl.search
    ? `?${parsedUrl.search
        .slice(1)
        .split('&')
        .filter(Boolean)
        .map((pair) => {
          if (!pair.includes('=')) {
            return decodeSafeComponent(pair.replace(/\+/g, ' '), 'query parameter name');
          }

          const [rawName, ...rawValueParts] = pair.split('=');
          const rawValue = rawValueParts.join('=');
          const decodedName = decodeQuerySegment(rawName);
          const decodedValue = rawValue ? decodeQuerySegment(rawValue) : '';

          return `${decodedName}=${decodedValue}`;
        })
        .join('&')}`
    : '';

  const fragment = parsedUrl.hash
    ? `#${decodeSafeComponent(parsedUrl.hash.slice(1), 'fragment')}`
    : '';

  return `${parsedUrl.protocol}//${auth}${parsedUrl.host}${pathname}${query}${fragment}`;
}

export function getQueryParameterRows(value: string): QueryParameterRow[] {
  const parsedUrl = parseAbsoluteUrl(value);
  if (!parsedUrl) {
    return [];
  }

  const rows: QueryParameterRow[] = [];

  for (const [name, queryValue] of parsedUrl.searchParams.entries()) {
    rows.push({
      name,
      value: queryValue,
      encodedName: encodeURIComponent(name),
      encodedValue: encodeURIComponent(queryValue),
    });
  }

  return rows;
}
