export interface RgbaColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export interface HslColor {
  hue: number;
  saturation: number;
  lightness: number;
}

export interface HsvColor {
  hue: number;
  saturation: number;
  value: number;
}

export const MAX_IMAGE_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;

export function isSupportedImageFile(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    || /\.(jpe?g|png|webp)$/i.test(file.name);
}

export function loadImageFile(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  return new Promise((resolve, reject) => {
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The image could not be decoded.'));
    };
    image.src = url;
  });
}

export function rgbToHex(color: RgbaColor): string {
  return `#${[color.red, color.green, color.blue]
    .map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function formatRgb(color: RgbaColor): string {
  return `rgb(${Math.round(color.red)}, ${Math.round(color.green)}, ${Math.round(color.blue)})`;
}

export function formatRgba(color: RgbaColor): string {
  return `rgba(${Math.round(color.red)}, ${Math.round(color.green)}, ${Math.round(color.blue)}, ${(color.alpha / 255).toFixed(2)})`;
}

export function rgbToHsl(color: RgbaColor): HslColor {
  const r = color.red / 255;
  const g = color.green / 255;
  const b = color.blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const difference = max - min;
  let h = 0;
  if (difference !== 0) {
    if (max === r) h = ((g - b) / difference) % 6;
    else if (max === g) h = (b - r) / difference + 2;
    else h = (r - g) / difference + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = difference === 0 ? 0 : difference / (1 - Math.abs(2 * l - 1));
  return { hue: h, saturation: s, lightness: l };
}

export function formatHsl(color: RgbaColor): string {
  const hsl = rgbToHsl(color);
  return `hsl(${Math.round(hsl.hue)}deg, ${Math.round(hsl.saturation * 100)}%, ${Math.round(hsl.lightness * 100)}%)`;
}

export function rgbToHsv(color: RgbaColor): HsvColor {
  const r = color.red / 255;
  const g = color.green / 255;
  const b = color.blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const difference = max - min;
  let h = 0;
  if (difference !== 0) {
    if (max === r) h = ((g - b) / difference) % 6;
    else if (max === g) h = (b - r) / difference + 2;
    else h = (r - g) / difference + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { hue: h, saturation: max === 0 ? 0 : difference / max, value: max };
}

export function formatHsv(color: RgbaColor): string {
  const hsv = rgbToHsv(color);
  return `hsv(${Math.round(hsv.hue)}deg, ${Math.round(hsv.saturation * 100)}%, ${Math.round(hsv.value * 100)}%)`;
}

export function extractDominantColors(canvas: HTMLCanvasElement, count = 10): RgbaColor[] {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];

  const maxDimension = 180;
  const scale = Math.min(1, maxDimension / Math.max(canvas.width, canvas.height));
  const sampleWidth = Math.max(1, Math.round(canvas.width * scale));
  const sampleHeight = Math.max(1, Math.round(canvas.height * scale));
  const sample = document.createElement('canvas');
  sample.width = sampleWidth;
  sample.height = sampleHeight;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) return [];
  sampleContext.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);

  const data = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const histogram = new Map<string, { red: number; green: number; blue: number; alpha: number; count: number }>();

  for (let index = 0; index < data.length; index += 16) {
    const alpha = data[index + 3];
    if (alpha < 32) continue;
    const red = data[index] >> 4;
    const green = data[index + 1] >> 4;
    const blue = data[index + 2] >> 4;
    const key = `${red},${green},${blue}`;
    const bucket = histogram.get(key);
    if (bucket) {
      bucket.red += data[index];
      bucket.green += data[index + 1];
      bucket.blue += data[index + 2];
      bucket.alpha += alpha;
      bucket.count += 1;
    } else {
      histogram.set(key, {
        red: data[index],
        green: data[index + 1],
        blue: data[index + 2],
        alpha,
        count: 1,
      });
    }
  }

  const bins = [...histogram.values()].sort((a, b) => b.count - a.count).slice(0, 700);
  if (bins.length === 0) return [];

  const clusterCount = Math.min(count, bins.length);
  const points = bins.map((bin) => ({
    red: bin.red / bin.count,
    green: bin.green / bin.count,
    blue: bin.blue / bin.count,
    alpha: bin.alpha / bin.count,
  }));
  const weights = bins.map((bin) => bin.count);

  const clusters: RgbaColor[] = [];
  const first = bins[0];
  clusters.push({ red: first.red / first.count, green: first.green / first.count, blue: first.blue / first.count, alpha: first.alpha / first.count });

  while (clusters.length < clusterCount) {
    let selectedIndex = 0;
    let selectedDistance = -1;
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const nearest = Math.min(...clusters.map((cluster) => {
        const dr = point.red - cluster.red;
        const dg = point.green - cluster.green;
        const db = point.blue - cluster.blue;
        return dr * dr + dg * dg + db * db;
      }));
      const score = nearest * weights[index];
      if (score > selectedDistance) {
        selectedDistance = score;
        selectedIndex = index;
      }
    }
    clusters.push({ ...points[selectedIndex] });
  }

  const memberships = new Array<number>(points.length).fill(0);
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const sums = clusters.map(() => ({ red: 0, green: 0, blue: 0, alpha: 0, weight: 0 }));
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex += 1) {
        const cluster = clusters[clusterIndex];
        const dr = point.red - cluster.red;
        const dg = point.green - cluster.green;
        const db = point.blue - cluster.blue;
        const distance = dr * dr + dg * dg + db * db;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = clusterIndex;
        }
      }
      memberships[index] = nearest;
      const weight = weights[index];
      sums[nearest].red += point.red * weight;
      sums[nearest].green += point.green * weight;
      sums[nearest].blue += point.blue * weight;
      sums[nearest].alpha += point.alpha * weight;
      sums[nearest].weight += weight;
    }
    for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex += 1) {
      const sum = sums[clusterIndex];
      if (sum.weight > 0) {
        clusters[clusterIndex] = {
          red: sum.red / sum.weight,
          green: sum.green / sum.weight,
          blue: sum.blue / sum.weight,
          alpha: sum.alpha / sum.weight,
        };
      }
    }
  }

  const clusterWeights = clusters.map((_, index) => memberships.reduce(
    (total, membership, pointIndex) => total + (membership === index ? weights[pointIndex] : 0),
    0,
  ));
  return clusters
    .map((color, index) => ({ color, weight: clusterWeights[index] }))
    .sort((a, b) => b.weight - a.weight)
    .map(({ color }) => ({
      red: Math.round(color.red),
      green: Math.round(color.green),
      blue: Math.round(color.blue),
      alpha: 255,
    }));
}
