export interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export interface HslColor {
  hue: number;
  saturation: number;
  lightness: number;
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, value));
}

function parseHexColor(value: string): RgbColor {
  const hex = value.startsWith('#') ? value.slice(1) : value;
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    throw new Error('Enter a valid 3- or 6-digit HEX color, such as #3498db.');
  }

  const expanded = hex.length === 3
    ? [...hex].map((digit) => `${digit}${digit}`).join('')
    : hex;

  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function parseRgbColor(value: string): RgbColor {
  const match = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (!match) {
    throw new Error('Enter RGB as rgb(r, g, b) using whole-number channels.');
  }

  const [red, green, blue] = match.slice(1).map(Number);
  if ([red, green, blue].some((channel) => channel < 0 || channel > 255)) {
    throw new Error('Each RGB channel must be an integer from 0 to 255.');
  }

  return { red, green, blue };
}

function parseHslColor(value: string): RgbColor {
  const numericValue = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  const match = value.match(
    new RegExp(`^hsl\\(\\s*(${numericValue})\\s*,\\s*(${numericValue})%\\s*,\\s*(${numericValue})%\\s*\\)$`, 'i'),
  );
  if (!match) {
    throw new Error('Enter HSL as hsl(h, s%, l%) with saturation and lightness percentages.');
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]);
  const lightness = Number(match[3]);
  if (![hue, saturation, lightness].every(Number.isFinite)) {
    throw new Error('HSL values must be finite numbers.');
  }
  if (saturation < 0 || saturation > 100 || lightness < 0 || lightness > 100) {
    throw new Error('HSL saturation and lightness must each be between 0% and 100%.');
  }

  return hslToRgb({
    hue: ((hue % 360) + 360) % 360,
    saturation: saturation / 100,
    lightness: lightness / 100,
  });
}

export function parseColor(value: string): RgbColor {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Enter a HEX, RGB, or HSL color to convert.');
  }

  if (/^#/.test(normalized) || /^[\da-f]+$/i.test(normalized)) {
    return parseHexColor(normalized);
  }
  if (/^rgb/i.test(normalized)) {
    return parseRgbColor(normalized);
  }
  if (/^hsl/i.test(normalized)) {
    return parseHslColor(normalized);
  }

  throw new Error('Use HEX (#3498db), RGB (rgb(52, 152, 219)), or HSL (hsl(204, 70%, 53%)).');
}

export function rgbToHsl({ red, green, blue }: RgbColor): HslColor {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const difference = maximum - minimum;
  let hue = 0;
  let saturation = 0;
  const lightness = (maximum + minimum) / 2;

  if (difference !== 0) {
    saturation = difference / (1 - Math.abs(2 * lightness - 1));
    switch (maximum) {
      case r:
        hue = ((g - b) / difference) % 6;
        break;
      case g:
        hue = (b - r) / difference + 2;
        break;
      default:
        hue = (r - g) / difference + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return { hue, saturation, lightness };
}

export function hslToRgb({ hue, saturation, lightness }: HslColor): RgbColor {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSection = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection < 1) [red, green, blue] = [chroma, secondary, 0];
  else if (hueSection < 2) [red, green, blue] = [secondary, chroma, 0];
  else if (hueSection < 3) [red, green, blue] = [0, chroma, secondary];
  else if (hueSection < 4) [red, green, blue] = [0, secondary, chroma];
  else if (hueSection < 5) [red, green, blue] = [secondary, 0, chroma];
  else [red, green, blue] = [chroma, 0, secondary];

  const lightnessOffset = lightness - chroma / 2;
  return {
    red: clampChannel((red + lightnessOffset) * 255),
    green: clampChannel((green + lightnessOffset) * 255),
    blue: clampChannel((blue + lightnessOffset) * 255),
  };
}

export function rgbToHex(color: RgbColor): string {
  return `#${[color.red, color.green, color.blue]
    .map((channel) => Math.round(clampChannel(channel)).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function formatRgb(color: RgbColor): string {
  const [red, green, blue] = [color.red, color.green, color.blue].map((channel) =>
    Math.round(clampChannel(channel)),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

export function formatHsl(color: RgbColor): string {
  const { hue, saturation, lightness } = rgbToHsl(color);
  const normalizedHue = Math.round(hue) % 360;
  return `hsl(${normalizedHue}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
}

export function getContrastingTextColor(color: RgbColor): '#000000' | '#ffffff' {
  const channels = [color.red, color.green, color.blue].map((channel) => {
    const value = Math.round(clampChannel(channel)) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
}
