import { validateSvgContent } from './imageToBase64';

export type OutputFormat = 'png' | 'jpeg' | 'webp';

export interface OutputFormatInfo {
  value: OutputFormat;
  label: string;
  extension: string;
  mime: string;
  supportsQuality: boolean;
}

export const OUTPUT_FORMATS: OutputFormatInfo[] = [
  { value: 'png', label: 'PNG', extension: 'png', mime: 'image/png', supportsQuality: false },
  { value: 'jpeg', label: 'JPEG', extension: 'jpg', mime: 'image/jpeg', supportsQuality: true },
  { value: 'webp', label: 'WEBP', extension: 'webp', mime: 'image/webp', supportsQuality: true },
];

export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
export const MAX_PIXELS = 80_000_000;
export const MAX_CANVAS_SIDE = 32_767;

export interface DetectedInput {
  mimeType: string;
  formatLabel: string;
  isSvg: boolean;
  isGif: boolean;
  warnings: string[];
  svgWidth: number | null;
  svgHeight: number | null;
}

export interface LoadedImage {
  image: HTMLImageElement;
  width: number;
  height: number;
  release: () => void;
}

export interface ConvertOptions {
  format: OutputFormat;
  quality: number;
  backgroundColor: string;
}

export interface ConversionResult {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

export interface SizeComparison {
  difference: number;
  percent: number;
  isLarger: boolean;
}

export function getOutputFormatInfo(format: OutputFormat): OutputFormatInfo {
  const info = OUTPUT_FORMATS.find((item) => item.value === format);
  if (!info) throw new Error('Unknown output format.');
  return info;
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

export function getSupportedOutputFormats(): OutputFormat[] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return OUTPUT_FORMATS.filter((info) => {
    try {
      return canvas.toDataURL(info.mime).startsWith(`data:${info.mime}`);
    } catch {
      return false;
    }
  }).map((info) => info.value);
}

export function buildOutputFilename(name: string, format: OutputFormat): string {
  const extension = getOutputFormatInfo(format).extension;
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\.(png|jpe?g|webp|gif|bmp|svg|avif|ico)$/i, '');
  return `${cleaned || 'converted-image'}.${extension}`;
}

export function compareSizes(originalBytes: number, convertedBytes: number): SizeComparison {
  const difference = originalBytes - convertedBytes;
  const percent = originalBytes > 0 ? (Math.abs(difference) / originalBytes) * 100 : 0;
  return { difference, percent, isLarger: difference < 0 };
}

function matchesSignature(head: Uint8Array, signature: number[], offset = 0): boolean {
  if (head.length < offset + signature.length) return false;
  for (let index = 0; index < signature.length; index += 1) {
    if (head[offset + index] !== signature[index]) return false;
  }
  return true;
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

export async function detectImageFormat(file: File): Promise<DetectedInput> {
  if (file.size === 0) {
    throw new Error('This file is empty. Choose an image that contains data.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(
      `This image is ${formatBytes(file.size)}. The maximum supported size is ${formatBytes(MAX_SOURCE_BYTES)}.`,
    );
  }

  const head = new Uint8Array(await file.slice(0, 24).arrayBuffer());

  const base = {
    isSvg: false,
    svgWidth: null as number | null,
    svgHeight: null as number | null,
    warnings: [] as string[],
  };

  if (matchesSignature(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ...base, mimeType: 'image/png', formatLabel: 'PNG', isGif: false };
  }
  if (matchesSignature(head, [0xff, 0xd8, 0xff])) {
    return { ...base, mimeType: 'image/jpeg', formatLabel: 'JPEG', isGif: false };
  }
  if (matchesSignature(head, [0x47, 0x49, 0x46, 0x38])) {
    return { ...base, mimeType: 'image/gif', formatLabel: 'GIF', isGif: true };
  }
  if (matchesSignature(head, [0x42, 0x4d])) {
    return { ...base, mimeType: 'image/bmp', formatLabel: 'BMP', isGif: false };
  }
  if (matchesSignature(head, [0x52, 0x49, 0x46, 0x46]) && matchesSignature(head, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { ...base, mimeType: 'image/webp', formatLabel: 'WEBP', isGif: false };
  }

  const textual = file.type === 'image/svg+xml' || /^image\//.test(file.type) === false || file.type === 'text/plain';
  if (textual || file.size <= 5 * 1024 * 1024) {
    const text = await file.text();
    if (/<svg[\s>]/i.test(text)) {
      const validation = validateSvgContent(text);
      const dimensions = parseSvgDimensions(text);
      return {
        mimeType: 'image/svg+xml',
        formatLabel: 'SVG',
        isSvg: true,
        isGif: false,
        warnings: [
          ...validation.warnings,
          'This SVG is rasterized onto a canvas when converted, so it becomes a flat image in the output format.',
        ],
        svgWidth: dimensions?.width ?? null,
        svgHeight: dimensions?.height ?? null,
      };
    }
  }

  throw new Error(
    'This file does not appear to be a supported image. Choose a PNG, JPG, JPEG, WEBP, GIF, BMP or SVG file.',
  );
}

export function loadImageSource(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      resolve({
        image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        release: () => URL.revokeObjectURL(url),
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          'This image could not be decoded. It may be corrupted or in a format your browser cannot read.',
        ),
      );
    };

    image.src = url;
  });
}

export async function readImageDimensions(
  file: File,
  input: DetectedInput,
): Promise<{ width: number; height: number }> {
  const loaded = await loadImageSource(file);
  try {
    const width = loaded.width || input.svgWidth || 0;
    const height = loaded.height || input.svgHeight || 0;
    if (!width || !height) {
      throw new Error('The image dimensions could not be determined. Try another image.');
    }
    return { width, height };
  } finally {
    loaded.release();
  }
}

export async function convertImage(
  file: File,
  input: DetectedInput,
  options: ConvertOptions,
): Promise<ConversionResult> {
  const info = getOutputFormatInfo(options.format);
  const loaded = await loadImageSource(file);

  try {
    const width = Math.round(loaded.width || input.svgWidth || 0);
    const height = Math.round(loaded.height || input.svgHeight || 0);

    if (!width || !height) {
      throw new Error('The image dimensions could not be determined. Try another image.');
    }
    if (width > MAX_CANVAS_SIDE || height > MAX_CANVAS_SIDE) {
      throw new Error(
        `This image is ${width.toLocaleString()} × ${height.toLocaleString()} px, which exceeds the browser canvas limit. Try a smaller image.`,
      );
    }
    if (width * height > MAX_PIXELS) {
      throw new Error(
        'This image has too many pixels for safe browser processing. Try a smaller image.',
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas processing is unavailable in this browser.');
    }

    if (options.format === 'jpeg') {
      context.fillStyle = options.backgroundColor || '#ffffff';
      context.fillRect(0, 0, width, height);
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(loaded.image, 0, 0, width, height);

    const quality = info.supportsQuality ? Math.min(1, Math.max(0.01, options.quality / 100)) : undefined;
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, info.mime, quality);
    });

    if (!blob || blob.size === 0) {
      throw new Error('The browser could not encode this image. Try a different output format.');
    }
    if (blob.type !== info.mime) {
      throw new Error(
        `${info.label} export is not supported by this browser. Choose another output format.`,
      );
    }

    return { blob, width, height, mimeType: blob.type };
  } finally {
    loaded.release();
  }
}
