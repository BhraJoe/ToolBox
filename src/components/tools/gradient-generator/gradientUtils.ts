export type GradientType = 'linear' | 'radial';
export type RadialShape = 'circle' | 'ellipse';
export type RadialPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface ColorStop {
  id: number;
  color: string;
  position: number;
}

export const DEFAULT_COLOR_STOPS: ColorStop[] = [
  { id: 1, color: '#ff6b6b', position: 0 },
  { id: 2, color: '#4ecdc4', position: 100 },
];

export const INITIAL_CONFIG = {
  type: 'linear' as GradientType,
  angle: 135,
  shape: 'circle' as RadialShape,
  size: 'farthest-corner',
  position: 'center' as RadialPosition,
  stops: DEFAULT_COLOR_STOPS,
};

const PALETTE: string[] = [
  '#ff6b6b',
  '#ff8e53',
  '#ffd93d',
  '#6bcb77',
  '#4ecdc4',
  '#45aaf2',
  '#9d4edd',
  '#ff7eb3',
  '#a8e6cf',
  '#c9a0dc',
  '#6a4c93',
  '#00b894',
  '#fd79a8',
  '#e17055',
];



function normalizeHex(hex: string): string {
  if (!hex.startsWith('#')) hex = `#${hex}`;
  return hex.toUpperCase();
}

export function randomStopColor(): string {
  const hex = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return normalizeHex(hex);
}

export function randomPosition(): number {
  return Math.round((Math.random() * 100) / 5) * 5;
}

export interface PresetGradient {
  name: string;
  css: string;
  type: GradientType;
}

export const PRESET_GRADIENTS: PresetGradient[] = [
  {
    name: 'Sunset',
    css: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
    type: 'linear',
  },
  {
    name: 'Ocean',
    css: 'linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)',
    type: 'linear',
  },
  {
    name: 'Forest',
    css: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)',
    type: 'linear',
  },
  {
    name: 'Sunrise',
    css: 'linear-gradient(135deg, #ee7752 0%, #e73c7e 50%, #23a6d5 100%)',
    type: 'linear',
  },
  {
    name: 'Candy',
    css: 'radial-gradient(circle at 30% 30%, #ff9a9e 0%, #fad0c4 100%)',
    type: 'radial',
  },
  {
    name: 'Midnight',
    css: 'radial-gradient(circle at center, #0f0c29 0%, #302b63 100%)',
    type: 'radial',
  },
  {
    name: 'Peach',
    css: 'linear-gradient(135deg, #FFD3A5 0%, #FD578D 100%)',
    type: 'linear',
  },
  {
    name: 'Emerald',
    css: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
    type: 'linear',
  },
];

export function isPresetCss(value: string): boolean {
  return /^linear-gradient\(|radial-gradient\(/i.test(value);
}

export function parsePresetCss(value: string): { type: GradientType; rest: string } | null {
  const linearMatch = value.match(/^linear-gradient\s*\(/i);
  if (linearMatch) {
    return { type: 'linear', rest: value.slice(value.indexOf('(') + 1) };
  }
  const radialMatch = value.match(/^radial-gradient\s*\(/i);
  if (radialMatch) {
    return { type: 'radial', rest: value.slice(value.indexOf('(') + 1) };
  }
  return null;
}

function buildStopsString(stops: ColorStop[]): string {
  return [...stops]
    .sort((a, b) => a.position - b.position)
    .map((stop) => `${normalizeHex(stop.color)} ${Number(stop.position).toFixed(0)}%`)
    .join(', ');
}

function parseStopsFromCss(stopsString: string): ColorStop[] {
  return stopsString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => {
      const parts = s.split(/\s+/);
      const hex = parts[0]?.replace('#', '') || '';
      const color = validateHexColor(`#${hex}`) ? normalizeHex(`#${hex}`) : `#${hex}`;
      const positionPart = parts[1]?.replace('%', '');
      const position = positionPart ? Number(positionPart) : i * 100;
      return {
        id: Date.now() + i,
        color,
        position: Number.isFinite(position) ? clampPosition(position) ?? i * 100 : i * 100,
      };
    });
}

function parseLinearGradientCss(rest: string): { angle: number; stops: ColorStop[] } | null {
  const angleMatch = rest.match(/^(\d+(?:\.\d+)?)(?:deg)?/i);
  const angle = angleMatch ? Number(angleMatch[1]) : 135;
  const stopsMatch = rest.match(/deg,\s*(.+)\s*\)$/s);
  if (!stopsMatch) {
    const stopsMatch2 = rest.match(/,\s*(.+)\s*\)$/s);
    if (stopsMatch2) return { angle, stops: parseStopsFromCss(stopsMatch2[1]) };
    return { angle, stops: [] };
  }
  return { angle, stops: parseStopsFromCss(stopsMatch[1]) };
}

function parseRadialGradientCss(rest: string): {
  shape: RadialShape;
  size: string;
  position: RadialPosition;
  stops: ColorStop[];
} | null {
  const shapeMatch = rest.match(/^(circle|ellipse)/i);
  const shape = (shapeMatch ? shapeMatch[1].toLowerCase() : 'circle') as RadialShape;
  let remaining = rest.slice(shapeMatch ? shapeMatch[0].length : 0).trim();

  let size = 'farthest-corner';
  let position: RadialPosition = 'center';

  const atMatch = remaining.match(/^at\s+(.+)$/s);
  if (atMatch) {
    const atContent = atMatch[1].trim();
    const sizePositionMatch = atContent.match(/^(closest-side|closest-corner|farthest-side|farthest-corner)\s+(.+)$/i);
    if (sizePositionMatch) {
      size = sizePositionMatch[1].toLowerCase();
      remaining = sizePositionMatch[2].trim();
    } else {
      remaining = atContent;
    }

    const posMatch = remaining.match(/^(center|top|bottom|left|right)/i);
    position = (posMatch ? posMatch[1].toLowerCase() : 'center') as RadialPosition;
    remaining = remaining.slice(posMatch ? posMatch[0].length : 0).trim();
  } else {
    const sizeMatch = remaining.match(/^(closest-side|closest-corner|farthest-side|farthest-corner)\b/i);
    if (sizeMatch) {
      size = sizeMatch[1].toLowerCase();
      remaining = remaining.slice(sizeMatch[0].length).trim();
    }

    const posMatch = remaining.match(/^(center|top|bottom|left|right)\b/i);
    position = (posMatch ? posMatch[1].toLowerCase() : 'center') as RadialPosition;
    remaining = remaining.slice(posMatch ? posMatch[0].length : 0).trim();
  }

  const stopsString = remaining.replace(/\)$/, '').trim();
  return { shape, size, position, stops: parseStopsFromCss(stopsString) };
}

