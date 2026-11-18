import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Trash2,
  RotateCcw,
  Maximize,
  Minimize,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  LoaderCircle,
  Image as ImageIcon,
  Check,
  X,
  ArrowDownToLine,
  Move,
} from 'lucide-react';
import {
  formatFileSize,
  getImageExtension,
  getSupportedImageFormats,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIZE_BYTES,
  readImageDimensions,
  type ImageDimensions,
  type ImageOutputFormat,
} from '../../../utils/imageCompressor';
import './image-cropper.css';

const MAX_FILES = 1;

type CropStatus = 'ready' | 'cropping' | 'done' | 'error';

type AspectRatioPreset = {
  id: string;
  label: string;
  ratio: number;
  width?: number;
  height?: number;
  group: 'aspect' | 'social' | 'general';
};

type SocialPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
  group: 'social';
};

type GeneralPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
  group: 'general';
};

const ASPECT_RATIOS: AspectRatioPreset[] = [
  { id: 'free', label: 'Freeform', ratio: 0, group: 'aspect' },
  { id: '1:1', label: '1:1 — Square', ratio: 1, group: 'aspect' },
  { id: '4:5', label: '4:5 — Portrait', ratio: 4 / 5, group: 'aspect' },
  { id: '5:4', label: '5:4 — Landscape', ratio: 5 / 4, group: 'aspect' },
  { id: '3:2', label: '3:2 — Landscape', ratio: 3 / 2, group: 'aspect' },
  { id: '2:3', label: '2:3 — Portrait', ratio: 2 / 3, group: 'aspect' },
  { id: '16:9', label: '16:9 — Widescreen', ratio: 16 / 9, group: 'aspect' },
  { id: '9:16', label: '9:16 — Vertical', ratio: 9 / 16, group: 'aspect' },
  { id: '4:3', label: '4:3 — Standard', ratio: 4 / 3, group: 'aspect' },
  { id: '3:4', label: '3:4 — Portrait', ratio: 3 / 4, group: 'aspect' },
];

const SOCIAL_PRESETS: SocialPreset[] = [
  { id: 'instagram-square', label: 'Instagram Square Post', width: 1080, height: 1080, aspectRatio: '1:1', group: 'social' },
  { id: 'instagram-portrait', label: 'Instagram Portrait Post', width: 1080, height: 1350, aspectRatio: '4:5', group: 'social' },
  { id: 'instagram-story', label: 'Instagram Story / Reel', width: 1080, height: 1920, aspectRatio: '9:16', group: 'social' },
  { id: 'facebook-post', label: 'Facebook Post', width: 1200, height: 630, aspectRatio: '1.91:1', group: 'social' },
  { id: 'facebook-cover', label: 'Facebook Cover', width: 820, height: 312, aspectRatio: '2.63:1', group: 'social' },
  { id: 'facebook-profile', label: 'Facebook Profile Image', width: 170, height: 170, aspectRatio: '1:1', group: 'social' },
  { id: 'youtube-thumbnail', label: 'YouTube Thumbnail', width: 1280, height: 720, aspectRatio: '16:9', group: 'social' },
  { id: 'youtube-banner', label: 'YouTube Channel Banner', width: 2560, height: 1440, aspectRatio: '16:9', group: 'social' },
  { id: 'linkedin-post', label: 'LinkedIn Post', width: 1200, height: 627, aspectRatio: '1.91:1', group: 'social' },
  { id: 'x-post', label: 'X/Twitter Post', width: 1600, height: 900, aspectRatio: '16:9', group: 'social' },
];

