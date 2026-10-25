export type BorderStyle =
  | 'none'
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'groove'
  | 'ridge'
  | 'inset'
  | 'outset';

export interface BorderSides {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface BorderRadiusConfig {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
}

export type BorderRepeat = 'stretch' | 'repeat' | 'round' | 'space';

export interface BorderImageConfig {
  source: string;
  slice: number;
  width: number;
  repeat: BorderRepeat;
}

export interface BorderOutlineConfig {
  width: string;
  style: Exclude<BorderStyle, 'none'>;
  color: string;
  offset: string;
}

export interface BorderGeneratorConfig {
  widths: BorderSides;
  styles: BorderSides;
  colors: BorderSides;
  radius: BorderRadiusConfig;
  borderImage: BorderImageConfig | null;
  outline: BorderOutlineConfig | null;
}

export interface BorderPreset {
  name: string;
  config: BorderGeneratorConfig;
}

export const BORDER_STYLES: BorderStyle[] = [
  'none',
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
];

function createSides(value: string): BorderSides {
  return { top: value, right: value, bottom: value, left: value };
}

export function createDefaultConfig(): BorderGeneratorConfig {
  return {
    widths: createSides('1px'),
    styles: createSides('solid'),
    colors: createSides('#2563eb'),
    radius: { topLeft: '0px', topRight: '0px', bottomRight: '0px', bottomLeft: '0px' },
    borderImage: null,
    outline: null,
  };
}

export const DEFAULT_CONFIG: BorderGeneratorConfig = createDefaultConfig();

export const BORDER_PRESETS: BorderPreset[] = [
  {
    name: 'Classic Solid',
    config: {
      widths: createSides('2px'),
      styles: createSides('solid'),
      colors: createSides('#2563eb'),
      radius: { topLeft: '0px', topRight: '0px', bottomRight: '0px', bottomLeft: '0px' },
      borderImage: null,
      outline: null,
    },
  },
  {
    name: 'Dashed',
    config: {
      widths: createSides('3px'),
      styles: createSides('dashed'),
      colors: createSides('#10b981'),
      radius: { topLeft: '4px', topRight: '4px', bottomRight: '4px', bottomLeft: '4px' },
      borderImage: null,
      outline: null,
    },
  },
  {
    name: 'Dotted',
    config: {
      widths: createSides('2px'),
      styles: createSides('dotted'),
      colors: createSides('#f59e0b'),
      radius: { topLeft: '8px', topRight: '8px', bottomRight: '8px', bottomLeft: '8px' },
      borderImage: null,
      outline: null,
    },
  },
  {
    name: 'Double',
    config: {
      widths: createSides('5px'),
      styles: createSides('double'),
      colors: createSides('#dc2626'),
      radius: { topLeft: '8px', topRight: '8px', bottomRight: '8px', bottomLeft: '8px' },
      borderImage: null,
      outline: null,
    },
  },
  {
    name: 'Rounded Card',
    config: {
      widths: createSides('1px'),
      styles: createSides('solid'),
      colors: createSides('#6b7280'),
      radius: { topLeft: '16px', topRight: '16px', bottomRight: '16px', bottomLeft: '16px' },
      borderImage: null,
      outline: null,
    },
  },
  {
    name: 'Pill',
    config: {
      widths: createSides('2px'),
      styles: createSides('solid'),
      colors: createSides('#2563eb'),
      radius: { topLeft: '9999px', topRight: '9999px', bottomRight: '9999px', bottomLeft: '9999px' },
      borderImage: null,
      outline: null,
    },
  },
  {
    name: 'Circle',
    config: {
      widths: createSides('2px'),
      styles: createSides('solid'),
      colors: createSides('#2563eb'),
      radius: { topLeft: '50%', topRight: '50%', bottomRight: '50%', bottomLeft: '50%' },
      borderImage: null,
      outline: null,
    },
  },
  {
    name: 'Left Accent',
    config: {
      widths: { top: '1px', right: '0', bottom: '1px', left: '6px' },
      styles: createSides('solid'),
      colors: createSides('#dc2626'),
      radius: { topLeft: '0px', topRight: '0px', bottomRight: '0px', bottomLeft: '0px' },
      borderImage: null,
      outline: null,
    },
  },
  {
    name: 'Colorful Sides',
    config: {
      widths: { top: '2px', right: '1px', bottom: '3px', left: '4px' },
      styles: createSides('solid'),
      colors: { top: '#2563eb', right: '#94a3b8', bottom: '#16a34a', left: '#f59e0b' },
      radius: { topLeft: '12px', topRight: '20px', bottomRight: '8px', bottomLeft: '4px' },
      borderImage: null,
      outline: null,
    },
  },
  {
    name: 'Groove',
    config: {
      widths: createSides('4px'),
      styles: createSides('groove'),
      colors: createSides('#6b7280'),
      radius: { topLeft: '12px', topRight: '12px', bottomRight: '12px', bottomLeft: '12px' },
      borderImage: null,
      outline: null,
    },
  },
];

export function clampWidthValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(50, Math.round(value)));
}

