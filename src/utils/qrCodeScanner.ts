import { BrowserQRCodeReader } from '@zxing/browser';
import { ChecksumException, DecodeHintType, FormatException, NotFoundException } from '@zxing/library';

export type ScanMethod = 'camera' | 'image';

export interface ScanHistoryEntry {
  id: string;
  content: string;
  method: ScanMethod;
  scannedAt: string;
}

export interface ContentDetails {
  label: string;
  websiteUrl: string | null;
  warning: string;
  wifi: { name: string; security: string; hidden: boolean } | null;
}

export const QR_HISTORY_KEY = 'toolbox-qr-scanner-history';
export const QR_HISTORY_LIMIT = 20;
export const MAX_QR_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;

export class QrCodeNotFoundError extends Error {
  constructor() {
    super('No QR code was found. Try a clearer, well-lit image with the code fully visible.');
    this.name = 'QrCodeNotFoundError';
  }
}

export function isExpectedDecodeMiss(error: unknown): boolean {
  return error instanceof NotFoundException
    || error instanceof ChecksumException
    || error instanceof FormatException;
}

function decodeWifiValue(value: string): string {
  return value.replace(/\\([\\;:,"])/g, '$1');
}

function readWifiFields(payload: string): ContentDetails['wifi'] {
  const fields: Record<string, string> = {};
  const body = payload.slice(5);
  const chunks: string[] = [];
  let current = '';
  let escaped = false;

  for (const character of body) {
    if (escaped) {
      current += `\\${character}`;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ';') {
      chunks.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (current) chunks.push(current);

  for (const chunk of chunks) {
    const separator = chunk.indexOf(':');
    if (separator > 0) {
      fields[chunk.slice(0, separator).toUpperCase()] = decodeWifiValue(chunk.slice(separator + 1));
    }
  }

  if (!fields.S) return null;
  return {
    name: fields.S,
    security: fields.T || 'Unknown',
    hidden: fields.H?.toLowerCase() === 'true',
  };
}

export function describeQrContent(content: string): ContentDetails {
  const value = content.trim();
  const empty: ContentDetails = { label: 'Plain text', websiteUrl: null, warning: '', wifi: null };

  if (/^WIFI:/i.test(value)) {
    const wifi = readWifiFields(value);
    return {
      label: 'Wi-Fi network',
      websiteUrl: null,
      warning: '',
      wifi,
    };
  }
  if (/^BEGIN:VCARD(?:\r?\n|$)/i.test(value)) {
    return { ...empty, label: 'vCard contact' };
  }
  if (/^(?:SMSTO:|sms:)/i.test(value)) {
    return { ...empty, label: 'SMS message' };
  }
  if (/^mailto:/i.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ...empty, label: 'Email address' };
  }
  if (/^tel:/i.test(value) || /^\+?[\d\s().-]{7,}$/.test(value)) {
    return { ...empty, label: 'Phone number' };
  }

  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      const warning = url.protocol !== 'https:' || url.username !== '' || url.password !== ''
        ? 'This link is not a secure HTTPS link or contains unusual credentials. Verify it before continuing.'
        : '';
      return {
        label: 'Website URL',
        websiteUrl: url.href,
        warning,
        wifi: null,
      };
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
      return {
        ...empty,
        label: 'Other link or URI',
        warning: 'This content uses a non-web link format. It will not be opened by this scanner.',
      };
    }
  } catch {
    // Not every QR payload is a URL.
  }

  return empty;
}

function isSupportedImage(file: File): boolean {
  const extension = file.name.toLowerCase().split('.').pop();
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    || ['png', 'jpg', 'jpeg', 'webp'].includes(extension ?? '');
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The image could not be prepared for scanning.'));
    }, 'image/png');
  });
}

async function decodeQrFromImage(image: HTMLImageElement): Promise<string> {
  try {
    return (await new BrowserQRCodeReader().decodeFromImageElement(image)).getText();
  } catch (error) {
    if (!isExpectedDecodeMiss(error)) throw error;
    const pureImageHints = new Map([
      [DecodeHintType.PURE_BARCODE, true],
      [DecodeHintType.TRY_HARDER, true],
    ]);
    try {
      return (await new BrowserQRCodeReader(pureImageHints).decodeFromImageElement(image)).getText();
    } catch (fallbackError) {
      if (isExpectedDecodeMiss(fallbackError)) throw new QrCodeNotFoundError();
      throw fallbackError;
    }
  }
}

export async function decodeQrImage(file: File): Promise<string> {
  if (!isSupportedImage(file)) {
    throw new Error('Choose a PNG, JPG, JPEG, or WEBP image.');
  }
  if (file.size > MAX_QR_IMAGE_BYTES) {
    throw new Error('This image is larger than 25 MB. Choose a smaller image and try again.');
  }
  if (file.size === 0) {
    throw new Error('This image file is empty or invalid.');
  }

  let sourceUrl = '';
  let resizedUrl = '';
  let canvas: HTMLCanvasElement | null = null;
  try {
    sourceUrl = URL.createObjectURL(file);
    const source = new Image();
    source.src = sourceUrl;
    await source.decode();
    const width = source.naturalWidth;
    const height = source.naturalHeight;
    if (!width || !height) throw new Error('The selected file is not a readable image.');

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    if (scale === 1) return await decodeQrFromImage(source);

    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    resizedUrl = URL.createObjectURL(await canvasToBlob(canvas));
    const resizedImage = new Image();
    resizedImage.src = resizedUrl;
    await resizedImage.decode();
    return await decodeQrFromImage(resizedImage);
  } catch (error) {
    if (error instanceof QrCodeNotFoundError) throw error;
    if (error instanceof Error && error.message) {
      throw new Error(`Could not read this image: ${error.message}`);
    }
    throw new Error('Could not read this image. It may be damaged or unsupported.');
  } finally {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (resizedUrl) URL.revokeObjectURL(resizedUrl);
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

export function readQrHistory(): { entries: ScanHistoryEntry[]; error: string } {
  try {
    const stored = window.localStorage.getItem(QR_HISTORY_KEY);
    if (!stored) return { entries: [], error: '' };
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return { entries: [], error: 'Saved scan history was invalid and has been ignored.' };

    const entries = parsed.filter((entry): entry is ScanHistoryEntry => (
      typeof entry === 'object'
      && entry !== null
      && typeof (entry as ScanHistoryEntry).id === 'string'
      && typeof (entry as ScanHistoryEntry).content === 'string'
      && ((entry as ScanHistoryEntry).method === 'camera' || (entry as ScanHistoryEntry).method === 'image')
      && typeof (entry as ScanHistoryEntry).scannedAt === 'string'
    )).slice(0, QR_HISTORY_LIMIT);
    return { entries, error: '' };
  } catch {
    return { entries: [], error: 'Local scan history is unavailable in this browser or storage is disabled.' };
  }
}

export function writeQrHistory(entries: ScanHistoryEntry[]): string {
  try {
    window.localStorage.setItem(QR_HISTORY_KEY, JSON.stringify(entries.slice(0, QR_HISTORY_LIMIT)));
    return '';
  } catch {
    return 'Could not save scan history locally. Browser storage may be disabled or full.';
  }
}

export function makeHistoryEntry(content: string, method: ScanMethod): ScanHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    content,
    method,
    scannedAt: new Date().toISOString(),
  };
}

export function stopVideoTracks(video: HTMLVideoElement | null): void {
  const source = video?.srcObject;
  if (typeof MediaStream !== 'undefined' && source instanceof MediaStream) {
    source.getTracks().forEach((track) => track.stop());
  }
  if (video) video.srcObject = null;
}
