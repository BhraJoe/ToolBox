import { parse, gps } from 'exifr';

export type ImageFormat = 'PNG' | 'JPEG' | 'WEBP' | 'GIF' | 'BMP' | 'SVG';

export interface ImageMetadata {
  fileName: string;
  fileFormat: ImageFormat;
  mimeType: string;
  fileSize: number;
  fileSizeDisplay: string;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  colorDepth: number | null;
  lastModified: Date | null;
  hasTransparency: boolean | null;
  hasAnimation: boolean | null;
  orientation: number | null;
  colorModel: string | null;
  alphaChannel: boolean | null;
}

export interface ExifMetadata {
  manufacturer?: string;
  model?: string;
  lens?: string;
  software?: string;
  firmware?: string;
  dateTime?: string;
  exposureTime?: string;
  aperture?: string;
  iso?: string;
  focalLength?: string;
  flash?: string;
  whiteBalance?: string;
  exposureMode?: string;
  meteringMode?: string;
  orientation?: number;
  resolution?: string;
  colorSpace?: string;
  compression?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
}

export interface ColorSample {
  hex: string;
  rgb: string;
}

export interface ColorInfo {
  averageColor: ColorSample;
  dominantColors: ColorSample[];
  transparency: boolean;
}

export interface DetectedFile {
  file: File;
  format: ImageFormat;
  mimeType: string;
  size: number;
  lastModified: Date | null;
  width: number | null;
  height: number | null;
  hasTransparency: boolean | null;
  hasAnimation: boolean | null;
}

const FORMAT_MIME: Record<ImageFormat, string> = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
  GIF: 'image/gif',
  BMP: 'image/bmp',
  SVG: 'image/svg+xml',
};

