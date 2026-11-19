export const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024;
export const BASE64_WARNING_THRESHOLD = 5 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
  ico: 'image/x-icon',
};

const SUPPORTED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

export const SUPPORTED_FORMAT_LABEL = 'PNG, JPG/JPEG, WEBP, GIF, SVG, BMP, AVIF or ICO';

export type CodeOutputFormat = 'html' | 'css' | 'javascript' | 'json' | 'markdown';

export type OutputMode = 'base64' | 'dataurl';

export interface ImageBase64Result {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  base64: string;
  dataUrl: string;
  encodedBytes: number;
  overheadBytes: number;
  warnings: string[];
}

function getFileExtension(filename: string): string {
  const match = /\.([^.]+)$/.exec(filename.trim());
  return match ? match[1].toLowerCase() : '';
}

export function resolveMimeType(file: File): string | null {
  const declared = MIME_ALIASES[file.type.toLowerCase()] ?? file.type.toLowerCase();
  if (SUPPORTED_MIME_TYPES.has(declared)) return declared;

  const inferred = MIME_BY_EXTENSION[getFileExtension(file.name)];
  return inferred ?? null;
}

export function validateImageFile(file: File): string {
  if (file.size === 0) {
    throw new Error('This file is empty. Choose an image file that contains data.');
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error(
      `This image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_IMAGE_FILE_BYTES)} because Base64 encoding adds about 33% to the file size and must be held in browser memory.`,
    );
  }

  const mimeType = resolveMimeType(file);
  if (!mimeType) {
    throw new Error(`Unsupported file type${file.type ? ` "${file.type}"` : ''}. Supported formats: ${SUPPORTED_FORMAT_LABEL}.`);
  }

  return mimeType;
}

export function readFileAsArrayBuffer(file: File, reader: FileReader): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result;
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error('The browser returned unexpected file data. Try choosing the file again.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => {
      reject(new Error('The file could not be read. It may be corrupted, locked by another app, or inaccessible.'));
    };
    reader.onabort = () => {
      reject(new Error('Reading the image was cancelled.'));
    };
    reader.readAsArrayBuffer(file);
  });
}

export function encodeBytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000 * 3;
  const chunks: string[] = [];

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    let binary = '';
    for (let index = 0; index < chunk.length; index += 0x8000) {
      binary += String.fromCharCode(...chunk.subarray(index, Math.min(index + 0x8000, chunk.length)));
    }
    chunks.push(btoa(binary));
  }

  return chunks.join('');
}

export function expectedBase64Length(byteLength: number): number {
  return Math.ceil(byteLength / 3) * 4;
}

interface SvgValidation {
  warnings: string[];
}

export function validateSvgContent(text: string): SvgValidation {
  if (!text.trim()) {
    throw new Error('The SVG file is empty.');
  }

  const document = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (document.querySelector('parsererror')) {
    throw new Error('The SVG file is not valid XML. Check that it is a well-formed SVG image.');
  }

  const root = document.documentElement;
  if (!root || root.localName.toLowerCase() !== 'svg') {
    throw new Error('The file does not contain a valid <svg> root element.');
  }

  const warnings: string[] = [];
  const elements = Array.from(document.getElementsByTagName('*'));
  let hasExternalReference = false;

  for (const element of elements) {
    const tag = element.localName.toLowerCase();
    if (tag === 'script') {
      throw new Error('This SVG contains a <script> element. Upload an SVG without embedded scripts.');
    }
    if (tag === 'foreignobject') {
      warnings.push('This SVG contains a <foreignObject> element. It is previewed as a static image only.');
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on')) {
        throw new Error('This SVG contains inline event handlers. Upload an SVG without embedded scripts.');
      }

      const value = attribute.value.trim().toLowerCase();
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('javascript:')) {
        throw new Error('This SVG contains a javascript: link. Uploaded SVG files must not include executable links.');
      }
      if ((name === 'href' || name === 'xlink:href') && /^(https?:)?\/\//.test(value)) {
        hasExternalReference = true;
      }
    }
  }

  if (hasExternalReference) {
    warnings.push('This SVG references external resources. They are not loaded or executed in the local preview.');
  }

  return { warnings };
}