export function clampRadiusValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(200, Math.round(value)));
}

export function clampSliceValue(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(100, Math.round(value)));
}

export function clampImageWidthValue(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(100, Math.round(value)));
}

function normalizeBorderColor(color: string): string {
  const trimmed = color.trim().toUpperCase();
  if (!/^#([A-F0-9]{6}|[A-F0-9]{3})$/.test(trimmed)) {
    return '#2563eb';
  }
  if (/^#([A-F0-9]){3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return trimmed;
}

export function parseColorInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '#2563eb';
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed)) return normalizeBorderColor(trimmed);
  if (/^rgb\s*\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(trimmed)) return trimmed;
  if (/^hsl\s*\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)$/i.test(trimmed)) return trimmed;
  return '#2563eb';
}

export function isValidBorderStyle(style: string): style is BorderStyle {
  return BORDER_STYLES.includes(style as BorderStyle);
}

function areSidesEqual(sides: BorderSides): boolean {
  return sides.top === sides.right && sides.right === sides.bottom && sides.bottom === sides.left;
}

function formatRadiusValue(value: string): string {
  if (value.includes('%')) return value;
  const num = clampRadiusValue(parseInt(value.replace('px', ''), 10) || 0);
  if (value.includes('%')) return `${num}%`;
  return `${num}px`;
}

function generateBorderDeclaration(config: BorderGeneratorConfig): string {
  const { widths, styles, colors } = config;

  const uniformWidth = areSidesEqual(widths);
  const uniformStyle = areSidesEqual(styles);
  const uniformColor = areSidesEqual(colors);

  const allNone = ['top', 'right', 'bottom', 'left'].every((side) => styles[side as 'top'] === 'none' || widths[side as 'top'] === '0');
  if (allNone) {
    return 'border: 0;';
  }

  if (uniformWidth && uniformStyle && uniformColor) {
    const width = widths.top;
    const style = styles.top;
    if (width === '0' || style === 'none') return 'border: 0;';
    return `border: ${width} ${style} ${colors.top};`;
  }

  const lines: string[] = [];
  (['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
    const w = widths[side];
    const s = styles[side];
    const c = colors[side];
    if (w === '0' || s === 'none') {
      lines.push(`  border-${side}: 0;`);
    } else {
      lines.push(`  border-${side}: ${w} ${s} ${c};`);
    }
  });
  return lines.join('\n');
}

function generateBorderRadiusDeclaration(radius: BorderRadiusConfig): string {
  const formattedValues = [
    formatRadiusValue(radius.topLeft),
    formatRadiusValue(radius.topRight),
    formatRadiusValue(radius.bottomRight),
    formatRadiusValue(radius.bottomLeft),
  ];

  const uniformValue = formatRadiusValue(radius.topLeft);
  const allEqual = formattedValues.every((v) => v === uniformValue);

  if (allEqual) {
    return `  border-radius: ${uniformValue};`;
  }

  return `  border-radius: ${formattedValues.join(' ')};`;
}

function generateBorderImageDeclaration(bi: BorderImageConfig): string[] {
  const lines: string[] = [];
  if (!bi.source) return lines;

  lines.push(`  border-image-source: ${bi.source};`);
  lines.push(`  border-image-slice: ${bi.slice} fill;`);
  lines.push(`  border-image-width: ${bi.width};`);
  lines.push(`  border-image-repeat: ${bi.repeat};`);
  return lines;
}

function generateOutlineDeclaration(outline: BorderOutlineConfig): string[] {
  const lines: string[] = [];
  if (outline.width === '0') return lines;

  lines.push(`  outline: ${outline.width} ${outline.style} ${outline.color};`);
  if (outline.offset && outline.offset !== '0px') {
    lines.push(`  outline-offset: ${outline.offset};`);
  }
  return lines;
}

