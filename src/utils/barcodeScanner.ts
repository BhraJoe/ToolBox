import { BrowserMultiFormatReader, HTMLCanvasElementLuminanceSource } from '@zxing/browser';
import {
  BarcodeFormat,
  BinaryBitmap,
  ChecksumException,
  DecodeHintType,
  FormatException,
  HybridBinarizer,
  NotFoundException,
  PDF417Reader,
} from '@zxing/library';
import { calculateCheckDigit } from './barcode';

export type BarcodeScanMethod = 'camera' | 'image';

export interface DecodedBarcode {
  value: string;
  format: string;
}

export interface BarcodeHistoryEntry extends DecodedBarcode {
  id: string;
  method: BarcodeScanMethod;
  scannedAt: string;
}

export interface CheckDigitResult {
  applicable: boolean;
  valid: boolean | null;
  expected: string | null;
}

export const BARCODE_HISTORY_KEY = 'toolbox-barcode-scanner-history';
export const BARCODE_HISTORY_LIMIT = 50;
export const MAX_BARCODE_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;

const SUPPORTED_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.PDF_417,
  BarcodeFormat.DATA_MATRIX,
];

function createHints(): Map<DecodeHintType, any> {
  return new Map<DecodeHintType, any>([
    [DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS],
    [DecodeHintType.TRY_HARDER, true],
    [DecodeHintType.RETURN_CODABAR_START_END, true],
  ]);
}

export function getBarcodeFormatName(format: BarcodeFormat, value: string): string {
  switch (format) {
    case BarcodeFormat.CODE_128:
      return 'CODE 128';
    case BarcodeFormat.CODE_39:
      return 'CODE 39';
    case BarcodeFormat.EAN_13:
      return 'EAN-13';
    case BarcodeFormat.EAN_8:
      return 'EAN-8';
    case BarcodeFormat.UPC_A:
      return 'UPC-A';
    case BarcodeFormat.UPC_E:
      return 'UPC-E';
    case BarcodeFormat.ITF:
      return /^\d{14}$/.test(value) ? 'ITF (14-digit, ITF-14 style)' : 'ITF';
    case BarcodeFormat.CODABAR:
      return 'Codabar';
    case BarcodeFormat.PDF_417:
      return 'PDF417';
    case BarcodeFormat.DATA_MATRIX:
      return 'Data Matrix';
    default:
      return 'Unsupported format';
  }
}

export function isExpectedBarcodeMiss(error: unknown): boolean {
  return error instanceof NotFoundException
    || error instanceof ChecksumException
    || error instanceof FormatException;
}

export class BarcodeNotFoundError extends Error {
  constructor() {
    super('No supported barcode could be decoded. It may be damaged, too small, or in an unsupported format. Try a sharper, well-lit image with the entire barcode visible.');
    this.name = 'BarcodeNotFoundError';
  }
}

function isSupportedImage(file: File): boolean {
  const extension = file.name.toLowerCase().split('.').pop();
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    || ['png', 'jpg', 'jpeg', 'webp'].includes(extension ?? '');
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image file is corrupted or could not be decoded.'));
    image.src = url;
  });
}

function imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image processing is unavailable in this browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function decodeBarcodeImage(file: File): Promise<DecodedBarcode[]> {
  if (!isSupportedImage(file)) {
    throw new Error('Unsupported file type. Choose a PNG, JPG, JPEG, or WEBP image.');
  }
  if (file.size > MAX_BARCODE_IMAGE_BYTES) {
    throw new Error('This image is larger than 25 MB. Choose a smaller image and try again.');
  }
  if (file.size === 0) {
    throw new Error('This image file is empty or invalid.');
  }

  let sourceUrl = '';
  let canvas: HTMLCanvasElement | null = null;
  try {
    sourceUrl = URL.createObjectURL(file);
    const image = await loadImage(sourceUrl);
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('The selected file is not a readable image.');
    }

    canvas = imageToCanvas(image);
    const hints = createHints();
    const found: DecodedBarcode[] = [];
    const seen = new Set<string>();
    const addResult = (result: { getText(): string; getBarcodeFormat(): BarcodeFormat }) => {
      const value = result.getText();
      const format = getBarcodeFormatName(result.getBarcodeFormat(), value);
      const key = `${format}\u0000${value}`;
      if (value && !seen.has(key)) {
        seen.add(key);
        found.push({ value, format });
      }
    };

    const bitmap = new BinaryBitmap(new HybridBinarizer(new HTMLCanvasElementLuminanceSource(canvas)));
    try {
      new PDF417Reader().decodeMultiple(bitmap, hints).forEach(addResult);
    } catch (error) {
      if (!isExpectedBarcodeMiss(error)) throw error;
    }

    try {
      addResult(new BrowserMultiFormatReader(hints).decodeFromCanvas(canvas));
    } catch (error) {
      if (!isExpectedBarcodeMiss(error)) throw error;
    }

    if (found.length === 0) throw new BarcodeNotFoundError();
    return found;
  } catch (error) {
    if (error instanceof BarcodeNotFoundError) throw error;
    if (error instanceof Error && error.message) {
      throw new Error(`Could not scan this image: ${error.message}`);
    }
    throw new Error('Could not scan this image. It may be damaged or unsupported.');
  } finally {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

export function checkRetailBarcodeDigit(format: string, value: string): CheckDigitResult {
  const expectedLength = format === 'EAN-13' ? 13 : format === 'EAN-8' ? 8 : format === 'UPC-A' ? 12 : 0;
  if (!expectedLength || value.length !== expectedLength || !/^\d+$/.test(value)) {
    return { applicable: false, valid: null, expected: null };
  }
  const expected = calculateCheckDigit(value.slice(0, -1));
  return { applicable: true, valid: value.endsWith(expected), expected };
}

export function readBarcodeHistory(): { entries: BarcodeHistoryEntry[]; error: string } {
  try {
    const stored = window.localStorage.getItem(BARCODE_HISTORY_KEY);
    if (!stored) return { entries: [], error: '' };
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return { entries: [], error: 'Saved barcode history was invalid and has been ignored.' };
    }

    const entries = parsed.filter((entry): entry is BarcodeHistoryEntry => (
      typeof entry === 'object'
      && entry !== null
      && 'id' in entry
      && typeof entry.id === 'string'
      && 'value' in entry
      && typeof entry.value === 'string'
      && 'format' in entry
      && typeof entry.format === 'string'
      && 'method' in entry
      && (entry.method === 'camera' || entry.method === 'image')
      && 'scannedAt' in entry
      && typeof entry.scannedAt === 'string'
    )).slice(0, BARCODE_HISTORY_LIMIT);
    return { entries, error: '' };
  } catch {
    return { entries: [], error: 'Local scan history is unavailable in this browser or storage is disabled.' };
  }
}

export function writeBarcodeHistory(entries: BarcodeHistoryEntry[]): string {
  try {
    window.localStorage.setItem(BARCODE_HISTORY_KEY, JSON.stringify(entries.slice(0, BARCODE_HISTORY_LIMIT)));
    return '';
  } catch {
    return 'Could not save scan history locally. Browser storage may be disabled or full.';
  }
}

export function makeBarcodeHistoryEntry(
  barcode: DecodedBarcode,
  method: BarcodeScanMethod,
  scannedAt: string,
): BarcodeHistoryEntry {
  return {
    ...barcode,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    method,
    scannedAt,
  };
}
