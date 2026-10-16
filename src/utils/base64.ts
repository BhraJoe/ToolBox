function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

export function encodeBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

export function decodeBase64(text: string): string {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
    throw new Error('Use standard Base64 characters only. Spaces and URL-safe characters are not supported.');
  }

  const paddingMatch = text.match(/=+$/);
  const paddingLength = paddingMatch?.[0].length ?? 0;
  const dataLength = text.length - paddingLength;

  if (paddingLength > 0) {
    const expectedPadding = dataLength % 4 === 2 ? 2 : dataLength % 4 === 3 ? 1 : 0;
    if (text.length % 4 !== 0 || paddingLength !== expectedPadding) {
      throw new Error('The Base64 padding is malformed.');
    }
  } else if (dataLength % 4 === 1) {
    throw new Error('The Base64 length is malformed.');
  }

  const paddedText = paddingLength > 0
    ? text
    : `${text}${'='.repeat((4 - (dataLength % 4)) % 4)}`;

  let binary: string;
  try {
    binary = atob(paddedText);
  } catch {
    throw new Error('The Base64 input could not be decoded.');
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytesToBase64(bytes) !== paddedText) {
    throw new Error('The Base64 input has malformed padding bits.');
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('The decoded bytes are not valid UTF-8 text.');
  }
}