export function generateBorderCss(config: BorderGeneratorConfig): string {
  const lines: string[] = [];

  lines.push('.border-box {');

  const borderDecl = generateBorderDeclaration(config);
  if (borderDecl.includes('\n')) {
    borderDecl.split('\n').forEach((line) => lines.push(line));
  } else {
    lines.push(`  ${borderDecl}`);
  }

  lines.push(generateBorderRadiusDeclaration(config.radius));

  if (config.borderImage) {
    generateBorderImageDeclaration(config.borderImage).forEach((line) => lines.push(line));
  }

  if (config.outline) {
    generateOutlineDeclaration(config.outline).forEach((line) => lines.push(line));
  }

  lines.push('}');

  return lines.join('\n');
}

export function buildDownloadableBorderCss(config: BorderGeneratorConfig): string {
  return `${generateBorderCss(config)}\n`;
}

export function getBorderValueCss(config: BorderGeneratorConfig): string {
  const { widths, styles, colors } = config;

  const uniformWidth = areSidesEqual(widths);
  const uniformStyle = areSidesEqual(styles);
  const uniformColor = areSidesEqual(colors);

  if (uniformWidth && uniformStyle && uniformColor) {
    const width = widths.top;
    const style = styles.top;
    if (width === '0' || style === 'none') return '0';
    return `${width} ${style} ${colors.top}`;
  }

  return generateBorderDeclaration(config)
    .split('\n')
    .map((line) => line.trim())
    .join(' ');
}

export function matchesPreset(config: BorderGeneratorConfig, preset: BorderPreset): boolean {
  const p = preset.config;
  const checks: boolean[] = [
    areSidesEqual(config.widths) === areSidesEqual(p.widths) &&
      JSON.stringify(config.widths) === JSON.stringify(p.widths),
    JSON.stringify(config.styles) === JSON.stringify(p.styles),
    JSON.stringify(config.colors) === JSON.stringify(p.colors),
    JSON.stringify(config.radius) === JSON.stringify(p.radius),
    config.borderImage === null && p.borderImage === null,
    config.outline === null && p.outline === null,
  ];
  return checks.every(Boolean);
}

export function getActivePresetName(config: BorderGeneratorConfig): string | undefined {
  const match = BORDER_PRESETS.find((preset) => matchesPreset(config, preset));
  return match?.name;
}

export function applyPreset(name: string): BorderGeneratorConfig | undefined {
  const preset = BORDER_PRESETS.find((p) => p.name === name);
  if (!preset) return undefined;
  return JSON.parse(JSON.stringify(preset.config));
}

export function randomBorderConfig(): BorderGeneratorConfig {
  const randomInt = (max: number) => Math.floor(Math.random() * max);
  const randomColor = () => `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0').toUpperCase()}`;
  const randomStyle = BORDER_STYLES[Math.floor(Math.random() * (BORDER_STYLES.length - 1)) + 1];
  const useUniform = Math.random() > 0.5;

  if (useUniform) {
    const width = `${randomInt(50)}px`;
    const style = randomStyle;
    const color = randomColor();
    const radiusNum = randomInt(200);
    const radius = radiusNum === 0 ? '0px' : `${radiusNum}px`;

    return {
      widths: createSides(width),
      styles: createSides(style),
      colors: createSides(color),
      radius: { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius },
      borderImage: null,
      outline: null,
    };
  }

  return {
    widths: {
      top: `${randomInt(40) + 1}px`,
      right: `${randomInt(40) + 1}px`,
      bottom: `${randomInt(40) + 1}px`,
      left: `${randomInt(40) + 1}px`,
    },
    styles: {
      top: randomStyle,
      right: BORDER_STYLES[Math.floor(Math.random() * (BORDER_STYLES.length - 1)) + 1],
      bottom: BORDER_STYLES[Math.floor(Math.random() * (BORDER_STYLES.length - 1)) + 1],
      left: BORDER_STYLES[Math.floor(Math.random() * (BORDER_STYLES.length - 1)) + 1],
    },
    colors: {
      top: randomColor(),
      right: randomColor(),
      bottom: randomColor(),
      left: randomColor(),
    },
    radius: {
      topLeft: `${randomInt(100)}px`,
      topRight: `${randomInt(100)}px`,
      bottomRight: `${randomInt(100)}px`,
      bottomLeft: `${randomInt(100)}px`,
    },
    borderImage: null,
    outline: null,
  };
}