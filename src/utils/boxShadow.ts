export interface ShadowLayer {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

export interface ShadowPreset {
  name: string;
  settings: Omit<ShadowLayer, 'id'>;
}

export const DEFAULT_SHADOW: Omit<ShadowLayer, 'id'> = {
  x: 0,
  y: 8,
  blur: 24,
  spread: 0,
  color: '#1F2937',
  opacity: 18,
  inset: false,
};

export const SHADOW_PRESETS: ShadowPreset[] = [
  { name: 'Soft', settings: { x: 0, y: 4, blur: 16, spread: 0, color: '#1F2937', opacity: 12, inset: false } },
  { name: 'Floating', settings: { x: 0, y: 12, blur: 28, spread: -2, color: '#1F2937', opacity: 20, inset: false } },
  { name: 'Deep', settings: { x: 0, y: 22, blur: 42, spread: -8, color: '#111827', opacity: 32, inset: false } },
  { name: 'Minimal', settings: { x: 0, y: 2, blur: 6, spread: 0, color: '#475569', opacity: 10, inset: false } },
  { name: 'Neon', settings: { x: 0, y: 0, blur: 24, spread: 2, color: '#12B8A6', opacity: 72, inset: false } },
  { name: 'Inset', settings: { x: 0, y: 3, blur: 8, spread: 0, color: '#334155', opacity: 24, inset: true } },
  { name: 'Long Shadow', settings: { x: 18, y: 20, blur: 2, spread: -2, color: '#334155', opacity: 24, inset: false } },
  { name: 'Crisp', settings: { x: 5, y: 5, blur: 0, spread: 0, color: '#1F2937', opacity: 24, inset: false } },
];

export const PREVIEW_DEFAULTS = {
  background: '#E8EDF2',
  box: '#FFFFFF',
};

function normalizeHexColor(color: string): string {
  const normalized = color.trim().replace(/^#/, '');
  if (!/^[\da-f]{6}$/i.test(normalized)) return '1F2937';
  return normalized;
}

export function clampShadowValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function createShadowLayer(settings: Omit<ShadowLayer, 'id'> = DEFAULT_SHADOW): ShadowLayer {
  return { ...settings, id: `shadow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
}

export function buildShadowValue(layers: ShadowLayer[]): string {
  return layers.map((layer) => {
    const hex = normalizeHexColor(layer.color);
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    const opacity = clampShadowValue(layer.opacity, 0, 100) / 100;
    const inset = layer.inset ? 'inset ' : '';
    return `${inset}${Math.round(layer.x)}px ${Math.round(layer.y)}px ${Math.max(0, Math.round(layer.blur))}px ${Math.round(layer.spread)}px rgba(${red}, ${green}, ${blue}, ${Number(opacity.toFixed(2))})`;
  }).join(',\n  ');
}

export function buildDownloadableShadowCss(value: string): string {
  return `.box-shadow-demo {\n  box-shadow: ${value};\n}\n`;
}

export function matchesPreset(layer: ShadowLayer, preset: ShadowPreset): boolean {
  const { id: _id, ...settings } = layer;
  return Object.keys(preset.settings).every((key) =>
    settings[key as keyof typeof settings] === preset.settings[key as keyof typeof preset.settings],
  );
}