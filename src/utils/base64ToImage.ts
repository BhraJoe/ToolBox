import { BASE64_WARNING_THRESHOLD, encodeBytesToBase64, formatBytes } from './imageToBase64';

export type SupportedImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'svg';

interface FormatDefinition {
  label: string;
  mimeType: string;
  extension: string;
}

export const IMAGE_FORMATS: Record<SupportedImageFormat, FormatDefinition> = {
  png: { label: 'PNG', mimeType: 'image/png', extension: 'png' },
  jpeg: { label: 'JPEG', mimeType: 'image/jpeg', extension: 'jpg' },
  webp: { label: 'WEBP', mimeType: 'image/webp', extension: 'webp' },
  gif: { label: 'GIF', mimeType: 'image/gif', extension: 'gif' },
  svg: { label: 'SVG', mimeType: 'image/svg+xml', extension: 'svg' },
};

export const FORMAT_OPTIONS: { value: SupportedImageFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WEBP' },
  { value: 'gif', label: 'GIF' },
  { value: 'svg', label: 'SVG' },
];

export const MAX_DECODED_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_BASE64_INPUT_CHARS = Math.ceil(MAX_DECODED_IMAGE_BYTES / 3) * 4 + 4096;
export const SUPPORTED_MIME_LABEL = 'PNG, JPEG, WEBP, GIF or SVG';

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

const MIME_TO_FORMAT: Record<string, SupportedImageFormat> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

const FORMAT_LABELS: Record<SupportedImageFormat, string> = {
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WEBP',
  gif: 'GIF',
  svg: 'SVG',
};

export interface ParsedBase64Input {
  base64: string;
  mimeType: string | null;
  isDataUrl: boolean;
  usedUrlSafe: boolean;
}

export interface DecodedImageResult {
  format: SupportedImageFormat;
  formatLabel: string;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  sizeBytes: number;
  base64: string;
  previewUrl: string;
  downloadBlob: Blob;
  warnings: string[];
  usedUrlSafe: boolean;
  fromDataUrl: boolean;
}

interface SniffedFormat {
  format: SupportedImageFormat | null;
  label: string | null;
}

function normalizeMimeType(mime: string): string | null {
  const lower = mime.trim().toLowerCase();
  const normalized = MIME_ALIASES[lower] ?? lower;
  return MIME_TO_FORMAT[normalized] ? normalized : null;
}

function formatFromMimeType(mime: string): SupportedImageFormat {
  return MIME_TO_FORMAT[mime];
}

function stripWhitespace(value: string): string {
  return value.replace(/\s+/g, '');
}

export function parseBase64Input(raw: string): ParsedBase64Input {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Paste a Base64 string or Data URL first.');
  }

  let payload = trimmed;
  let mimeType: string | null = null;
  let isDataUrl = false;

  if (/^data:/i.test(trimmed)) {
    isDataUrl = true;
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('This Data URL is missing the comma that separates its header from the encoded image data.');
    }

    const header = trimmed.slice(5, commaIndex).trim();
    payload = trimmed.slice(commaIndex + 1);

    const headerParts = header
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const declaresBase64 = headerParts.some((part) => part.toLowerCase() === 'base64');

    if (!declaresBase64) {
      throw new Error('Only Base64-encoded Data URLs are supported. The header must include ";base64".');
    }

    const declaredMime = (headerParts.find((part) => part.includes('/')) ?? '').toLowerCase();
    if (declaredMime && declaredMime !== 'text/plain' && declaredMime !== 'application/octet-stream') {
      const normalized = normalizeMimeType(declaredMime);
      if (!normalized) {
        throw new Error(
          `Unsupported MIME type "${declaredMime}" in the Data URL. Supported types are ${SUPPORTED_MIME_LABEL}.`,
        );
      }
      mimeType = normalized;
    }
  }

  const compact = stripWhitespace(payload);
  if (!compact) {
    throw new Error('The input does not contain any encoded image data after removing whitespace.');
  }
  if (compact.length > MAX_BASE64_INPUT_CHARS) {
    throw new Error(
      `This input is ${formatBytes(compact.length)} of Base64 text. The limit is about ${formatBytes(MAX_DECODED_IMAGE_BYTES)} of decoded image data so the browser does not run out of memory.`,
    );
  }

  let normalizedPayload = compact;
  let usedUrlSafe = false;
  if (/[-_]/.test(compact)) {
    normalizedPayload = compact.replace(/-/g, '+').replace(/_/g, '/');
    usedUrlSafe = true;
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalizedPayload)) {
    throw new Error(
      'The encoded data contains characters that are not valid Base64. Remove stray symbols, quotes or labels and try again.',
    );
  }

  const paddingMatch = normalizedPayload.match(/=+$/);
  const paddingLength = paddingMatch?.[0].length ?? 0;
  const dataLength = normalizedPayload.length - paddingLength;

  if (dataLength === 0) {
    throw new Error('The input contains padding only and no actual image data.');
  }

  if (paddingLength > 0) {
    const expectedPadding = dataLength % 4 === 2 ? 2 : dataLength % 4 === 3 ? 1 : 0;
    if (normalizedPayload.length % 4 !== 0 || paddingLength !== expectedPadding) {
      throw new Error(
        'The Base64 padding is incorrect. Padding must sit at the end, use at most two "=" characters, and match the encoded length.',
      );
    }
  } else if (dataLength % 4 === 1) {
    throw new Error('The Base64 length is invalid. One or more characters appear to be missing.');
  }

  const padded = paddingLength > 0
    ? normalizedPayload
    : `${normalizedPayload}${'='.repeat((4 - (dataLength % 4)) % 4)}`;

  return { base64: padded, mimeType, isDataUrl, usedUrlSafe };
}