function parseSvgFallbackDimensions(text: string): { width: number; height: number } | null {
  const document = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = document.documentElement;
  if (!root) return null;

  const parseLength = (value: string | null): number | null => {
    if (!value || value.trim().endsWith('%')) return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  };

  const viewBox = root.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
    }
  }

  const width = parseLength(root.getAttribute('width'));
  const height = parseLength(root.getAttribute('height'));
  if (width && height) return { width, height };

  return null;
}

function loadImageDimensions(
  objectUrl: string,
  svgText: string | null,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      let width = image.naturalWidth || image.width;
      let height = image.naturalHeight || image.height;

      if ((!width || !height) && svgText) {
        const fallback = parseSvgFallbackDimensions(svgText);
        if (fallback) {
          width = fallback.width;
          height = fallback.height;
        }
      }

      if (!width || !height) {
        reject(new Error('The image loaded, but its dimensions could not be determined. Try another image file.'));
        return;
      }

      resolve({ width, height });
    };

    image.onerror = () => {
      reject(new Error('This image could not be decoded. It may be corrupted or in a format your browser cannot read.'));
    };

    image.src = objectUrl;
  });
}

export async function convertImageFile(file: File, reader: FileReader): Promise<ImageBase64Result> {
  const mimeType = validateImageFile(file);
  const buffer = await readFileAsArrayBuffer(file, reader);
  const bytes = new Uint8Array(buffer);

  if (bytes.length === 0) {
    throw new Error('This file is empty. Choose an image file that contains data.');
  }

  const base64 = encodeBytesToBase64(bytes);
  if (base64.length !== expectedBase64Length(bytes.length)) {
    throw new Error('The Base64 encoding could not be completed correctly. Try choosing the file again.');
  }

  let svgText: string | null = null;
  const warnings: string[] = [];

  if (mimeType === 'image/svg+xml') {
    svgText = new TextDecoder('utf-8').decode(bytes);
    const validation = validateSvgContent(svgText);
    warnings.push(...validation.warnings);
  }

  const objectUrl = URL.createObjectURL(file);
  let dimensions: { width: number; height: number };
  try {
    dimensions = await loadImageDimensions(objectUrl, svgText);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const encodedBytes = base64.length;
  if (encodedBytes > BASE64_WARNING_THRESHOLD) {
    warnings.push(
      `The encoded output is ${formatBytes(encodedBytes)}. Very large strings can be slow to copy, download or paste into editors.`,
    );
  }

  return {
    filename: file.name,
    mimeType,
    sizeBytes: file.size,
    width: dimensions.width,
    height: dimensions.height,
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
    encodedBytes,
    overheadBytes: encodedBytes - file.size,
    warnings,
  };
}

export function generateCodeOutput(format: CodeOutputFormat, result: ImageBase64Result): string {
  switch (format) {
    case 'html':
      return `<img src="${result.dataUrl}" alt="${escapeHtml(result.filename)}" />`;
    case 'css':
      return `background-image: url("${result.dataUrl}");`;
    case 'javascript':
      return `const imageBase64 = "${result.dataUrl}";`;
    case 'json':
      return JSON.stringify(
        {
          filename: result.filename,
          mimeType: result.mimeType,
          base64: result.base64,
          dataUrl: result.dataUrl,
        },
        null,
        2,
      );
    case 'markdown':
      return `![${escapeMarkdown(result.filename)}](${result.dataUrl})`;
    default:
      return result.base64;
  }
}

export function buildMetadataJson(result: ImageBase64Result): string {
  return JSON.stringify(
    {
      filename: result.filename,
      mimeType: result.mimeType,
      width: result.width,
      height: result.height,
      fileSizeBytes: result.sizeBytes,
      encodedSizeBytes: result.encodedBytes,
      base64: result.base64,
      dataUrl: result.dataUrl,
    },
    null,
    2,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeMarkdown(value: string): string {
  return value.replace(/([[\]\\])/g, '\\$1');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function calculateOverheadPercent(result: ImageBase64Result): number {
  if (result.sizeBytes === 0) return 0;
  return (result.overheadBytes / result.sizeBytes) * 100;
}

export async function copyTextToClipboard(text: string): Promise<'clipboard' | 'fallback'> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    } catch {
      // Fall through to the legacy approach when permission or availability fails.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    if (!copied) {
      throw new Error('The browser blocked clipboard access. Select the output manually and press Ctrl+C.');
    }
    return 'fallback';
  } finally {
    textarea.remove();
  }
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
