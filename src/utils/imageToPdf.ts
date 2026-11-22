import { validateSvgContent } from './imageToBase64';
import { jsPDF } from 'jspdf';

export type PdfPageSizeId = 'a4' | 'a3' | 'a5' | 'letter' | 'legal' | 'fit';
export type PdfOrientation = 'portrait' | 'landscape' | 'auto';
export type PdfMarginId = 'none' | 'small' | 'medium' | 'large' | 'custom';
export type PdfPlacement = 'fit' | 'fill' | 'original' | 'center';

export interface PdfPageSize {
  id: PdfPageSizeId;
  label: string;
  width: number;
  height: number;
}

export interface PdfMarginOption {
  id: PdfMarginId;
  label: string;
  mm: number;
}

export interface PdfPlacementOption {
  id: PdfPlacement;
  label: string;
  description: string;
}

export interface PdfImageEntry {
  id: string;
  file: File;
  mimeType: string;
  width: number;
  height: number;
}

export interface PdfPlacementResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfGenerationOptions {
  pageSizeId: PdfPageSizeId;
  orientation: PdfOrientation;
  marginId: PdfMarginId;
  customMarginMm: number;
  placement: PdfPlacement;
  backgroundColor: string;
}

export interface PdfGenerationResult {
  blob: Blob;
  pageCount: number;
  fileSize: number;
}

export const PDF_PAGE_SIZES: PdfPageSize[] = [
  { id: 'fit', label: 'Fit to Image', width: 0, height: 0 },
  { id: 'a4', label: 'A4', width: 210, height: 297 },
  { id: 'a3', label: 'A3', width: 297, height: 420 },
  { id: 'a5', label: 'A5', width: 148, height: 210 },
  { id: 'letter', label: 'Letter', width: 215.9, height: 279.4 },
  { id: 'legal', label: 'Legal', width: 215.9, height: 355.6 },
];

export const PDF_MARGINS: PdfMarginOption[] = [
  { id: 'none', label: 'No margin', mm: 0 },
  { id: 'small', label: 'Small', mm: 10 },
  { id: 'medium', label: 'Medium', mm: 15 },
  { id: 'large', label: 'Large', mm: 20 },
  { id: 'custom', label: 'Custom', mm: 0 },
];

export const PDF_PLACEMENTS: PdfPlacementOption[] = [
  { id: 'fit', label: 'Fit to Page', description: 'Scale image to fit entirely within the page (contain). May leave empty space.' },
  { id: 'fill', label: 'Fill Page', description: 'Scale image to completely fill the page (cover). May crop edges.' },
  { id: 'original', label: 'Original Aspect Ratio', description: 'Display at natural size; downscale only if larger than page.' },
  { id: 'center', label: 'Center Image', description: 'Display at natural size, centered on the page; downscale if larger.' },
];

const MM_PER_PX = 25.4 / 96;

export function getPageSizeById(id: PdfPageSizeId): PdfPageSize {
  const size = PDF_PAGE_SIZES.find((s) => s.id === id);
  if (!size) throw new Error(`Unknown page size: ${id}`);
  return size;
}

export function getMarginById(id: PdfMarginId): PdfMarginOption {
  const margin = PDF_MARGINS.find((m) => m.id === id);
  if (!margin) throw new Error(`Unknown margin: ${id}`);
  return margin;
}

export function validateCustomMargin(marginMm: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(marginMm) || marginMm < 0) {
    return { valid: false, error: 'Margin must be a non-negative number.' };
  }
  return { valid: true };
}

export function resolvePageDimensions(
  pageSizeId: PdfPageSizeId,
  orientation: 'portrait' | 'landscape',
  imageDimensions?: { width: number; height: number }
): { width: number; height: number } {
  const pageSize = getPageSizeById(pageSizeId);
  let w = pageSize.width;
  let h = pageSize.height;

  if (pageSizeId === 'fit') {
    if (!imageDimensions || imageDimensions.width <= 0 || imageDimensions.height <= 0) {
      throw new Error('Fit to Image requires valid image dimensions.');
    }
    w = imageDimensions.width * MM_PER_PX;
    h = imageDimensions.height * MM_PER_PX;
  }

  if (orientation === 'landscape') {
    [w, h] = [h, w];
  }

  return { width: w, height: h };
}