export function decodeBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error('The Base64 data could not be decoded. Check that it is complete and uses standard Base64 characters.');
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  if (encodeBytesToBase64(bytes) !== base64) {
    throw new Error('The Base64 data has invalid padding bits. Re-encode the image or check that it was copied fully.');
  }

  return bytes;
}

function matchesAscii(bytes: Uint8Array, text: string, offset = 0): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const prefix = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 1024));
  const trimmed = prefix.replace(/^\uFEFF/, '').trimStart();
  return trimmed.startsWith('<') && /<svg[\s>]/i.test(prefix);
}

export function sniffImageFormat(bytes: Uint8Array): SniffedFormat {
  if (bytes.length === 0) {
    return { format: null, label: null };
  }

  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && matchesAscii(bytes, 'PNG', 1)
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return { format: 'png', label: 'PNG' };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { format: 'jpeg', label: 'JPEG' };
  }

  if (bytes.length >= 6 && (matchesAscii(bytes, 'GIF87a') || matchesAscii(bytes, 'GIF89a'))) {
    return { format: 'gif', label: 'GIF' };
  }

  if (bytes.length >= 12 && matchesAscii(bytes, 'RIFF') && matchesAscii(bytes, 'WEBP', 8)) {
    return { format: 'webp', label: 'WEBP' };
  }

  if (looksLikeSvg(bytes)) {
    return { format: 'svg', label: 'SVG' };
  }

  if (bytes.length >= 2 && matchesAscii(bytes, 'BM')) {
    return { format: null, label: 'BMP' };
  }

  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return { format: null, label: 'ICO' };
  }

  if (bytes.length >= 12 && matchesAscii(bytes, 'ftyp', 4)) {
    const brand = String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0).toLowerCase();
    if (brand === 'avif' || brand === 'avis') {
      return { format: null, label: 'AVIF' };
    }
  }

  return { format: null, label: null };
}

function resolveFormat(
  sniffed: SniffedFormat,
  declaredMime: string | null,
  selectedFormat: SupportedImageFormat,
): SupportedImageFormat {
  if (declaredMime) {
    const expected = formatFromMimeType(declaredMime);
    if (sniffed.format === expected) return expected;

    if (!sniffed.format && sniffed.label) {
      throw new Error(
        `The Data URL says this is ${FORMAT_LABELS[expected]}, but the decoded content looks like ${sniffed.label}. ${sniffed.label} is not supported here.`,
      );
    }
    if (sniffed.format) {
      throw new Error(
        `The Data URL declares ${FORMAT_LABELS[expected]}, but the decoded content is actually ${FORMAT_LABELS[sniffed.format]}. Fix the MIME type or use the matching Data URL.`,
      );
    }
    throw new Error(
      `The decoded content is not a valid ${FORMAT_LABELS[expected]} image. It may be corrupted, truncated or a different file type.`,
    );
  }

  if (!sniffed.format && sniffed.label) {
    throw new Error(
      `The decoded content looks like a ${sniffed.label} image, which is not supported here. Use ${SUPPORTED_MIME_LABEL}.`,
    );
  }
  if (!sniffed.format) {
    throw new Error(
      `The decoded content does not look like a valid ${FORMAT_LABELS[selectedFormat]} image. Check that the format selector matches the encoded data.`,
    );
  }
  if (sniffed.format !== selectedFormat) {
    throw new Error(
      `The decoded content looks like a ${FORMAT_LABELS[sniffed.format]} image, but ${FORMAT_LABELS[selectedFormat]} is selected. Choose ${FORMAT_LABELS[sniffed.format]} and decode again.`,
    );
  }

  return selectedFormat;
}