const GENERAL_PRESETS: GeneralPreset[] = [
  { id: 'profile-picture', label: 'Profile Picture', width: 400, height: 400, aspectRatio: '1:1', group: 'general' },
  { id: 'website-thumbnail', label: 'Website Thumbnail', width: 150, height: 150, aspectRatio: '1:1', group: 'general' },
  { id: 'blog-featured', label: 'Blog Featured Image', width: 1200, height: 628, aspectRatio: '1.91:1', group: 'general' },
  { id: 'product-image', label: 'Product Image', width: 800, height: 800, aspectRatio: '1:1', group: 'general' },
  { id: 'website-banner', label: 'Website Banner', width: 1920, height: 480, aspectRatio: '4:1', group: 'general' },
];

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TransformState {
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  zoom: number;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  dimensions: ImageDimensions | null;
  cropArea: CropArea;
  transform: TransformState;
  resultBlob: Blob | null;
  resultUrl: string | null;
  status: CropStatus;
  error: string | null;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isSupportedFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExtensions = /\.(jpe?g|png|webp)$/i;
  return allowedTypes.includes(file.type) || allowedExtensions.test(file.name);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getInitialCropArea(imageWidth: number, imageHeight: number, aspectRatio: number): CropArea {
  if (aspectRatio === 0) {
    // Freeform - use 80% of image centered
    const width = imageWidth * 0.8;
    const height = imageHeight * 0.8;
    return {
      x: (imageWidth - width) / 2,
      y: (imageHeight - height) / 2,
      width,
      height,
    };
  }

  const imageRatio = imageWidth / imageHeight;
  let width: number, height: number;

  if (aspectRatio > imageRatio) {
    // Crop area is limited by height
    height = imageHeight * 0.9;
    width = height * aspectRatio;
  } else {
    // Crop area is limited by width
    width = imageWidth * 0.9;
    height = width / aspectRatio;
  }

  return {
    x: (imageWidth - width) / 2,
    y: (imageHeight - height) / 2,
    width,
    height,
  };
}

function applyPresetToCrop(preset: AspectRatioPreset | SocialPreset | GeneralPreset, imageWidth: number, imageHeight: number): CropArea {
  if ('ratio' in preset && preset.ratio === 0) {
    return getInitialCropArea(imageWidth, imageHeight, 0);
  }

  let aspectRatio: number;
  if ('ratio' in preset) {
    aspectRatio = preset.ratio;
  } else {
    aspectRatio = preset.width / preset.height;
  }

  const crop = getInitialCropArea(imageWidth, imageHeight, aspectRatio);

  // If it's a dimension preset, try to use exact dimensions if they fit
  if ('width' in preset && 'height' in preset && preset.width && preset.height) {
    const scale = Math.min(imageWidth / preset.width, imageHeight / preset.height);
    if (scale >= 1) {
      // Image is larger than preset, use preset dimensions
      return {
        x: (imageWidth - preset.width) / 2,
        y: (imageHeight - preset.height) / 2,
        width: preset.width,
        height: preset.height,
      };
    }
  }

  return crop;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function outputFilename(base: string, format: ImageOutputFormat): string {
  const cleaned = base.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\.[^.]+$/, '') || 'image-cropped';
  return `${cleaned}.${getImageExtension(format)}`;
}

function dimensionsLabel(dimensions: ImageDimensions | null): string {
  return dimensions ? `${dimensions.width.toLocaleString()} × ${dimensions.height.toLocaleString()} px` : 'Reading dimensions…';
}

function getReduction(original: number, compressed: number): number {
  return ((original - compressed) / original) * 100;
}

export default function ImageCropper() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [supportedFormats] = useState<ImageOutputFormat[]>(() => getSupportedImageFormats());
  const [format, setFormat] = useState<ImageOutputFormat>(() => {
    const available = getSupportedImageFormats();
    return available.includes('webp') ? 'webp' : available[0] ?? 'jpeg';
  });
  const [quality, setQuality] = useState(90);
  const [customFilename, setCustomFilename] = useState('image-cropped');
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'aspect' | 'social' | 'general' | 'custom'>('aspect');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('free');
  const [customWidth, setCustomWidth] = useState(0);
  const [customHeight, setCustomHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef(new Set<string>());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction state
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cropStart, setCropStart] = useState<CropArea | null>(null);

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
  }, []);

  const createManagedUrl = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  };

  const revokeManagedUrl = (url: string | null) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  };

  const addFiles = async (fileList: FileList | File[]) => {
    if (processing) return;
    setMessage(null);
    const selected = Array.from(fileList);
    if (images.length + selected.length > MAX_FILES) {
      setMessage({ text: `Choose up to ${MAX_FILES} image at a time.`, kind: 'error' });
      return;
    }

    for (const file of selected) {
      if (!isSupportedFile(file)) {
        setMessage({ text: `${file.name}: choose a JPEG, PNG or WEBP image.`, kind: 'error' });
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setMessage({ text: `${file.name} is larger than the 30 MB per-image limit.`, kind: 'error' });
        continue;
      }

      const previewUrl = createManagedUrl(file);
      try {
        const dimensions = await readImageDimensions(file);
        if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
          revokeManagedUrl(previewUrl);
          setMessage({ text: `${file.name} has more than 80 million pixels and may exceed browser memory limits.`, kind: 'error' });
          continue;
        }
        const initialCrop = getInitialCropArea(dimensions.width, dimensions.height, 0);
        setImages((current) => [...current, {
          id: newId(),
          file,
          previewUrl,
          dimensions,
          cropArea: initialCrop,
          transform: { rotation: 0, flipX: false, flipY: false, zoom: 1 },
          resultBlob: null,
          resultUrl: null,
          status: 'ready',
          error: null,
        }]);
      } catch {
        revokeManagedUrl(previewUrl);
        setMessage({ text: `${file.name} could not be decoded. It may be damaged or unsupported.`, kind: 'error' });
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    const item = images.find((image) => image.id === id);
    if (item) {
      revokeManagedUrl(item.previewUrl);
      revokeManagedUrl(item.resultUrl);
    }
    setImages((current) => current.filter((image) => image.id !== id));
  };

  const clearResults = () => {
    setImages((current) => current.map((image) => {
      revokeManagedUrl(image.resultUrl);
      return { ...image, resultBlob: null, resultUrl: null, status: 'ready', error: null };
    }));
  };

  const updateCropArea = useCallback((id: string, cropArea: Partial<CropArea>) => {
    setImages((current) => current.map((image) => {
      if (image.id !== id) return image;
      const dims = image.dimensions;
      if (!dims) return image;
      
      const newCrop = { ...image.cropArea, ...cropArea };
      
      // Constrain to image boundaries
      newCrop.x = clamp(newCrop.x, 0, dims.width - newCrop.width);
      newCrop.y = clamp(newCrop.y, 0, dims.height - newCrop.height);
      newCrop.width = clamp(newCrop.width, 1, dims.width - newCrop.x);
      newCrop.height = clamp(newCrop.height, 1, dims.height - newCrop.y);
      
      return { ...image, cropArea: newCrop };
    }));
  }, []);

  const updateTransform = useCallback((id: string, transform: Partial<TransformState>) => {
    setImages((current) => current.map((image) => {
      if (image.id !== id) return image;
      return { ...image, transform: { ...image.transform, ...transform } };
    }));
  }, []);

  const handleCropMouseDown = (event: React.MouseEvent | React.TouchEvent, handle: string) => {
    const image = images[0];
    if (!image || !image.dimensions) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    setIsDraggingCrop(true);
    setDragHandle(handle);
    setDragStart({ x: clientX, y: clientY });
    setCropStart({ ...image.cropArea });
  };

  const handleCropMouseMoveNative = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDraggingCrop || !dragHandle || !dragStart || !cropStart) return;
    
    const image = images[0];
    if (!image || !image.dimensions) return;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    // We need to convert screen deltas to image coordinates
    // This requires knowing the displayed image size and position
    const img = imageRef.current;
    if (!img) return;
    
    const imgRect = img.getBoundingClientRect();
    
    const scaleX = image.dimensions.width / imgRect.width;
    const scaleY = image.dimensions.height / imgRect.height;
    
    const imageDeltaX = deltaX * scaleX;
    const imageDeltaY = deltaY * scaleY;
    
    let newCrop = { ...cropStart };
    
    switch (dragHandle) {
      case 'move':
        newCrop.x = cropStart.x + imageDeltaX;
        newCrop.y = cropStart.y + imageDeltaY;
        break;
      case 'nw':
        newCrop.x = cropStart.x + imageDeltaX;
        newCrop.y = cropStart.y + imageDeltaY;
        newCrop.width = cropStart.width - imageDeltaX;
        newCrop.height = cropStart.height - imageDeltaY;
        break;
      case 'n':
        newCrop.y = cropStart.y + imageDeltaY;
        newCrop.height = cropStart.height - imageDeltaY;
        break;
      case 'ne':
        newCrop.y = cropStart.y + imageDeltaY;
        newCrop.width = cropStart.width + imageDeltaX;
        newCrop.height = cropStart.height - imageDeltaY;
        break;
      case 'e':
        newCrop.width = cropStart.width + imageDeltaX;
        break;
      case 'se':
        newCrop.width = cropStart.width + imageDeltaX;
        newCrop.height = cropStart.height + imageDeltaY;
        break;
      case 's':
        newCrop.height = cropStart.height + imageDeltaY;
        break;
      case 'sw':
        newCrop.x = cropStart.x + imageDeltaX;
        newCrop.width = cropStart.width - imageDeltaX;
        newCrop.height = cropStart.height + imageDeltaY;
        break;
      case 'w':
        newCrop.x = cropStart.x + imageDeltaX;
        newCrop.width = cropStart.width - imageDeltaX;
        break;
    }
    
    // Apply aspect ratio lock if enabled
    if (lockAspect && dragHandle !== 'move' && selectedAspectRatio !== 'free') {
      const aspect = ASPECT_RATIOS.find(r => r.id === selectedAspectRatio)?.ratio || (newCrop.width / newCrop.height);
      if (aspect > 0) {
        if (['nw', 'n', 'ne', 'sw', 's', 'se'].includes(dragHandle)) {
          // Height changed, adjust width
          newCrop.width = newCrop.height * aspect;
        } else {
          // Width changed, adjust height
          newCrop.height = newCrop.width / aspect;
        }
      }
    }
    
    // Constrain to image boundaries
    newCrop.x = clamp(newCrop.x, 0, image.dimensions.width - newCrop.width);
    newCrop.y = clamp(newCrop.y, 0, image.dimensions.height - newCrop.height);
    newCrop.width = clamp(newCrop.width, 10, image.dimensions.width - newCrop.x);
    newCrop.height = clamp(newCrop.height, 10, image.dimensions.height - newCrop.y);
    
    updateCropArea(image.id, newCrop);
  }, [isDraggingCrop, dragHandle, dragStart, cropStart, lockAspect, selectedAspectRatio, images, updateCropArea]);

  const handleCropMouseUpNative = useCallback(() => {
    setIsDraggingCrop(false);
    setDragHandle(null);
    setDragStart(null);
    setCropStart(null);
  }, []);

  useEffect(() => {
    if (isDraggingCrop) {
      window.addEventListener('mousemove', handleCropMouseMoveNative);
      window.addEventListener('touchmove', handleCropMouseMoveNative, { passive: false });
      window.addEventListener('mouseup', handleCropMouseUpNative);
      window.addEventListener('touchend', handleCropMouseUpNative);
      return () => {
        window.removeEventListener('mousemove', handleCropMouseMoveNative);
        window.removeEventListener('touchmove', handleCropMouseMoveNative);
        window.removeEventListener('mouseup', handleCropMouseUpNative);
        window.removeEventListener('touchend', handleCropMouseUpNative);
      };
    }
  }, [isDraggingCrop, handleCropMouseMoveNative, handleCropMouseUpNative]);

  const handleAspectRatioChange = (aspectId: string) => {
    setSelectedAspectRatio(aspectId);
    const image = images[0];
    if (!image || !image.dimensions) return;
    
    const preset = ASPECT_RATIOS.find(r => r.id === aspectId);
    const newCrop = applyPresetToCrop(preset!, image.dimensions.width, image.dimensions.height);
    updateCropArea(image.id, newCrop);
    clearResults();
  };

  const handlePresetSelect = (preset: SocialPreset | GeneralPreset) => {
    const image = images[0];
    if (!image || !image.dimensions) return;
    
    const newCrop = applyPresetToCrop(preset, image.dimensions.width, image.dimensions.height);
    updateCropArea(image.id, newCrop);
    setSelectedAspectRatio('free'); // Allow free adjustment after preset
    clearResults();
  };

  const handleCustomDimensionChange = (width?: number, height?: number) => {
    const image = images[0];
    if (!image || !image.dimensions) return;
    
    let newWidth = width ?? customWidth;
    let newHeight = height ?? customHeight;
    
    if (lockAspect && customWidth > 0 && customHeight > 0) {
      const aspect = customWidth / customHeight;
      if (width !== undefined) {
        newHeight = Math.round(width / aspect);
      } else if (height !== undefined) {
        newWidth = Math.round(height * aspect);
      }
    }
    
    // Constrain to image boundaries
    newWidth = clamp(newWidth, 10, image.dimensions.width);
    newHeight = clamp(newHeight, 10, image.dimensions.height);
    
    const newCrop = {
      x: (image.dimensions.width - newWidth) / 2,
      y: (image.dimensions.height - newHeight) / 2,
      width: newWidth,
      height: newHeight,
    };
    
    setCustomWidth(newWidth);
    setCustomHeight(newHeight);
    updateCropArea(image.id, newCrop);
    clearResults();
  };

  const handleZoom = (delta: number) => {
    const image = images[0];
    if (!image) return;
    
    const newZoom = clamp(image.transform.zoom + delta, 0.1, 5);
    updateTransform(image.id, { zoom: newZoom });
  };

  const handleRotate = (degrees: number) => {
    const image = images[0];
    if (!image) return;
    
    const newRotation = (image.transform.rotation + degrees) % 360;
    updateTransform(image.id, { rotation: newRotation });
    
    // Swap crop dimensions on 90/270 rotation
    if (degrees === 90 || degrees === -90 || degrees === 270 || degrees === -270) {
      const { width, height } = image.cropArea;
      updateCropArea(image.id, { width: height, height: width });
    }
    clearResults();
  };

  const handleFlip = (axis: 'x' | 'y') => {
    const image = images[0];
    if (!image) return;
    
    if (axis === 'x') {
      updateTransform(image.id, { flipX: !image.transform.flipX });
    } else {
      updateTransform(image.id, { flipY: !image.transform.flipY });
    }
    clearResults();
  };

  const handleResetTransform = () => {
    const image = images[0];
    if (!image || !image.dimensions) return;
    
    updateTransform(image.id, { rotation: 0, flipX: false, flipY: false, zoom: 1 });
    const initialCrop = getInitialCropArea(image.dimensions.width, image.dimensions.height, 0);
    updateCropArea(image.id, initialCrop);
    clearResults();
  };

  const cropImage = async (image: ImageItem): Promise<Blob> => {
    if (!image.dimensions) throw new Error('Image dimensions are unavailable.');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas processing is unavailable.');
    
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Failed to decode image.'));
      i.src = image.previewUrl;
    });
    
    // Apply crop
    const { x, y, width, height } = image.cropArea;
    
    // Calculate output dimensions based on crop area
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((image.transform.rotation * Math.PI) / 180);
    ctx.scale(image.transform.flipX ? -1 : 1, image.transform.flipY ? -1 : 1);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // Draw the cropped portion
    ctx.drawImage(
      img,
      x, y, width, height,
      0, 0, canvas.width, canvas.height
    );
    ctx.restore();
    
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const qualityValue = format === 'png' ? undefined : quality / 100;
    
    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob(resolve, mime, qualityValue);
    });
    
    if (!blob) throw new Error('Encoding failed.');
    return blob;
  };

  const processAll = async () => {
    if (images.length === 0 || processing) return;
    
    const queue = [...images];
    queue.forEach((image) => revokeManagedUrl(image.resultUrl));
    setImages((current) => current.map((image) => ({
      ...image,
      resultBlob: null,
      resultUrl: null,
      status: 'cropping',
      error: null,
    })));
    setProcessing(true);
    setProgress({ done: 0, total: queue.length });
    setMessage(null);

    let successes = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const image = queue[index];
      try {
        const resultBlob = await cropImage(image);
        const resultUrl = createManagedUrl(resultBlob);
        setImages((current) => current.map((item) => item.id === image.id
          ? { ...item, resultBlob, resultUrl, status: 'done', error: null }
          : item));
        successes += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Cropping failed. Try another image or format.';
        setImages((current) => current.map((item) => item.id === image.id
          ? { ...item, status: 'error', error: errorMessage }
          : item));
      }
      setProgress({ done: index + 1, total: queue.length });
    }

    setProcessing(false);
    setMessage({
      text: successes === queue.length
        ? `${successes} ${successes === 1 ? 'image' : 'images'} cropped successfully.`
        : `${successes} of ${queue.length} images cropped. Review the errors below and retry as needed.`,
      kind: successes > 0 ? 'success' : 'error',
    });
  };

  const downloadImage = (image: ImageItem, index: number) => {
    if (!image.resultBlob) return;
    const base = index === 0 && images.length === 1
      ? customFilename
      : `${image.file.name.replace(/\.[^.]+$/, '')}-cropped`;
    try {
      downloadBlob(image.resultBlob, outputFilename(base, format));
    } catch {
      setMessage({ text: 'The download could not be started. Check browser download permissions and try again.', kind: 'error' });
    }
  };

  const resetSettings = () => {
    clearResults();
    setQuality(90);
    setFormat(supportedFormats.includes('webp') ? 'webp' : supportedFormats[0] ?? 'jpeg');
    setCustomFilename('image-cropped');
    setSelectedAspectRatio('free');
    setCustomWidth(0);
    setCustomHeight(0);
    setLockAspect(true);
    setMessage({ text: 'Crop settings reset.', kind: 'success' });
    
    const image = images[0];
    if (image && image.dimensions) {
      const initialCrop = getInitialCropArea(image.dimensions.width, image.dimensions.height, 0);
      updateCropArea(image.id, initialCrop);
      updateTransform(image.id, { rotation: 0, flipX: false, flipY: false, zoom: 1 });
    }
  };

  const image = images[0];
  const firstDimensions = image?.dimensions;

  return (
    <div className="image-cropper">
      <section className="image-cropper__upload" aria-labelledby="image-upload-title">
        <div className="image-cropper__section-heading">
          <div>
            <span className="image-cropper__eyebrow">01 / Select image</span>
            <h2 id="image-upload-title">Drop image here</h2>
            <p>JPEG, PNG and WEBP · Up to 30 MB · One image at a time</p>
          </div>
          <span className="image-cropper__local-badge"><Check size={14} /> Local processing</span>
        </div>
        <div
          className={`image-cropper__dropzone${dragging ? ' image-cropper__dropzone--active' : ''}${processing ? ' image-cropper__dropzone--disabled' : ''}`}
          onDragOver={(event) => { event.preventDefault(); if (!processing) setDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addFiles(event.dataTransfer.files);
          }}
        >
          <div className="image-cropper__upload-icon"><Upload size={23} /></div>
          <div>
            <strong>Drag and drop an image to begin</strong>
            <span>or browse from your device</span>
          </div>
          <button type="button" className="image-cropper__button image-cropper__button--secondary" onClick={() => inputRef.current?.click()} disabled={processing}>
            <ImageIcon size={16} /> Browse files
          </button>
          <input
            ref={inputRef}
            className="image-cropper__file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            aria-label="Choose image to crop"
            onChange={(event) => { if (event.target.files) void addFiles(event.target.files); }}
          />
        </div>
      </section>

      {message && (
        <div className={`image-cropper__message image-cropper__message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
          <span>{message.text}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}><X size={15} /></button>
        </div>
      )}

      {image && firstDimensions && (
        <div className="image-cropper__workspace">
          <section className="image-cropper__crop-area" aria-labelledby="crop-area-title" ref={containerRef}>
            <div className="image-cropper__section-heading">
              <div>
                <span className="image-cropper__eyebrow">02 / Crop</span>
                <h2 id="crop-area-title">Adjust crop area</h2>
              </div>
              <div className="image-cropper__zoom-controls">
                <button type="button" className="image-cropper__icon-button" onClick={() => handleZoom(-0.1)} aria-label="Zoom out" disabled={processing}><Minimize size={16} /></button>
                <span className="image-cropper__zoom-level">{Math.round((image.transform.zoom || 1) * 100)}%</span>
                <button type="button" className="image-cropper__icon-button" onClick={() => handleZoom(0.1)} aria-label="Zoom in" disabled={processing}><Maximize size={16} /></button>
              </div>
            </div>

            <div className="image-cropper__canvas-wrapper">
              <canvas
                ref={canvasRef}
                className="image-cropper__canvas"
                width={firstDimensions.width}
                height={firstDimensions.height}
              />
              <img
                ref={imageRef}
                src={image.previewUrl}
                alt={`Original ${image.file.name}`}
                className="image-cropper__image"
                style={{
                  transform: `rotate(${image.transform.rotation}deg) scaleX(${image.transform.flipX ? -1 : 1}) scaleY(${image.transform.flipY ? -1 : 1})`,
                  transformOrigin: 'center center',
                }}
              />
              <div
                ref={cropOverlayRef}
                className="image-cropper__crop-overlay"
                style={{
                  left: image.cropArea.x,
                  top: image.cropArea.y,
                  width: image.cropArea.width,
                  height: image.cropArea.height,
                }}
              >
                <div className="image-cropper__crop-inner" />
                <div className="image-cropper__handle image-cropper__handle--nw" onMouseDown={(e) => handleCropMouseDown(e, 'nw')} onTouchStart={(e) => handleCropMouseDown(e, 'nw')} aria-label="Resize northwest" role="slider" tabIndex={0} />
                <div className="image-cropper__handle image-cropper__handle--n" onMouseDown={(e) => handleCropMouseDown(e, 'n')} onTouchStart={(e) => handleCropMouseDown(e, 'n')} aria-label="Resize north" role="slider" tabIndex={0} />
                <div className="image-cropper__handle image-cropper__handle--ne" onMouseDown={(e) => handleCropMouseDown(e, 'ne')} onTouchStart={(e) => handleCropMouseDown(e, 'ne')} aria-label="Resize northeast" role="slider" tabIndex={0} />
                <div className="image-cropper__handle image-cropper__handle--e" onMouseDown={(e) => handleCropMouseDown(e, 'e')} onTouchStart={(e) => handleCropMouseDown(e, 'e')} aria-label="Resize east" role="slider" tabIndex={0} />
                <div className="image-cropper__handle image-cropper__handle--se" onMouseDown={(e) => handleCropMouseDown(e, 'se')} onTouchStart={(e) => handleCropMouseDown(e, 'se')} aria-label="Resize southeast" role="slider" tabIndex={0} />
                <div className="image-cropper__handle image-cropper__handle--s" onMouseDown={(e) => handleCropMouseDown(e, 's')} onTouchStart={(e) => handleCropMouseDown(e, 's')} aria-label="Resize south" role="slider" tabIndex={0} />
                <div className="image-cropper__handle image-cropper__handle--sw" onMouseDown={(e) => handleCropMouseDown(e, 'sw')} onTouchStart={(e) => handleCropMouseDown(e, 'sw')} aria-label="Resize southwest" role="slider" tabIndex={0} />
                <div className="image-cropper__handle image-cropper__handle--w" onMouseDown={(e) => handleCropMouseDown(e, 'w')} onTouchStart={(e) => handleCropMouseDown(e, 'w')} aria-label="Resize west" role="slider" tabIndex={0} />
                <div className="image-cropper__handle image-cropper__handle--move" onMouseDown={(e) => handleCropMouseDown(e, 'move')} onTouchStart={(e) => handleCropMouseDown(e, 'move')} aria-label="Move crop area" role="slider" tabIndex={0}>
                  <Move size={16} />
                </div>
              </div>
            </div>

            <div className="image-cropper__transform-controls">
              <button type="button" className="image-cropper__icon-button" onClick={() => handleRotate(-90)} aria-label="Rotate counterclockwise" disabled={processing}><RotateCcw size={16} /></button>
              <button type="button" className="image-cropper__icon-button" onClick={() => handleRotate(90)} aria-label="Rotate clockwise" disabled={processing}><RotateCw size={16} /></button>
              <button type="button" className="image-cropper__icon-button" onClick={() => handleFlip('x')} aria-label="Flip horizontally" disabled={processing}><FlipHorizontal size={16} /></button>
              <button type="button" className="image-cropper__icon-button" onClick={() => handleFlip('y')} aria-label="Flip vertically" disabled={processing}><FlipVertical size={16} /></button>
              <button type="button" className="image-cropper__reset" onClick={handleResetTransform} disabled={processing}><RotateCcw size={15} /> Reset all</button>
            </div>

            <div className="image-cropper__crop-info">
              <span>Crop: {Math.round(image.cropArea.width)} × {Math.round(image.cropArea.height)} px</span>
              <span>Position: {Math.round(image.cropArea.x)}, {Math.round(image.cropArea.y)}</span>
            </div>
          </section>

          <aside className="image-cropper__settings" aria-labelledby="image-settings-title">
            <div className="image-cropper__section-heading image-cropper__section-heading--compact">
              <div>
                <span className="image-cropper__eyebrow">03 / Presets</span>
                <h2 id="image-settings-title">Aspect ratio & presets</h2>
              </div>
            </div>

            <div className="image-cropper__tabs" role="tablist">
              <button role="tab" className={activeTab === 'aspect' ? 'image-cropper__tab image-cropper__tab--active' : 'image-cropper__tab'} onClick={() => setActiveTab('aspect')}>Aspect Ratios</button>
              <button role="tab" className={activeTab === 'social' ? 'image-cropper__tab image-cropper__tab--active' : 'image-cropper__tab'} onClick={() => setActiveTab('social')}>Social Media</button>
              <button role="tab" className={activeTab === 'general' ? 'image-cropper__tab image-cropper__tab--active' : 'image-cropper__tab'} onClick={() => setActiveTab('general')}>General</button>
              <button role="tab" className={activeTab === 'custom' ? 'image-cropper__tab image-cropper__tab--active' : 'image-cropper__tab'} onClick={() => setActiveTab('custom')}>Custom</button>
            </div>

            {activeTab === 'aspect' && (
              <div className="image-cropper__field">
                <span className="image-cropper__label">Aspect ratio</span>
                <div className="image-cropper__presets" role="group" aria-label="Aspect ratio presets">
                  {ASPECT_RATIOS.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={selectedAspectRatio === item.id ? 'image-cropper__preset image-cropper__preset--active' : 'image-cropper__preset'}
                      aria-pressed={selectedAspectRatio === item.id}
                      disabled={processing}
                      onClick={() => handleAspectRatioChange(item.id)}
                    >
                      <strong>{item.label}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'social' && (
              <div className="image-cropper__field">
                <span className="image-cropper__label">Social media presets</span>
                <div className="image-cropper__preset-list" role="group" aria-label="Social media presets">
                  {SOCIAL_PRESETS.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="image-cropper__preset-item"
                      disabled={processing}
                      onClick={() => handlePresetSelect(item)}
                    >
                      <div className="image-cropper__preset-info">
                        <strong>{item.label}</strong>
                        <span>{item.width} × {item.height} px · {item.aspectRatio}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="image-cropper__field">
                <span className="image-cropper__label">General presets</span>
                <div className="image-cropper__preset-list" role="group" aria-label="General presets">
                  {GENERAL_PRESETS.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="image-cropper__preset-item"
                      disabled={processing}
                      onClick={() => handlePresetSelect(item)}
                    >
                      <div className="image-cropper__preset-info">
                        <strong>{item.label}</strong>
                        <span>{item.width} × {item.height} px · {item.aspectRatio}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'custom' && (
              <div className="image-cropper__field">
                <span className="image-cropper__label">Custom dimensions</span>
                <div className="image-cropper__dimension-grid">
                  <div>
                    <label htmlFor="crop-width">Width (px)</label>
                    <input id="crop-width" type="number" min="1" max={firstDimensions?.width || 12000} step="1" value={customWidth || ''} disabled={processing} onChange={(event) => {
                      const val = Number(event.target.value);
                      if (val > 0) handleCustomDimensionChange(val, undefined);
                    }} />
                  </div>
                  <div>
                    <label htmlFor="crop-height">Height (px)</label>
                    <input id="crop-height" type="number" min="1" max={firstDimensions?.height || 12000} step="1" value={customHeight || ''} disabled={processing} onChange={(event) => {
                      const val = Number(event.target.value);
                      if (val > 0) handleCustomDimensionChange(undefined, val);
                    }} />
                  </div>
                </div>
                <label className="image-cropper__check" htmlFor="crop-lock-aspect">
                  <input id="crop-lock-aspect" type="checkbox" checked={lockAspect} disabled={processing} onChange={(event) => { setLockAspect(event.target.checked); clearResults(); }} />
                  <span>Maintain aspect ratio</span>
                </label>
                <p className="image-cropper__hint">Original: {dimensionsLabel(firstDimensions)}</p>
              </div>
            )}

            <div className="image-cropper__field">
              <label htmlFor="crop-output-format">Output format</label>
              <select id="crop-output-format" value={format} disabled={processing} onChange={(event) => { clearResults(); setFormat(event.target.value as ImageOutputFormat); }}>
                {supportedFormats.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
              </select>
              {format === 'jpeg' && <p className="image-cropper__hint">JPEG does not support transparency. Transparent areas are filled with white.</p>}
              {format === 'png' && <p className="image-cropper__hint">PNG is lossless; the quality slider does not reduce its size like JPEG or WEBP.</p>}
              {format !== 'png' && <p className="image-cropper__hint">Converting formats may change color, transparency or image detail.</p>}
            </div>

            {format !== 'png' && (
              <div className="image-cropper__field">
                <div className="image-cropper__range-heading">
                  <label htmlFor="crop-quality">Quality</label>
                  <output htmlFor="crop-quality">{quality}%</output>
                </div>
                <input id="crop-quality" type="range" min="1" max="100" value={quality} disabled={processing} onChange={(event) => { clearResults(); setQuality(Number(event.target.value)); }} />
                <div className="image-cropper__range-labels"><span>Smaller file</span><span>Higher quality</span></div>
              </div>
            )}

            <div className="image-cropper__field">
              <label htmlFor="crop-custom-name">Download filename</label>
              <div className="image-cropper__filename-control">
                <input id="crop-custom-name" type="text" value={customFilename} disabled={processing} onChange={(event) => setCustomFilename(event.target.value)} aria-describedby="crop-filename-hint" />
                <span>.{getImageExtension(format)}</span>
              </div>
              <p id="crop-filename-hint" className="image-cropper__hint">Used when downloading the cropped image.</p>
            </div>

            <div className="image-cropper__settings-actions">
              <button type="button" className="image-cropper__button image-cropper__button--primary" onClick={() => void processAll()} disabled={!images.length || processing}>
                {processing ? <LoaderCircle className="image-cropper__spinner" size={17} /> : <Check size={17} />}
                {processing ? 'Cropping…' : 'Crop image'}
              </button>
              <button type="button" className="image-cropper__reset" onClick={resetSettings} disabled={processing}><RotateCcw size={15} /> Reset settings</button>
            </div>
          </aside>
        </div>
      )}

      <section className="image-cropper__results" aria-labelledby="image-results-title">
        <div className="image-cropper__results-heading">
          <div>
            <span className="image-cropper__eyebrow">04 / Result</span>
            <h2 id="image-results-title">Cropped preview</h2>
          </div>
        </div>

        {processing && (
          <div className="image-cropper__progress" role="status" aria-live="polite">
            <div><LoaderCircle className="image-cropper__spinner" size={16} /><span>Processing image {progress.done + 1} of {progress.total}</span><strong>{progress.done}/{progress.total}</strong></div>
            <progress max={progress.total} value={progress.done} aria-label="Cropping progress" />
          </div>
        )}

        {images.length === 0 ? (
          <div className="image-cropper__empty">
            <div className="image-cropper__empty-art"><ImageIcon size={30} /></div>
            <strong>Your cropped image appears here</strong>
            <p>Add an image and adjust the crop area to see the result.</p>
          </div>
        ) : (
          <div className="image-cropper__image-list">
            {images.map((img, index) => (
              <article className="image-cropper__image-result" key={img.id}>
                <div className="image-cropper__file-heading">
                  <div className="image-cropper__file-icon"><ImageIcon size={18} /></div>
                  <div className="image-cropper__file-name"><strong title={img.file.name}>{img.file.name}</strong><span>{formatFileSize(img.file.size)} · {dimensionsLabel(img.dimensions)}</span></div>
                  <span className={`image-cropper__status image-cropper__status--${img.status}`}>
                    {img.status === 'cropping' ? <LoaderCircle className="image-cropper__spinner" size={13} /> : img.status === 'done' ? <Check size={13} /> : null}
                    {img.status === 'ready' ? 'Ready' : img.status === 'cropping' ? 'Working' : img.status === 'done' ? 'Complete' : 'Error'}
                  </span>
                  <button type="button" className="image-cropper__icon-button" aria-label={`Remove ${img.file.name}`} disabled={processing} onClick={() => removeImage(img.id)}><Trash2 size={16} /></button>
                </div>

                {img.error && <p className="image-cropper__error" role="alert">{img.error}</p>}

                {img.resultUrl && img.resultBlob ? (
                  <>
                    <div className="image-cropper__comparison">
                      <div className="image-cropper__image-panel">
                        <div className="image-cropper__panel-label"><span>Original</span><span>{formatFileSize(img.file.size)}</span></div>
                        <div className="image-cropper__preview"><img src={img.previewUrl} alt={`Original ${img.file.name}`} /></div>
                        <span className="image-cropper__dimensions">{dimensionsLabel(img.dimensions)} · {(img.file.type.split('/')[1] || img.file.name.split('.').pop() || '').toUpperCase()}</span>
                      </div>
                      <div className="image-cropper__image-panel">
                        <div className="image-cropper__panel-label"><span>Cropped</span><span>{formatFileSize(img.resultBlob.size)}</span></div>
                        <div className="image-cropper__preview"><img src={img.resultUrl} alt={`Cropped ${img.file.name}`} /></div>
                        <span className="image-cropper__dimensions">{Math.round(img.cropArea.width)} × {Math.round(img.cropArea.height)} px · {format.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className={`image-cropper__saving${getReduction(img.file.size, img.resultBlob.size) < 0 ? ' image-cropper__saving--larger' : ''}`}>
                      <div>
                        <span className="image-cropper__saving-mark">{getReduction(img.file.size, img.resultBlob.size) < 0 ? '↑' : '↓'}</span>
                        <strong>{getReduction(img.file.size, img.resultBlob.size) < 0 ? `${Math.abs(getReduction(img.file.size, img.resultBlob.size)).toFixed(1)}% larger` : `${getReduction(img.file.size, img.resultBlob.size).toFixed(1)}% smaller`}</strong>
                        <span>{getReduction(img.file.size, img.resultBlob.size) < 0 ? `${formatFileSize(img.resultBlob.size - img.file.size)} added` : `${formatFileSize(img.file.size - img.resultBlob.size)} saved`}</span>
                      </div>
                      <button type="button" className="image-cropper__button image-cropper__button--secondary" onClick={() => downloadImage(img, index)}><ArrowDownToLine size={15} /> Download</button>
                    </div>
                  </>
                ) : (
                  <div className="image-cropper__queued-preview">
                    <img src={img.previewUrl} alt={`Preview of ${img.file.name}`} />
                    <div><strong>{img.status === 'error' ? 'Cropping needs attention' : 'Ready to crop'}</strong><span>Output will be {format.toUpperCase()} at {quality}% quality.</span></div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}