export function determineOrientation(
  mode: PdfOrientation,
  pageWidth: number,
  pageHeight: number,
  imageWidthMm: number,
  imageHeightMm: number
): 'portrait' | 'landscape' {
  if (mode === 'portrait') return 'portrait';
  if (mode === 'landscape') return 'landscape';

  const pageAspect = pageWidth / pageHeight;
  const imageAspect = imageWidthMm / imageHeightMm;
  const portraitDiff = Math.abs(pageAspect - imageAspect);
  const landscapeDiff = Math.abs((pageHeight / pageWidth) - imageAspect);

  return landscapeDiff < portraitDiff ? 'landscape' : 'portrait';
}

export function computePlacement(
  pageWidth: number,
  pageHeight: number,
  imageWidthMm: number,
  imageHeightMm: number,
  placement: PdfPlacement,
  marginMm: number
): PdfPlacementResult {
  if (imageWidthMm <= 0 || imageHeightMm <= 0) {
    throw new Error('Invalid image dimensions.');
  }

  const usableW = pageWidth - marginMm * 2;
  const usableH = pageHeight - marginMm * 2;
  if (usableW <= 0 || usableH <= 0) {
    throw new Error('Margins are too large for the selected page size.');
  }

  let finalW: number;
  let finalH: number;
  let x: number;
  let y: number;

  switch (placement) {
    case 'fit': {
      const scale = Math.min(usableW / imageWidthMm, usableH / imageHeightMm);
      finalW = imageWidthMm * scale;
      finalH = imageHeightMm * scale;
      x = marginMm + (usableW - finalW) / 2;
      y = marginMm + (usableH - finalH) / 2;
      break;
    }
    case 'fill': {
      const scale = Math.max(usableW / imageWidthMm, usableH / imageHeightMm);
      finalW = imageWidthMm * scale;
      finalH = imageHeightMm * scale;
      x = marginMm;
      y = marginMm;
      break;
    }
    case 'original': {
      finalW = imageWidthMm;
      finalH = imageHeightMm;
      const scale = Math.min(usableW / finalW, usableH / finalH, 1);
      if (scale < 1) {
        finalW *= scale;
        finalH *= scale;
      }
      x = marginMm + (usableW - finalW) / 2;
      y = marginMm + (usableH - finalH) / 2;
      break;
    }
    case 'center': {
      finalW = imageWidthMm;
      finalH = imageHeightMm;
      const scale = Math.min(usableW / finalW, usableH / finalH, 1);
      if (scale < 1) {
        finalW *= scale;
        finalH *= scale;
      }
      x = marginMm + (usableW - finalW) / 2;
      y = marginMm + (usableH - finalH) / 2;
      break;
    }
    default: {
      const scale = Math.min(usableW / imageWidthMm, usableH / imageHeightMm);
      finalW = imageWidthMm * scale;
      finalH = imageHeightMm * scale;
      x = marginMm + (usableW - finalW) / 2;
      y = marginMm + (usableH - finalH) / 2;
    }
  }

  return { x, y, width: finalW, height: finalH };
}

