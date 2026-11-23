export type WatermarkType = 'text' | 'logo';

export type PositionPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface BaseWatermarkConfig {
  type: WatermarkType;
  position: PositionPreset | 'custom';
  positionX: number; // 0-100 percent
  positionY: number; // 0-100 percent
  margin: number; // px
  rotation: number; // degrees -180..180
  opacity: number; // 0-100 percent
  repeat: boolean;
  repeatSpacing: number; // px
}

export interface TextWatermarkConfig extends BaseWatermarkConfig {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number; // px
  fontWeight: 'normal' | 'bold';
  color: string; // hex
  shadow: boolean;
  outline: boolean;
}

export interface LogoWatermarkConfig extends BaseWatermarkConfig {
  type: 'logo';
  logoFile: File | null;
  logoPreviewUrl: string | null;
  logoWidth: number; // px
}

export interface WatermarkResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  fileSize: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageFileInfo {
  file: File;
  previewUrl: string;
  dimensions: ImageDimensions;
  fileSize: number;
}

export const WATERMARK_LIMITS = {
  MAX_IMAGE_SIZE_BYTES: 30 * 1024 * 1024,
  MAX_IMAGE_PIXELS: 80_000_000,
  MAX_LOGO_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_LOGO_PIXELS: 40_000_000,
  MIN_FONT_SIZE: 8,
  MAX_FONT_SIZE: 200,
  MIN_LOGO_WIDTH: 20,
  MAX_LOGO_WIDTH: 1200,
  MAX_MARGIN: 200,
} as const;

export const DEFAULT_FONT_FAMILIES: readonly string[] = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Courier New',
];

export const POSITION_PRESETS: Record<PositionPreset, { x: number; y: number }> = {
  'top-left': { x: 0, y: 0 },
  'top-center': { x: 50, y: 0 },
  'top-right': { x: 100, y: 0 },
  'center-left': { x: 0, y: 50 },
  center: { x: 50, y: 50 },
  'center-right': { x: 100, y: 50 },
  'bottom-left': { x: 0, y: 100 },
  'bottom-center': { x: 50, y: 100 },
  'bottom-right': { x: 100, y: 100 },
};

export const POSITION_LABELS: Record<PositionPreset, string> = {
  'top-left': 'Top Left',
  'top-center': 'Top Center',
  'top-right': 'Top Right',
  'center-left': 'Center Left',
  center: 'Center',
  'center-right': 'Center Right',
  'bottom-left': 'Bottom Left',
  'bottom-center': 'Bottom Center',
  'bottom-right': 'Bottom Right',
};

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SUPPORTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

const FORMAT_MIME: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

export function getImageMimeType(format: string): string {
  return FORMAT_MIME[format.toLowerCase()] ?? 'image/png';
}

export function getImageExtension(format: string): string {
  const f = format.toLowerCase();
  return f === 'jpeg' ? 'jpg' : f;
}

export function getSupportedOutputFormats(): string[] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const formats: string[] = ['png', 'jpeg', 'webp'];
  return formats.filter((format) => {
    try {
      return canvas.toDataURL(getImageMimeType(format)).startsWith(`data:${getImageMimeType(format)}`);
    } catch {
      return false;
    }
  });
}

export function isSupportedImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type) || SUPPORTED_IMAGE_EXTENSIONS.test(file.name);
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

export function dimensionsLabel(dimensions: ImageDimensions | null): string {
  return dimensions
    ? `${dimensions.width.toLocaleString()} × ${dimensions.height.toLocaleString()} px`
    : 'Reading dimensions…';
}

function loadImageFromFile(file: File): Promise<{
  image: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
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
    image.onload = () =>
      resolve({
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
  const decoded = await loadImageFromFile(file);
  try {
    return { width: decoded.width, height: decoded.height };
  } finally {
    decoded.release();
  }
}

export async function loadImageFile(file: File): Promise<ImageFileInfo> {
  const decoded = await loadImageFromFile(file);
  try {
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      dimensions: { width: decoded.width, height: decoded.height },
      fileSize: file.size,
    };
  } finally {
    decoded.release();
  }
}

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
}

export function computeAnchorPosition(
  canvasWidth: number,
  canvasHeight: number,
  watermarkWidth: number,
  watermarkHeight: number,
  position: PositionPreset | 'custom',
  positionX: number,
  positionY: number,
  margin: number,
): { x: number; y: number } {
  const fitWidth = Math.max(0, canvasWidth - watermarkWidth);
  const fitHeight = Math.max(0, canvasHeight - watermarkHeight);
  let anchorX: number;
  let anchorY: number;
  if (position === 'custom') {
    anchorX = (positionX / 100) * fitWidth;
    anchorY = (positionY / 100) * fitHeight;
  } else {
    const preset = POSITION_PRESETS[position];
    anchorX = (preset.x / 100) * fitWidth;
    anchorY = (preset.y / 100) * fitHeight;
  }
  return { x: margin + anchorX, y: margin + anchorY };
}

interface DrawInstanceArgs {
  ctx: CanvasRenderingContext2D;
  config: TextWatermarkConfig | LogoWatermarkConfig;
  cx: number;
  cy: number;
  logoImage?: CanvasImageSource | null;
  logoWidth?: number;
  logoHeight?: number;
}

