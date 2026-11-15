export type ImageOutputFormat = 'jpeg' | 'png' | 'webp';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CompressionOptions extends ImageDimensions {
  format: ImageOutputFormat;
  quality: number;
}

export const MAX_IMAGE_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 80_000_000;
export const MAX_BATCH_FILES = 12;

const FORMAT_MIME: Record<ImageOutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function getImageMimeType(format: ImageOutputFormat): string {
  return FORMAT_MIME[format];
}

export function getImageExtension(format: ImageOutputFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

export function getSupportedImageFormats(): ImageOutputFormat[] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return (['jpeg', 'png', 'webp'] as const).filter((format) => {
    try {
      return canvas.toDataURL(FORMAT_MIME[format]).startsWith(`data:${FORMAT_MIME[format]}`);
    } catch {
      return false;
    }
  });
}

function loadImage(file: File): Promise<{ image: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).then((bitmap) => ({
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }));
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be decoded. Try a different file.'));
    };
    image.src = url;
  });
}

export async function readImageDimensions(file: File): Promise<ImageDimensions> {
  const decoded = await loadImage(file);
  try {
    return { width: decoded.width, height: decoded.height };
  } finally {
    decoded.release();
  }
}

export async function compressImage(file: File, options: CompressionOptions): Promise<Blob> {
  const { format, width, height } = options;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Width and height must be positive whole numbers.');
  }
  if (width * height > MAX_IMAGE_PIXELS) {
    throw new Error('The requested output is too large for safe browser processing. Reduce its dimensions.');
  }

  const decoded = await loadImage(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas processing is unavailable in this browser.');

    if (format === 'jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(decoded.image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      const quality = Math.min(1, Math.max(0.01, options.quality / 100));
      canvas.toBlob(resolve, FORMAT_MIME[format], quality);
    });
    if (!blob || blob.size === 0) throw new Error('The browser could not encode this image. Try another format.');
    if (blob.type !== FORMAT_MIME[format]) {
      throw new Error(`${format.toUpperCase()} encoding is not supported by this browser.`);
    }
    return blob;
  } finally {
    decoded.release();
  }
}

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