export interface SvgSanitizeResult {
  text: string;
  warnings: string[];
}

function isExternalReference(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith('#')) return false;
  if (trimmed.startsWith('data:image/')) return false;
  if (/^[a-z][a-z0-9+.-]*:/.test(trimmed)) return true;
  if (trimmed.startsWith('//')) return true;
  return !trimmed.startsWith('data:');
}

function hasExternalCssReference(css: string): boolean {
  if (/@import/i.test(css)) return true;
  const urlPattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  let match = urlPattern.exec(css);
  while (match) {
    const reference = match[2] ?? '';
    if (reference.trim().startsWith('#') || reference.trim().toLowerCase().startsWith('data:')) {
      match = urlPattern.exec(css);
      continue;
    }
    return true;
  }
  return false;
}

export function sanitizeSvg(text: string): SvgSanitizeResult {
  if (!text.trim()) {
    throw new Error('The SVG data is empty.');
  }

  const document = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (document.querySelector('parsererror')) {
    throw new Error('The decoded SVG is not valid XML. Check that the original SVG was copied completely.');
  }

  const root = document.documentElement;
  if (!root || root.localName.toLowerCase() !== 'svg') {
    throw new Error('The decoded content does not contain a valid <svg> root element.');
  }

  const warnings: string[] = [];
  let removedHandlers = 0;
  let removedExternal = 0;

  const blockedElements = Array.from(document.querySelectorAll('script, iframe, object, embed, foreignObject'));
  if (blockedElements.some((element) => element.localName.toLowerCase() === 'script')) {
    throw new Error(
      'This SVG contains a <script> element. For safety, Base64 SVG input with embedded scripts is rejected.',
    );
  }
  for (const element of blockedElements) {
    element.remove();
  }
  if (blockedElements.length > 0) {
    warnings.push('Unsafe SVG elements were removed before previewing the image.');
  }

  for (const element of Array.from(document.getElementsByTagName('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();

      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        removedHandlers += 1;
        continue;
      }

      if (name === 'href' || name === 'xlink:href' || name === 'src') {
        const value = attribute.value.trim().toLowerCase();
        if (value.startsWith('javascript:') || value.startsWith('vbscript:') || value.startsWith('data:text/html')) {
          throw new Error('This SVG contains an executable link. For safety, that SVG input is rejected.');
        }
        if (isExternalReference(attribute.value)) {
          element.removeAttribute(attribute.name);
          removedExternal += 1;
        }
        continue;
      }

      if (name === 'style' && hasExternalCssReference(attribute.value)) {
        element.removeAttribute(attribute.name);
        removedExternal += 1;
      }
    }
  }

  for (const style of Array.from(document.querySelectorAll('style'))) {
    if (hasExternalCssReference(style.textContent ?? '')) {
      style.remove();
      removedExternal += 1;
    }
  }

  if (removedHandlers > 0) {
    warnings.push('Inline event handlers were removed from the SVG before previewing it.');
  }
  if (removedExternal > 0) {
    warnings.push('External resource references were removed from the SVG. Nothing external is loaded or executed.');
  }

  return { text: new XMLSerializer().serializeToString(document), warnings };
}

function parseSvgDimensions(text: string): { width: number; height: number } | null {
  const document = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = document.documentElement;
  if (!root) return null;

  const parseLength = (value: string | null): number | null => {
    if (!value || value.trim().endsWith('%')) return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  };

  const width = parseLength(root.getAttribute('width'));
  const height = parseLength(root.getAttribute('height'));
  if (width && height) return { width, height };

  const viewBox = root.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
    }
  }

  return null;
}