function drawWatermarkInstance(args: DrawInstanceArgs): void {
  const { ctx, config, cx, cy } = args;
  ctx.save();

  if (config.type === 'text') {
    const { fontSize, fontWeight, fontFamily, color, opacity, rotation, shadow, outline } = config;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    ctx.fillStyle = hexToRgba(color, opacity);

    if (shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = Math.max(0, fontSize * 0.25);
      ctx.shadowOffsetX = fontSize * 0.08;
      ctx.shadowOffsetY = fontSize * 0.08;
    }

    const metrics = ctx.measureText(config.text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    const centerX = cx + textWidth / 2;
    const centerY = cy + textHeight / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    const tx = -textWidth / 2;
    const ty = 0;

    if (outline) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = Math.max(1, fontSize * 0.08);
      ctx.lineJoin = 'round';
      ctx.strokeText(config.text, tx, ty);
    }

    ctx.fillText(config.text, tx, ty);
  } else {
    if (!args.logoImage) {
      ctx.restore();
      return;
    }
    const { opacity, rotation } = config;
    const w = args.logoWidth ?? 100;
    const h = args.logoHeight ?? 100;
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity / 100));

    const centerX = cx + w / 2;
    const centerY = cy + h / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.drawImage(args.logoImage, -w / 2, -h / 2, w, h);
  }

  ctx.restore();
}

export async function renderWatermarkImage({
  image,
  config,
  outputWidth,
  outputHeight,
  mimeType,
  quality,
  backgroundColor,
}: {
  image: CanvasImageSource;
  config: TextWatermarkConfig | LogoWatermarkConfig;
  outputWidth: number;
  outputHeight: number;
  mimeType: string;
  quality?: number;
  backgroundColor?: string;
}): Promise<WatermarkResult> {
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas processing is unavailable in this browser.');
  }

  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, outputWidth, outputHeight);
  }

  ctx.drawImage(image, 0, 0, outputWidth, outputHeight);

  const logoImage = config.type === 'logo' ? await loadLogoImageForConfig(config) : null;

  const getWatermarkSize = (): { width: number; height: number } | null => {
    if (config.type === 'text') {
      ctx.font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
      ctx.textBaseline = 'top';
      const metrics = ctx.measureText(config.text);
      return { width: metrics.width, height: config.fontSize };
    }
    if (config.type === 'logo' && logoImage) {
      const ratio = logoImage.height / logoImage.width;
      const width = config.logoWidth ?? 100;
      const height = width * ratio;
      return { width, height };
    }
    return null;
  };

  const drawInstance = (cx: number, cy: number, w: number, h: number) => {
    drawWatermarkInstance({
      ctx,
      config,
      cx,
      cy,
      logoImage: config.type === 'logo' ? logoImage : undefined,
      logoWidth: config.type === 'logo' ? w : undefined,
      logoHeight: config.type === 'logo' ? h : undefined,
    });
  };

  const instances = getWatermarkSize();
  const instWidth = instances?.width ?? 100;
  const instHeight = instances?.height ?? 100;

  if (config.repeat) {
    const stepX = Math.max(1, instWidth + Math.max(0, config.repeatSpacing));
    const stepY = Math.max(1, instHeight + Math.max(0, config.repeatSpacing));
    for (let y = -stepY; y < outputHeight; y += stepY) {
      for (let x = -stepX; x < outputWidth; x += stepX) {
        drawInstance(x, y, instWidth, instHeight);
      }
    }
  } else {
    const pos = computeAnchorPosition(
      outputWidth,
      outputHeight,
      instances?.width ?? 100,
      instances?.height ?? 100,
      config.position,
      config.positionX,
      config.positionY,
      config.margin,
    );
    drawInstance(pos.x, pos.y, instances?.width ?? 100, instances?.height ?? 100);
  }

  if (logoImage) {
    logoImage.close();
  }

  const blob: Blob | null = await new Promise((resolve) => {
    const qualityValue = mimeType === 'image/png' ? undefined : quality ?? 0.92;
    canvas.toBlob(resolve, mimeType, qualityValue);
  });

  if (!blob || blob.size === 0) {
    throw new Error('The browser could not encode the watermarked image.');
  }

  const dataUrl = canvas.toDataURL(mimeType);
  const fileSize = blob.size;

  return { blob, dataUrl, width: outputWidth, height: outputHeight, fileSize };
}

export async function loadLogoImageForConfig(
  config: LogoWatermarkConfig,
): Promise<{ image: CanvasImageSource; width: number; height: number; close: () => void } | null> {
  if (!config.logoFile || !config.logoPreviewUrl) {
    return null;
  }
  try {
    const res = await fetch(config.logoPreviewUrl);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    return null;
  }
}

export async function exportWatermarkedImage(params: {
  image: CanvasImageSource;
  imageWidth: number;
  imageHeight: number;
  config: TextWatermarkConfig | LogoWatermarkConfig;
  format: string;
  quality?: number;
  backgroundColor?: string;
}): Promise<Blob> {
  const { image, imageWidth, imageHeight, config, format, quality, backgroundColor } = params;
  const mimeType = getImageMimeType(format);
  const allowed = ['png', 'jpeg', 'webp'];
  if (!allowed.includes(format.toLowerCase())) {
    throw new Error('The selected output format is not supported by this browser.');
  }

  const result = await renderWatermarkImage({
    image,
    config,
    outputWidth: imageWidth,
    outputHeight: imageHeight,
    mimeType,
    quality,
    backgroundColor,
  });

  if (mimeType !== 'image/png' && mimeType !== 'image/jpeg' && mimeType !== 'image/webp') {
    throw new Error('The selected output format is not supported by this browser.');
  }
  if (mimeType === 'image/jpeg') {
    // background must be set for JPEG (no transparency)
    if (!backgroundColor) {
      throw new Error('A background color is required for JPEG output.');
    }
  }

  return result.blob;
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

export function generateWatermarkFilename(base: string, format: string, prefix?: string): string {
  const cleaned = (base || prefix || 'watermarked-image').trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\.[^.]+$/, '');
  const safe = cleaned || 'watermarked-image';
  return `${safe}.${getImageExtension(format)}`;
}

export function clearWatermarkImageUrl(url: string | null): void {
  if (url) URL.revokeObjectURL(url);
}
