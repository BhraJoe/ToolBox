import type { RgbaColor } from './imageColorPicker';

export interface PalettePoint {
  color: RgbaColor;
  weight: number;
}

export function extractPalette(
  canvas: HTMLCanvasElement,
  count: number,
  seed = 1,
): PalettePoint[] {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];

  const maxDimension = 220;
  const scale = Math.min(1, maxDimension / Math.max(canvas.width, canvas.height));
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));
  const sample = document.createElement('canvas');
  sample.width = width;
  sample.height = height;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) return [];

  sampleContext.drawImage(canvas, 0, 0, width, height);
  const data = sampleContext.getImageData(0, 0, width, height).data;
  const histogram = new Map<string, { red: number; green: number; blue: number; weight: number }>();

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 16) continue;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const quantizedRed = red >> 4;
    const quantizedGreen = green >> 4;
    const quantizedBlue = blue >> 4;
    const key = `${quantizedRed},${quantizedGreen},${quantizedBlue}`;
    const bucket = histogram.get(key);
    if (bucket) {
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      bucket.weight += 1;
    } else {
      histogram.set(key, { red, green, blue, weight: 1 });
    }
  }

  const points = [...histogram.values()]
    .map((bucket) => ({
      red: bucket.red / bucket.weight,
      green: bucket.green / bucket.weight,
      blue: bucket.blue / bucket.weight,
      alpha: 255,
      weight: bucket.weight,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 900);

  if (points.length === 0) return [];

  let state = seed >>> 0;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const distance = (a: RgbaColor, b: RgbaColor) => {
    const dr = a.red - b.red;
    const dg = a.green - b.green;
    const db = a.blue - b.blue;
    return dr * dr + dg * dg + db * db;
  };

  const clusterCount = Math.min(Math.max(2, count), points.length);
  const clusters: RgbaColor[] = [{ ...points[Math.floor(random() * points.length)] }];

  while (clusters.length < clusterCount) {
    let selected = 0;
    let bestScore = -1;
    for (let index = 0; index < points.length; index += 1) {
      const nearest = Math.min(...clusters.map((cluster) => distance(points[index], cluster)));
      const score = nearest * points[index].weight;
      if (score > bestScore) {
        bestScore = score;
        selected = index;
      }
    }
    clusters.push({ ...points[selected] });
  }

  const memberships = new Array<number>(points.length).fill(0);
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const totals = clusters.map(() => ({ red: 0, green: 0, blue: 0, weight: 0 }));
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const point = points[pointIndex];
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex += 1) {
        const candidateDistance = distance(point, clusters[clusterIndex]);
        if (candidateDistance < nearestDistance) {
          nearestDistance = candidateDistance;
          nearest = clusterIndex;
        }
      }
      memberships[pointIndex] = nearest;
      totals[nearest].red += point.red * point.weight;
      totals[nearest].green += point.green * point.weight;
      totals[nearest].blue += point.blue * point.weight;
      totals[nearest].weight += point.weight;
    }
    for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex += 1) {
      const total = totals[clusterIndex];
      if (total.weight > 0) {
        clusters[clusterIndex] = {
          red: total.red / total.weight,
          green: total.green / total.weight,
          blue: total.blue / total.weight,
          alpha: 255,
        };
      }
    }
  }

  const clusterWeights = clusters.map((_, clusterIndex) =>
    memberships.reduce(
      (total, membership, pointIndex) => total + (membership === clusterIndex ? points[pointIndex].weight : 0),
      0,
    ),
  );

  return clusters
    .map((color, index) => ({ color: {
      red: Math.round(color.red),
      green: Math.round(color.green),
      blue: Math.round(color.blue),
      alpha: 255,
    }, weight: clusterWeights[index] }))
    .sort((a, b) => b.weight - a.weight);
}

export function hexToRgb(hex: string): RgbaColor {
  const normalized = hex.trim().replace(/^#/, '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((character) => `${character}${character}`).join('')
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    throw new Error('Enter a valid 3- or 6-digit HEX color.');
  }
  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16),
    alpha: 255,
  };
}