function measureImage(
  objectUrl: string,
  fallback: { width: number; height: number } | null,
  formatLabel: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (width && height) {
        resolve({ width, height });
        return;
      }
      if (fallback) {
        resolve(fallback);
        return;
      }
      reject(new Error('The image loaded, but its dimensions could not be determined.'));
    };

    image.onerror = () => {
      reject(new Error(
        `The decoded data starts like a ${formatLabel} image, but the browser could not render it. It may be corrupted or truncated.`,
      ));
    };

    image.src = objectUrl;
  });
}

export async function decodeBase64Image(
  rawInput: string,
  selectedFormat: SupportedImageFormat,
): Promise<DecodedImageResult> {
  const parsed = parseBase64Input(rawInput);
  const bytes = decodeBase64ToBytes(parsed.base64);

  if (bytes.length === 0) {
    throw new Error('The decoded image is empty. Check that the Base64 data is complete.');
  }
  if (bytes.length > MAX_DECODED_IMAGE_BYTES) {
    throw new Error(
      `The decoded image is ${formatBytes(bytes.length)}, which exceeds the ${formatBytes(MAX_DECODED_IMAGE_BYTES)} browser memory limit for this tool.`,
    );
  }

  const sniffed = sniffImageFormat(bytes);
  const format = resolveFormat(sniffed, parsed.mimeType, selectedFormat);
  const definition = IMAGE_FORMATS[format];

  const warnings: string[] = [];
  if (parsed.usedUrlSafe) {
    warnings.push('URL-safe Base64 characters ("-" and "_") were converted to standard Base64.');
  }
  if (parsed.isDataUrl && !parsed.mimeType) {
    warnings.push('The Data URL did not include a usable image MIME type, so the selected format was used.');
  }

  let previewBlob: Blob;
  let svgFallback: { width: number; height: number } | null = null;

  if (format === 'svg') {
    let svgText: string;
    try {
      svgText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('The decoded SVG is not valid UTF-8 text. Re-create the Data URL from the original SVG file.');
    }

    const sanitized = sanitizeSvg(svgText);
    warnings.push(...sanitized.warnings);
    previewBlob = new Blob([sanitized.text], { type: definition.mimeType });
    svgFallback = parseSvgDimensions(sanitized.text);
  } else {
    previewBlob = new Blob([bytes], { type: definition.mimeType });
  }

  if (bytes.length > BASE64_WARNING_THRESHOLD) {
    warnings.push(
      `This image is ${formatBytes(bytes.length)}. Decoding, previewing or copying very large images can be slow in some browsers.`,
    );
  }

  const previewUrl = URL.createObjectURL(previewBlob);
  let dimensions: { width: number; height: number };
  try {
    dimensions = await measureImage(previewUrl, svgFallback, definition.label);
    if (format === 'svg' && svgFallback) {
      dimensions = svgFallback;
    }
  } catch (caught) {
    URL.revokeObjectURL(previewUrl);
    throw caught;
  }

  return {
    format,
    formatLabel: definition.label,
    mimeType: definition.mimeType,
    extension: definition.extension,
    width: dimensions.width,
    height: dimensions.height,
    sizeBytes: bytes.length,
    base64: parsed.base64,
    previewUrl,
    downloadBlob: new Blob([bytes], { type: definition.mimeType }),
    warnings,
    usedUrlSafe: parsed.usedUrlSafe,
    fromDataUrl: parsed.isDataUrl,
  };
}

export function buildDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

export function normalizeDownloadFilename(value: string, extension: string): string {
  const fallback = `decoded-image.${extension}`;
  const cleaned = Array.from(
    value.trim().replace(/[<>:"/\\|?*]/g, '-'),
    (character) => (character.charCodeAt(0) < 32 ? '-' : character),
  )
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '');

  if (!cleaned) return fallback;

  const suffix = `.${extension}`;
  if (cleaned.toLowerCase().endsWith(suffix)) return cleaned;

  const withoutImageExtension = cleaned.replace(/\.(png|jpe?g|webp|gif|svg|bmp|avif|ico)$/i, '');
  return `${withoutImageExtension || 'decoded-image'}${suffix}`;
}

export function downloadBlobFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
