export type PixelateMode = 'standard' | 'large' | 'small' | 'mosaic' | 'custom';
export type ExportFormat = 'png' | 'jpeg' | 'webp';

export interface SelectionBrushPoint {
  x: number;
  y: number;
}

export type SelectionOperation =
  | { type: 'brush'; mode: 'add' | 'erase'; points: SelectionBrushPoint[]; size: number }
  | { type: 'rectangle'; mode: 'add' | 'erase'; x: number; y: number; width: number; height: number };

export const MAX_IMAGE_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;

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

export function isSupportedImageFile(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    || /\.(jpe?g|png|webp)$/i.test(file.name);
}

export async function loadImageFile(file: File): Promise<{ image: HTMLImageElement; url: string; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The image could not be decoded.'));
    };
    image.src = url;
  });
  return { image, url, width: image.naturalWidth, height: image.naturalHeight };
}

export function createSelectionMask(
  width: number,
  height: number,
  operations: SelectionOperation[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable in this browser.');

  context.fillStyle = '#fff';
  context.strokeStyle = '#fff';
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const operation of operations) {
    context.save();
    context.globalCompositeOperation = operation.mode === 'erase' ? 'destination-out' : 'source-over';
    if (operation.type === 'rectangle') {
      context.fillRect(operation.x * width, operation.y * height, operation.width * width, operation.height * height);
    } else if (operation.points.length === 1) {
      const point = operation.points[0];
      context.beginPath();
      context.arc(point.x * width, point.y * height, operation.size * Math.min(width, height), 0, Math.PI * 2);
      context.fill();
    } else {
      context.lineWidth = operation.size * Math.min(width, height) * 2;
      context.beginPath();
      context.moveTo(operation.points[0].x * width, operation.points[0].y * height);
      for (let index = 1; index < operation.points.length; index += 1) {
        context.lineTo(operation.points[index].x * width, operation.points[index].y * height);
      }
      context.stroke();
    }
    context.restore();
  }
  return canvas;
}

export function getBlockSize(mode: PixelateMode, size: number): number {
  if (mode === 'large') return Math.max(4, size * 2);
  if (mode === 'small') return Math.max(2, Math.round(size / 2));
  if (mode === 'mosaic') return Math.max(4, Math.round(size * 1.35));
  if (mode === 'custom') return Math.max(2, size);
  return Math.max(2, size);
}

export function pixelateCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  mode: PixelateMode,
  pixelSize: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');

  const blockSize = getBlockSize(mode, pixelSize);
  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.ceil(width / blockSize));
  small.height = Math.max(1, Math.ceil(height / blockSize));
  const smallContext = small.getContext('2d');
  if (!smallContext) throw new Error('Canvas is unavailable in this browser.');

  smallContext.imageSmoothingEnabled = mode === 'mosaic';
  smallContext.drawImage(source, 0, 0, small.width, small.height);

  context.imageSmoothingEnabled = false;
  context.drawImage(small, 0, 0, width, height);
  return canvas;
}

export function applyPixelateMask(
  originalCanvas: HTMLCanvasElement,
  pixelatedCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = originalCanvas.width;
  result.height = originalCanvas.height;
  const context = result.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');
  context.drawImage(originalCanvas, 0, 0);
  context.globalCompositeOperation = 'source-atop';
  context.drawImage(pixelatedCanvas, 0, 0);
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(maskCanvas, 0, 0);
  context.globalCompositeOperation = 'destination-over';
  context.drawImage(originalCanvas, 0, 0);
  return result;
}

export function getSupportedExportFormats(): ExportFormat[] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const formats: ExportFormat[] = ['png'];
  if (canvas.toDataURL('image/jpeg').startsWith('data:image/jpeg')) formats.push('jpeg');
  if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) formats.push('webp');
  return formats;
}

export async function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number): Promise<Blob> {
  const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
  if (!blob) throw new Error(`The browser could not encode ${format.toUpperCase()}.`);
  if (format !== 'png' && blob.type !== mime) {
    throw new Error(`${format.toUpperCase()} export is not supported by this browser.`);
  }
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