export function applyPresetToConfig(
  preset: PresetGradient,
  currentConfig: typeof INITIAL_CONFIG,
): typeof INITIAL_CONFIG {
  const parsed = parsePresetCss(preset.css);
  if (!parsed) return currentConfig;

  if (parsed.type === 'linear') {
    const parsedLinear = parseLinearGradientCss(parsed.rest);
    return {
      ...currentConfig,
      type: 'linear',
      angle: parsedLinear?.angle ?? 135,
      stops: parsedLinear?.stops ?? DEFAULT_COLOR_STOPS,
    };
  }

  const parsedRadial = parseRadialGradientCss(parsed.rest);
  return {
    ...currentConfig,
    type: 'radial',
    shape: parsedRadial?.shape ?? 'circle',
    size: parsedRadial?.size ?? 'farthest-corner',
    position: parsedRadial?.position ?? 'center',
    stops: parsedRadial?.stops ?? DEFAULT_COLOR_STOPS,
  };
}

export function buildGradientCss(config: {
  type: GradientType;
  angle: number;
  shape: RadialShape;
  size: string;
  position: RadialPosition;
  stops: ColorStop[];
}): string {
  const stops = buildStopsString(config.stops);

  if (config.type === 'linear') {
    const angle = Math.max(0, Math.min(360, config.angle));
    return `linear-gradient(${Math.round(angle)}deg, ${stops})`;
  }

  return `radial-gradient(${config.shape} ${config.size} ${config.position}, ${stops})`;
}

export function buildDownloadableCss(config: {
  type: GradientType;
  angle: number;
  shape: RadialShape;
  size: string;
  position: RadialPosition;
  stops: ColorStop[];
}): string {
  const declaration = buildGradientCss(config);
  return `.gradient-background {\n  background: ${declaration};\n}\n`;
}

export function validateHexColor(color: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(color);
}

export function parseHexInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!validateHexColor(trimmed)) return null;
  return normalizeHex(trimmed);
}

export function clampAngle(angle: number): number {
  return Math.max(0, Math.min(360, Math.round(angle)));
}

export function clampPosition(value: number | string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 100) return null;
  return Math.round(n);
}

export function shuffleStopsForRandomize(stops: ColorStop[]): ColorStop[] {
  return [...stops].sort(() => Math.random() - 0.5);
}

export const RADIAL_SIZES = [
  { value: 'closest-side', label: 'Closest Side' },
  { value: 'closest-corner', label: 'Closest Corner' },
  { value: 'farthest-side', label: 'Farthest Side' },
  { value: 'farthest-corner', label: 'Farthest Corner' },
] as const;

export const RADIAL_POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
] as const;

export const GRADIENT_TYPES = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
] as const;