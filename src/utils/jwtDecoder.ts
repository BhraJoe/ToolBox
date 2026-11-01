export type JwtPart = 'header' | 'payload' | 'signature';

export interface JwtClaims {
  iss?: unknown;
  sub?: unknown;
  aud?: unknown;
  exp?: unknown;
  nbf?: unknown;
  iat?: unknown;
  jti?: unknown;
  [key: string]: unknown;
}

export interface JwtDecoded {
  header: Record<string, unknown>;
  payload: JwtClaims;
  signature: string;
  rawHeader: string;
  rawPayload: string;
  rawSignature: string;
  headerJson: string;
  payloadJson: string;
}

export type JwtDecodeResult =
  | { success: true; data: JwtDecoded }
  | { success: false; error: string };

export type ClaimStatus = {
  status: 'expired' | 'not-expired' | 'no-expiration' | 'not-active' | 'cannot-determine';
  text: string;
  badge: 'success' | 'danger' | 'secondary' | 'warning';
  details?: string;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeBase64Url(input: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) {
    throw new Error('Invalid Base64URL characters.');
  }
  if (input.length % 4 === 1) {
    throw new Error('Invalid Base64URL encoding.');
  }

  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytesToBase64Url(bytes) !== input) {
    throw new Error('Invalid Base64URL encoding.');
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(value: string, section: 'header' | 'payload'): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`The decoded ${section} is not valid JSON.`);
  }

  if (!isJsonObject(parsed)) {
    throw new Error(`The decoded ${section} must be a JSON object.`);
  }
  return parsed;
}

export function decodeJwt(token: string): JwtDecodeResult {
  const trimmed = token.trim();
  if (!trimmed) {
    return { success: false, error: 'Enter a JWT to decode.' };
  }

  const parts = trimmed.split('.');
  if (parts.length === 5) {
    return {
      success: false,
      error: 'This appears to be an encrypted JWT (JWE). This tool only decodes compact signed JWTs (JWS).',
    };
  }
  if (parts.length !== 3) {
    return {
      success: false,
      error: `Invalid JWT structure. A compact signed JWT must have exactly three sections; found ${parts.length}.`,
    };
  }

  const [rawHeader, rawPayload, rawSignature] = parts;
  if (!rawHeader) {
    return { success: false, error: 'The header section is empty.' };
  }
  if (!rawPayload) {
    return { success: false, error: 'The payload section is empty.' };
  }

  for (const [section, value] of [
    ['header', rawHeader],
    ['payload', rawPayload],
    ['signature', rawSignature],
  ] as const) {
    if (value && !/^[A-Za-z0-9_-]+$/.test(value)) {
      return {
        success: false,
        error: `The ${section} section contains invalid Base64URL characters.`,
      };
    }
    if (value && value.length % 4 === 1) {
      return { success: false, error: `The ${section} section has invalid Base64URL encoding.` };
    }
  }

  let headerText: string;
  let payloadText: string;
  try {
    headerText = decodeBase64Url(rawHeader);
  } catch {
    return { success: false, error: 'Unable to decode the JWT header. Check its Base64URL encoding and UTF-8 data.' };
  }
  try {
    payloadText = decodeBase64Url(rawPayload);
  } catch {
    return { success: false, error: 'Unable to decode the JWT payload. Check its Base64URL encoding and UTF-8 data.' };
  }

  let header: Record<string, unknown>;
  let payload: JwtClaims;
  try {
    header = parseJsonObject(headerText, 'header');
    payload = parseJsonObject(payloadText, 'payload');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to parse the JWT header or payload.',
    };
  }

  if (!rawSignature && header.alg !== 'none') {
    return {
      success: false,
      error: 'The signature section is empty. Empty signatures are only supported when the header declares alg "none".',
    };
  }

  return {
    success: true,
    data: {
      header,
      payload,
      signature: rawSignature,
      rawHeader,
      rawPayload,
      rawSignature,
      headerJson: JSON.stringify(header, null, 2),
      payloadJson: JSON.stringify(payload, null, 2),
    },
  };
}

function isValidNumericDate(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isFinite(value * 1000)
    && Math.abs(value * 1000) <= 8.64e15;
}

export function formatUnixTimestamp(seconds: unknown): string {
  if (!isValidNumericDate(seconds)) {
    return 'Invalid timestamp';
  }
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? 'Invalid timestamp' : date.toLocaleString();
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(Math.abs(seconds) / 60);
  if (totalMinutes < 1) {
    return 'less than a minute';
  }
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function getExpirationStatus(exp: unknown, now = Date.now()): ClaimStatus {
  if (typeof exp === 'undefined') {
    return { status: 'no-expiration', text: 'No expiration claim', badge: 'secondary' };
  }
  if (!isValidNumericDate(exp)) {
    return { status: 'cannot-determine', text: 'Cannot determine', badge: 'warning' };
  }

  const difference = exp - now / 1000;
  if (difference <= 0) {
    return {
      status: 'expired',
      text: 'Expired',
      badge: 'danger',
      details: `Expired ${formatDuration(difference)} ago`,
    };
  }
  return {
    status: 'not-expired',
    text: 'Not expired',
    badge: 'success',
    details: `Expires in ${formatDuration(difference)}`,
  };
}

export function getNotBeforeStatus(nbf: unknown, now = Date.now()): {
  status: 'active' | 'not-active' | 'no-nbf' | 'cannot-determine';
  text: string;
  badge: 'success' | 'warning' | 'secondary';
  details?: string;
} {
  if (typeof nbf === 'undefined') {
    return { status: 'no-nbf', text: 'No nbf claim', badge: 'secondary' };
  }
  if (!isValidNumericDate(nbf)) {
    return { status: 'cannot-determine', text: 'Cannot determine', badge: 'warning' };
  }

  const difference = nbf - now / 1000;
  if (difference > 0) {
    return {
      status: 'not-active',
      text: 'Not active yet',
      badge: 'warning',
      details: `Declared active in ${formatDuration(difference)}`,
    };
  }
  return { status: 'active', text: 'Not-before time is in the past', badge: 'success' };
}

export function getTokenStatus(
  exp: unknown,
  nbf: unknown,
  now = Date.now(),
): ClaimStatus {
  const expiration = getExpirationStatus(exp, now);
  const notBefore = getNotBeforeStatus(nbf, now);

  if (expiration.status === 'expired') return expiration;
  if (notBefore.status === 'not-active') {
    return {
      status: 'not-active',
      text: notBefore.text,
      badge: notBefore.badge,
      details: notBefore.details,
    };
  }
  if (expiration.status === 'cannot-determine' || notBefore.status === 'cannot-determine') {
    return { status: 'cannot-determine', text: 'Cannot determine', badge: 'warning' };
  }
  return expiration;
}
