export interface ImageDimensions {
  width: number;
  height: number;
}

export type ExportFormat = 'png' | 'jpeg' | 'webp';
export type BackgroundMode = 'transparent' | 'white' | 'black' | 'custom';

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  backgroundMode: BackgroundMode;
  customColor: string;
  backgroundImage: HTMLImageElement | null;
}

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

async function decodeSource(source: Blob | File): Promise<{ image: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(source);
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(source);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('The image could not be decoded.'));
    image.src = url;
  });
  return {
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

export async function readImageDimensions(file: File): Promise<ImageDimensions> {
  const decoded = await decodeSource(file);
  try {
    return { width: decoded.width, height: decoded.height };
  } finally {
    decoded.release();
  }
}

export async function removeImageBackground(
  file: File,
  onProgress: (key: string, current: number, total: number) => void,
): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');
  return removeBackground(file, {
    model: 'isnet_fp16',
    device: 'cpu',
    debug: false,
    progress: (key, current, total) => onProgress(key, current, total),
  });
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

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number,
): Promise<Blob> {
  const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mime, quality);
  });
  if (!blob) throw new Error(`The browser could not encode ${format.toUpperCase()}.`);
  if (format !== 'png' && blob.type !== mime) {
    throw new Error(`${format.toUpperCase()} export is not supported by this browser.`);
  }
  return blob;
}

export function getBackgroundColor(options: ExportOptions): string {
  if (options.backgroundMode === 'white') return '#ffffff';
  if (options.backgroundMode === 'black') return '#000000';
  if (options.backgroundMode === 'custom') return options.customColor;
  return 'transparent';
}