export async function generatePdf(
  images: PdfImageEntry[],
  options: PdfGenerationOptions
): Promise<PdfGenerationResult> {
  if (images.length === 0) {
    throw new Error('No images provided for PDF generation.');
  }

  const marginOpt = getMarginById(options.marginId);
  const marginMm = options.marginId === 'custom' ? options.customMarginMm : marginOpt.mm;

  const doc = new jsPDF({
    unit: 'mm',
    format: [1, 1],
  });

  for (let i = 0; i < images.length; i++) {
    const entry = images[i];

    const imageWidthMm = entry.width * MM_PER_PX;
    const imageHeightMm = entry.height * MM_PER_PX;

    let pageOrientation: 'portrait' | 'landscape';
    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSizeId === 'fit') {
      pageWidth = imageWidthMm;
      pageHeight = imageHeightMm;
      pageOrientation = 'portrait';
    } else {
      const basePage = getPageSizeById(options.pageSizeId);
      pageWidth = basePage.width;
      pageHeight = basePage.height;
      if (options.orientation === 'auto') {
        pageOrientation = determineOrientation(
          options.orientation,
          pageWidth,
          pageHeight,
          imageWidthMm,
          imageHeightMm
        );
      } else {
        pageOrientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
      }
      if (pageOrientation === 'landscape') {
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
      }
    }

    if (marginMm * 2 >= pageWidth || marginMm * 2 >= pageHeight) {
      throw new Error('Margins are too large for the selected page size.');
    }

    if (i === 0) {
      doc.deletePage(1);
      doc.addPage([pageWidth, pageHeight], pageOrientation);
    } else {
      doc.addPage([pageWidth, pageHeight], pageOrientation);
    }

    const placement = computePlacement(
      pageWidth,
      pageHeight,
      imageWidthMm,
      imageHeightMm,
      options.placement,
      marginMm
    );

    const color = options.backgroundColor;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    const objectUrl = URL.createObjectURL(entry.file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${entry.file.name}`));
        img.src = objectUrl;
      });

      const MAX_CANVAS_DIM = 8192;
      const canvasWidth = Math.min(entry.width, MAX_CANVAS_DIM);
      const canvasHeight = Math.min(entry.height, MAX_CANVAS_DIM);
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not supported in this browser.');
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      const dataUrl = canvas.toDataURL('image/png');
      doc.addImage(dataUrl, 'PNG', placement.x, placement.y, placement.width, placement.height);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const blob = doc.output('blob');
  return {
    blob,
    pageCount: images.length,
    fileSize: blob.size,
  };
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

export function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\.[^.]+$/, '');
}

export function ensurePdfExtension(name: string): string {
  const cleaned = sanitizeFilename(name);
  if (!cleaned.toLowerCase().endsWith('.pdf')) {
    return `${cleaned}.pdf`;
  }
  return cleaned;
}

export const MAX_IMAGE_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 80_000_000;
export const MAX_BATCH_FILES = 12;

export const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
];

export const SUPPORTED_EXTENSIONS = /\.(png|jpe?g|webp|gif|bmp|svg)$/i;

export function isSupportedFile(file: File): boolean {
  if (SUPPORTED_MIME_TYPES.includes(file.type)) return true;
  if (SUPPORTED_EXTENSIONS.test(file.name)) return true;
  return false;
}

export function getFileMimeType(file: File): string | null {
  if (SUPPORTED_MIME_TYPES.includes(file.type)) return file.type;
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  if (ext === 'svg') return 'image/svg+xml';
  return null;
}

export async function validateAndReadImage(file: File): Promise<{
  mimeType: string;
  width: number;
  height: number;
  warnings: string[];
}> {
  if (file.size === 0) {
    throw new Error('This file is empty.');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`This image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_IMAGE_SIZE_BYTES)} per image.`);
  }

  const mimeType = getFileMimeType(file);
  if (!mimeType) {
    throw new Error('Unsupported file format. Supported formats: PNG, JPG, JPEG, WEBP, GIF, BMP, SVG.');
  }

  let warnings: string[] = [];
  let width = 0;
  let height = 0;

  if (mimeType === 'image/svg+xml') {
    const text = await file.text();
    const validation = validateSvgContent(text);
    warnings.push(...validation.warnings);

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const root = doc.documentElement;
    if (root) {
      const viewBox = root.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          width = Math.round(parts[2]);
          height = Math.round(parts[3]);
        }
      }
      if (!width || !height) {
        const wAttr = root.getAttribute('width');
        const hAttr = root.getAttribute('height');
        const parseLen = (v: string | null): number | null => {
          if (!v || v.trim().endsWith('%')) return null;
          const n = parseFloat(v);
          return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
        };
        width = parseLen(wAttr) ?? 0;
        height = parseLen(hAttr) ?? 0;
      }
    }
    if (!width || !height) {
      throw new Error('SVG dimensions could not be determined.');
    }
  } else {
    const decoded = await createImageBitmap(file);
    try {
      width = decoded.width;
      height = decoded.height;
    } finally {
      decoded.close();
    }
  }

  if (width <= 0 || height <= 0) {
    throw new Error('Image dimensions could not be determined.');
  }

  if (width * height > MAX_IMAGE_PIXELS) {
    throw new Error('This image has more than 80 million pixels and may exceed browser memory limits.');
  }

  if (mimeType === 'image/gif') {
    warnings.push('Animated GIFs are converted as still images (first frame only).');
  }

  return { mimeType, width, height, warnings };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}