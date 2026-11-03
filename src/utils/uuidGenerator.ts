export type UuidVersion = 4 | 7;

export interface UuidValidationResult {
  valid: boolean;
  normalized: string | null;
  version: number | null;
  variant: string | null;
  timestamp: number | null;
  error: string | null;
}

const MAX_UUID_TIMESTAMP = (1n << 48n) - 1n;
const UUID_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})$/i;

function getSecureRandomBytes(length: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random generation is unavailable in this browser. Use a secure context and try again.');
  }

  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function formatBytesAsUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateUuidV4(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = getSecureRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatBytesAsUuid(bytes);
}

export function generateUuidV7(): string {
  const bytes = getSecureRandomBytes(16);
  const timestamp = BigInt(Date.now());

  if (timestamp < 0n || timestamp > MAX_UUID_TIMESTAMP) {
    throw new Error('The current time cannot be represented in a UUID v7.');
  }

  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number((timestamp >> BigInt((5 - index) * 8)) & 0xffn);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatBytesAsUuid(bytes);
}

export function generateUuid(version: UuidVersion): string {
  return version === 7 ? generateUuidV7() : generateUuidV4();
}

export function formatUuid(uuid: string, uppercase: boolean, hyphenated: boolean): string {
  const compact = uuid.replaceAll('-', '');
  const formatted = hyphenated
    ? `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`
    : compact;

  return uppercase ? formatted.toUpperCase() : formatted.toLowerCase();
}

export function validateUuid(input: string): UuidValidationResult {
  const trimmed = input.trim();
  const invalid = (error: string, normalized: string | null = null, version: number | null = null, variant: string | null = null): UuidValidationResult => ({
    valid: false,
    normalized,
    version,
    variant,
    timestamp: null,
    error,
  });

  if (!UUID_PATTERN.test(trimmed)) {
    return invalid('Enter a 32-character compact UUID or a standard hyphenated UUID.');
  }

  const compact = trimmed.replaceAll('-', '').toLowerCase();
  const normalized = `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
  const version = Number.parseInt(compact[12], 16);
  const variantBits = Number.parseInt(compact[16], 16) >> 2;
  const variant = variantBits === 0b10
    ? 'RFC variant'
    : variantBits === 0b00
      ? 'NCS reserved variant'
      : variantBits === 0b11
        ? 'Microsoft reserved variant'
        : 'Future reserved variant';

  if (version < 1 || version > 8) {
    return invalid(`Unsupported UUID version bits (${version}).`, normalized, version, variant);
  }

  if (variantBits !== 0b10) {
    return invalid(`Unsupported UUID variant (${variant}).`, normalized, version, variant);
  }

  const timestamp = version === 7 ? Number.parseInt(compact.slice(0, 12), 16) : null;

  return {
    valid: true,
    normalized,
    version,
    variant,
    timestamp,
    error: null,
  };
}