export function formatFileSize(bytes: number): string {
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

function matchesSignature(head: Uint8Array, signature: number[], offset = 0): boolean {
  if (head.length < offset + signature.length) return false;
  for (let index = 0; index < signature.length; index += 1) {
    if (head[offset + index] !== signature[index]) return false;
  }
  return true;
}

export async function detectFormat(file: File): Promise<ImageFormat> {
  const lowerName = file.name.toLowerCase();
  const lowerType = file.type.toLowerCase();

  if (lowerType === 'image/svg+xml' || lowerName.endsWith('.svg')) return 'SVG';

  const head = new Uint8Array(await file.slice(0, 24).arrayBuffer());

  if (head.length >= 8) {
    if (matchesSignature(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'PNG';
    if (matchesSignature(head, [0xff, 0xd8, 0xff])) return 'JPEG';
    if (matchesSignature(head, [0x47, 0x49, 0x46, 0x38])) return 'GIF';
    if (matchesSignature(head, [0x42, 0x4d])) return 'BMP';
    if (matchesSignature(head, [0x52, 0x49, 0x46, 0x46]) && matchesSignature(head, [0x57, 0x45, 0x42, 0x50], 8)) return 'WEBP';
  }

  if (lowerType === 'image/png') return 'PNG';
  if (lowerType === 'image/jpeg') return 'JPEG';
  if (lowerType === 'image/webp') return 'WEBP';
  if (lowerType === 'image/gif') return 'GIF';
  if (lowerType === 'image/bmp') return 'BMP';

  return 'PNG';
}

export function getMimeType(format: ImageFormat): string {
  return FORMAT_MIME[format];
}

function readUInt16BE(array: Uint8Array, offset: number): number {
  return (array[offset] << 8) | array[offset + 1];
}

function readUInt32BE(array: Uint8Array, offset: number): number {
  return ((array[offset] << 24) | (array[offset + 1] << 16) | (array[offset + 2] << 8) | array[offset + 3]) >>> 0;
}

function readInt16LE(array: Uint8Array, offset: number): number {
  const value = (array[offset] | (array[offset + 1] << 8));
  return value >= 0x8000 ? value - 0x10000 : value;
}

function readUInt16LE(array: Uint8Array, offset: number): number {
  return (array[offset] | (array[offset + 1] << 8)) & 0xffff;
}

function containsBytes(array: Uint8Array, offset: number, signature: number[]): boolean {
  if (offset + signature.length > array.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (array[offset + i] !== signature[i]) return false;
  }
  return true;
}

export async function extractImageMetadata(file: File): Promise<ImageMetadata> {
  const format = await detectFormat(file);
  const mimeType = getMimeType(format);
  const arrayBuffer = await file.arrayBuffer();
  const array = new Uint8Array(arrayBuffer);

  let width: number | null = null;
  let height: number | null = null;
  let aspectRatio: number | null = null;
  let colorDepth: number | null = null;
  let hasTransparency: boolean | null = null;
  let hasAnimation: boolean | null = null;
  let orientation: number | null = null;
  let colorModel: string | null = null;
  let alphaChannel: boolean | null = null;

  if (format === 'PNG') {
    if (array.length >= 24 && array[0] === 0x89 && array[1] === 0x50) {
      width = readUInt32BE(array, 16);
      height = readUInt32BE(array, 20);
      if (width && height) aspectRatio = width / height;
    }
    if (array.length >= 26) {
      const bitDepth = array[24];
      const colorType = array[25];
      colorDepth = bitDepth;
      hasTransparency = colorType === 4 || colorType === 6 || containsBytes(array, 8, [0x74, 0x52, 0x4e, 0x53]);
      colorModel = colorType === 0 ? 'Grayscale' : colorType === 2 ? 'RGB' : colorType === 3 ? 'Palette' : colorType === 4 ? 'Grayscale+Alpha' : 'RGBA';
      alphaChannel = colorType === 4 || colorType === 6;
    }
  } else if (format === 'JPEG') {
    for (let i = 2; i < array.length - 5; i++) {
      if (array[i] === 0xff && array[i + 1] === 0xc0) {
        height = readUInt16BE(array, i + 5);
        width = readUInt16BE(array, i + 7);
        if (width && height) aspectRatio = width / height;
        break;
      }
    }
    colorDepth = 24;
    colorModel = 'YCbCr';
    alphaChannel = false;
  } else if (format === 'WEBP') {
    if (array.length >= 30) {
      const vp8Code = String.fromCharCode(array[12], array[13], array[14], array[15]);
      if (vp8Code === 'VP8 ') {
        width = readUInt16LE(array, 26) & 0x3fff;
        height = readUInt16LE(array, 28) & 0x3fff;
      } else if (vp8Code === 'VP8L') {
        const b0 = array[21];
        const b1 = array[22];
        const b2 = array[23];
        const b3 = array[24];
        width = 1 + (((b1 & 0x3f) << 8) | b0);
        height = 1 + ((b3 << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      } else if (vp8Code === 'VP8X') {
        width = 1 + ((array[24] | (array[25] << 8) | (array[26] << 16)) & 0xffffff);
        height = 1 + ((array[27] | (array[28] << 8) | (array[29] << 16)) & 0xffffff);
      }
      if (width && height) aspectRatio = width / height;
    }
    hasTransparency = containsBytes(array, 0, [0x41, 0x4c, 0x50, 0x48]) || array.includes(0x41) && array.includes(0x4c) && array.includes(0x50) && array.includes(0x48);
    hasAnimation = containsBytes(array, 0, [0x41, 0x4e, 0x49, 0x4d]) || array.includes(0x41) && array.includes(0x4e) && array.includes(0x49) && array.includes(0x4d);
  } else if (format === 'GIF') {
    if (array.length >= 13 && matchesSignature(array, [0x47, 0x49, 0x46, 0x38])) {
      width = readUInt16LE(array, 6);
      height = readUInt16LE(array, 8);
      if (width && height) aspectRatio = width / height;
    }
    hasTransparency = array.includes(0xf9) && array.includes(0x21);
    hasAnimation = array.includes(0x21) && array.includes(0xff) && array.includes(0x0b) || array.filter((b) => b === 0x2c).length > 1;
    colorModel = 'Palette';
  } else if (format === 'BMP') {
    if (array.length >= 26 && matchesSignature(array, [0x42, 0x4d])) {
      width = readInt16LE(array, 18);
      height = readInt16LE(array, 22);
      if (width && height) aspectRatio = width / height;
      if (array.length >= 28) {
        const bpp = readUInt16LE(array, 28);
        colorDepth = bpp;
      }
    }
    colorModel = 'RGB';
  } else if (format === 'SVG') {
    colorModel = 'RGB';
  }

  return {
    fileName: file.name,
    fileFormat: format,
    mimeType,
    fileSize: file.size,
    fileSizeDisplay: formatFileSize(file.size),
    width,
    height,
    aspectRatio,
    colorDepth,
    lastModified: file.lastModified ? new Date(file.lastModified) : null,
    hasTransparency,
    hasAnimation,
    orientation,
    colorModel,
    alphaChannel,
  };
}

function gpsToDecimal(degrees: number): number {
  return Math.round(degrees * 100000) / 100000;
}

export async function extractExifMetadata(file: File): Promise<ExifMetadata | null> {
  const format = await detectFormat(file);
  if (format === 'PNG' || format === 'GIF' || format === 'BMP' || format === 'SVG' || format === 'WEBP') {
    return null;
  }

  try {
    const data = await parse(file);

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return null;
    }

    const result: ExifMetadata = {};

    if (data.Make) result.manufacturer = data.Make;
    if (data.Model) result.model = data.Model;
    if (data.LensModel) result.lens = data.LensModel;
    if (data.Software) result.software = data.Software;
    if (data.Firmware) result.firmware = data.Firmware;
    if (data.DateTimeOriginal) result.dateTime = data.DateTimeOriginal;
    if (data.ExposureTime) result.exposureTime = `1/${Math.round(1 / data.ExposureTime)}s`;
    if (data.FNumber) result.aperture = `f/${data.FNumber}`;
    if (data.ISOSpeedRatings) result.iso = String(data.ISOSpeedRatings);
    if (data.FocalLength) result.focalLength = `${data.FocalLength}mm`;
    if (data.Flash !== undefined) result.flash = data.Flash ? 'Fired' : 'Did not fire';
    if (data.WhiteBalance) result.whiteBalance = data.WhiteBalance === 0 ? 'Auto' : 'Manual';
    if (data.ExposureMode !== undefined) result.exposureMode = data.ExposureMode === 0 ? 'Auto' : data.ExposureMode === 1 ? 'Manual' : 'Auto bracket';
    if (data.MeteringMode) result.meteringMode = data.MeteringMode;
    if (data.Orientation) result.orientation = data.Orientation;
    if (data.XResolution && data.YResolution) {
      result.resolution = `${data.XResolution} × ${data.YResolution}`;
    }
    if (data.ColorSpace !== undefined) result.colorSpace = String(data.ColorSpace);
    if (data.Compression) result.compression = data.Compression;

    try {
      const gpsData = await gps(file);
      if (gpsData && gpsData.latitude !== undefined && gpsData.longitude !== undefined) {
        result.gpsLatitude = gpsToDecimal(gpsData.latitude);
        result.gpsLongitude = gpsToDecimal(gpsData.longitude);
      }
    } catch {
      // GPS not available
    }

    if (Object.keys(result).length === 0) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}

export async function extractColorInfo(file: File): Promise<ColorInfo | null> {
  try {
const format = await detectFormat(file);
    if (format === 'SVG') {
      return null;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not load image for color analysis'));
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }

    const maxDim = 100;
    let drawWidth = img.width;
    let drawHeight = img.height;

    if (drawWidth > maxDim) {
      drawHeight = Math.round((drawHeight * maxDim) / drawWidth);
      drawWidth = maxDim;
    }
    if (drawHeight > maxDim) {
      drawWidth = Math.round((drawWidth * maxDim) / drawHeight);
      drawHeight = maxDim;
    }

    canvas.width = drawWidth;
    canvas.height = drawHeight;

    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

    const imageData = ctx.getImageData(0, 0, drawWidth, drawHeight);
    const data = imageData.data;

    let rTotal = 0;
    let gTotal = 0;
    let bTotal = 0;
    let aTotal = 0;
    let pixelCount = 0;
    let hasTransparentPixel = false;

    for (let i = 0; i < data.length; i += 4) {
      rTotal += data[i];
      gTotal += data[i + 1];
      bTotal += data[i + 2];
      aTotal += data[i + 3];
      pixelCount++;

      if (data[i + 3] < 128) {
        hasTransparentPixel = true;
      }
    }

    URL.revokeObjectURL(objectUrl);

    if (pixelCount === 0) return null;

    const avgR = Math.round(rTotal / pixelCount);
    const avgG = Math.round(gTotal / pixelCount);
    const avgB = Math.round(bTotal / pixelCount);
    const avgA = Math.round(aTotal / pixelCount);

    const hex = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;

    const dominantColors: ColorSample[] = [];
    const colorCounts = new Map<string, number>();

    for (let i = 0; i < data.length; i += 4) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const key = `${r},${g},${b}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }

    const sortedColors = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    for (const [colorKey] of sortedColors) {
      const [r, g, b] = colorKey.split(',').map(Number);
      const colorHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      dominantColors.push({
        hex: colorHex,
        rgb: `rgb(${r}, ${g}, ${b})`,
      });
    }

    return {
      averageColor: {
        hex,
        rgb: `rgba(${avgR}, ${avgG}, ${avgB}, ${(avgA / 255).toFixed(2)})`,
      },
      dominantColors,
      transparency: hasTransparentPixel || avgA < 255,
    };
  } catch {
    return null;
  }
}

export function getPrivacyNotice(): string {
  return [
    'Image inspection happens locally in the browser. No images are uploaded to a server.',
    'EXIF metadata may contain personal information, including GPS location data.',
    'GPS metadata can reveal where a photograph was taken. Be cautious when sharing images publicly.',
    'Always review metadata before sharing photographs publicly.',
  ].join(' ');
}