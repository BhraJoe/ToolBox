import type { PDFDocumentProxy } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Simple UUID v4 implementation (no external dependency)
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const PDF_TO_IMAGE = {
  MAX_FILE_SIZE: 30 * 1024 * 1024, // 30 MB
  MAX_PDF_PIXELS: 48_000_000, // Max ~48MP for rendering
  MAX_PAGES: 100,
};

export type ImageOutputFormat = 'PNG' | 'JPEG';

export type ResolutionPreset = 'LOW' | 'MEDIUM' | 'HIGH' | 'CUSTOM';

export type BackgroundColor = 'white' | 'black' | string;

export interface ImageExportOptions {
  format: ImageOutputFormat;
  resolution: ResolutionPreset;
  customDpi?: number;
  quality?: number;
  background: BackgroundColor;
}

export interface ImageExportResult {
  pageNumber: number;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  fileSize: number;
}

export interface PdfValidationResult {
  valid: boolean;
  error?: string;
  pageCount?: number;
  fileSize?: number;
  fileName?: string;
}

export interface ConversionProgress {
  total: number;
  completed: number;
  currentPage: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  errors: string[];
}

/**
 * Validate PDF file - checks type and basic structure
 */
export async function validatePdfFile(file: File): Promise<PdfValidationResult> {
  const isPdfType =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  if (!isPdfType) {
    return { valid: false, error: 'Unsupported file type. Only PDF files are allowed.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The file is empty.' };
  }

  if (file.size > PDF_TO_IMAGE.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File exceeds maximum size of ${(PDF_TO_IMAGE.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB.`,
    };
  }

  // Validate PDF magic bytes
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const pdfSignature =
    String.fromCharCode(uint8[0], uint8[1], uint8[2], uint8[3]) === '%PDF'
      ? '%PDF'
      : '';
  if (pdfSignature !== '%PDF') {
    return { valid: false, error: 'The file is not a valid PDF document.' };
  }

  return { valid: true, pageCount: 0, fileSize: file.size, fileName: file.name };
}

/**
 * Render a PDF page to an image blob
 */
export async function renderPageToImage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  options: ImageExportOptions
): Promise<ImageExportResult> {
  const page = await doc.getPage(pageNumber);
  const dpi = options.resolution === 'CUSTOM' ? (options.customDpi ?? 300) : DPI_PRESET_VALUE[options.resolution];
  const scale = dpi / 72; // Convert DPI to scale (72 is base points per inch)

  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    await page.cleanup();
    throw new Error('Canvas context is not available in this browser.');
  }

  const imageContext = {
    canvas,
    canvasContext: ctx,
    viewport,
  };

  await page.render(imageContext).promise;

  // Background color
  ctx.fillStyle = options.background === 'black' ? '#000000' : '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Re-render to fill background properly
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  const format = options.format;
  const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
  const quality = format === 'JPEG' ? (options.quality ?? 0.92) : undefined;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error(`Failed to create ${format} image from page ${pageNumber}.`));
      },
      mimeType,
      quality
    );
  });

  const dataUrl = canvas.toDataURL(mimeType, quality);

  await page.cleanup();

  return {
    pageNumber,
    blob,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    fileSize: blob.size,
  };
}

// DPI values for each preset
const DPI_PRESET_VALUE: Record<ResolutionPreset, number> = {
  LOW: 96,
  MEDIUM: 150,
  HIGH: 300,
  CUSTOM: 300,
};

export function getDpiForResolution(resolution: ResolutionPreset, customDpi?: number): number {
  if (resolution === 'CUSTOM') {
    const dpi = customDpi ?? 300;
    if (dpi < 72 || dpi > 600) {
      return 300;
    }
    return dpi;
  }
  return DPI_PRESET_VALUE[resolution];
}

export function getQualityForFormat(format: ImageOutputFormat, quality?: number): number {
  if (format === 'JPEG') {
    return quality ?? 0.92;
  }
  return 1;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/\.[^.]+$/, '');
  return cleaned || 'image';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate output filename from prefix and page number
 */
export function generateImageFilename(
  prefix: string,
  pageNumber: number,
  format: ImageOutputFormat
): string {
  const sanitized = sanitizeFilename(prefix) || 'image';
  const cleaned = sanitized.replace(/-(png|jpeg|jpg)$/i, '');
  return `${cleaned}-page-${pageNumber}.${format.toLowerCase()}`;
}

export { jsPDF };
