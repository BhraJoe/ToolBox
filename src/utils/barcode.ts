import BwipJs from 'bwip-js/browser';

export type BarcodeFormatId =
  | 'code128'
  | 'code39'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'itf'
  | 'itf14'
  | 'codabar';

export interface BarcodeFormat {
  id: BarcodeFormatId;
  name: string;
  bcid: string;
  description: string;
  placeholder: string;
  maxLength?: number;
  autoCheckDigit: boolean;
  validateCheckDigit: boolean;
  numericOnly: boolean;
  allowedCharacters?: string;
}

export interface BarcodeCustomization {
  width: number;
  height: number;
  barThickness: number;
  lineColor: string;
  backgroundColor: string;
  showText: boolean;
  fontSize: number;
  margin: number;
}

export interface BarcodeGenerationResult {
  svg: string | null;
  png: string | null;
  text: string;
  format: BarcodeFormatId;
  error: string | null;
}

export interface BarcodeValidation {
  valid: boolean;
  value: string;
  checkDigit?: string;
  checkDigitCalculated: boolean;
  checkDigitValidated: boolean;
  error: string | null;
  guidance: string;
}

export const BARCODE_FORMATS: BarcodeFormat[] = [
  {
    id: 'code128',
    name: 'CODE 128',
    bcid: 'code128',
    description: 'High-density alphanumeric barcode for inventory and general business use.',
    placeholder: 'Enter text (letters, numbers, symbols)',
    maxLength: 256,
    autoCheckDigit: false,
    validateCheckDigit: false,
    numericOnly: false,
    allowedCharacters: 'Full ASCII 128',
  },
  {
    id: 'code39',
    name: 'CODE 39',
    bcid: 'code39',
    description: 'Alphanumeric barcode supporting uppercase letters, numbers, spaces, and - . $ / + %.',
    placeholder: 'Enter uppercase text (A-Z, 0-9, space, - . $ / + %)',
    maxLength: 80,
    autoCheckDigit: false,
    validateCheckDigit: false,
    numericOnly: false,
    allowedCharacters: '0-9, A-Z, space, - . $ / + %',
  },
  {
    id: 'ean13',
    name: 'EAN-13',
    bcid: 'ean13',
    description: '13-digit retail barcode. Enter 12 digits to auto-calculate the check digit, or 13 digits to validate it.',
    placeholder: '12 or 13 digits',
    maxLength: 13,
    autoCheckDigit: true,
    validateCheckDigit: true,
    numericOnly: true,
    allowedCharacters: '0-9',
  },
  {
    id: 'ean8',
    name: 'EAN-8',
    bcid: 'ean8',
    description: '8-digit retail barcode for small packages. Enter 7 digits to auto-calculate the check digit, or 8 digits to validate it.',
    placeholder: '7 or 8 digits',
    maxLength: 8,
    autoCheckDigit: true,
    validateCheckDigit: true,
    numericOnly: true,
    allowedCharacters: '0-9',
  },
  {
    id: 'upca',
    name: 'UPC-A',
    bcid: 'upca',
    description: '12-digit retail barcode used in North America. Enter 11 digits to auto-calculate the check digit, or 12 digits to validate it.',
    placeholder: '11 or 12 digits',
    maxLength: 12,
    autoCheckDigit: true,
    validateCheckDigit: true,
    numericOnly: true,
    allowedCharacters: '0-9',
  },
  {
    id: 'itf',
    name: 'ITF (Interleaved 2 of 5)',
    bcid: 'interleaved2of5',
    description: 'Compact numeric barcode. Enter an even number of digits (at least 2).',
    placeholder: 'An even number of digits, e.g. 123456',
    maxLength: 80,
    autoCheckDigit: false,
    validateCheckDigit: false,
    numericOnly: true,
    allowedCharacters: '0-9, even number of digits',
  },
  {
    id: 'itf14',
    name: 'ITF-14',
    bcid: 'itf14',
    description: '14-digit Interleaved 2 of 5 barcode used for shipping cartons. Enter 13 digits to auto-calculate the check digit, or 14 digits to validate it.',
    placeholder: '13 or 14 digits',
    maxLength: 14,
    autoCheckDigit: true,
    validateCheckDigit: true,
    numericOnly: true,
    allowedCharacters: '0-9',
  },
  {
    id: 'codabar',
    name: 'Codabar',
    bcid: 'rationalizedCodabar',
    description: 'Numeric barcode with start/stop characters (A, B, C, D). Supports 0-9, -, $, :, /, ., +.',
    placeholder: 'A12345B',
    maxLength: 128,
    autoCheckDigit: false,
    validateCheckDigit: false,
    numericOnly: false,
    allowedCharacters: '0-9, -, $, :, /, ., +, start/stop A-D',
  },
];

export function getFormatById(id: BarcodeFormatId): BarcodeFormat | undefined {
  return BARCODE_FORMATS.find((f) => f.id === id);
}

export const DEFAULT_CUSTOMIZATION: BarcodeCustomization = {
  width: 480,
  height: 100,
  barThickness: 2,
  lineColor: '#000000',
  backgroundColor: '#FFFFFF',
  showText: true,
  fontSize: 16,
  margin: 10,
};

export function isValidHexColor(value: string): boolean {
  return /^#[\da-f]{6}$/i.test(value);
}

function relativeLuminance(color: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastRatio(foreground: string, background: string): number {
  if (!isValidHexColor(foreground) || !isValidHexColor(background)) return 0;
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

// ─── Check digit calculations ─────────────────────────────────────────────

export function calculateCheckDigit(digits: string): string {
  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * weight;
    weight = weight === 1 ? 3 : 1;
  }
  return String((10 - (sum % 10)) % 10);
}

function validateNumeric(value: string): { valid: boolean; error: string | null } {
  if (!/^\d+$/.test(value)) {
    return { valid: false, error: 'Only numeric digits (0-9) are allowed.' };
  }
  return { valid: true, error: null };
}

function invalidValidation(value: string, error: string, guidance: string): BarcodeValidation {
  return {
    valid: false,
    value,
    checkDigitCalculated: false,
    checkDigitValidated: false,
    error,
    guidance,
  };
}

function validateCheckDigitInput(
  format: BarcodeFormat,
  value: string,
  dataLength: number,
  autoCalculate: boolean,
): BarcodeValidation {
  const totalLength = dataLength + 1;

  if (value.length === dataLength) {
    if (!autoCalculate) {
      return invalidValidation(
        value,
        `${format.name} requires ${totalLength} digits when automatic check digit calculation is off.`,
        `Enter ${totalLength} digits or enable automatic check digit calculation.`,
      );
    }

    const checkDigit = calculateCheckDigit(value);
    return {
      valid: true,
      value: `${value}${checkDigit}`,
      checkDigit,
      checkDigitCalculated: true,
      checkDigitValidated: false,
      error: null,
      guidance: `Check digit calculated automatically: ${checkDigit}. The input above is unchanged.`,
    };
  }

  if (value.length === totalLength) {
    const expected = calculateCheckDigit(value.slice(0, dataLength));
    const supplied = value[totalLength - 1];
    const valid = supplied === expected;
    return {
      valid,
      value,
      checkDigit: supplied,
      checkDigitCalculated: false,
      checkDigitValidated: true,
      error: valid ? null : `Invalid check digit. Expected ${expected}, found ${supplied}.`,
      guidance: valid ? 'Check digit validated successfully.' : `Correct the final digit or enter ${dataLength} digits to calculate it.`,
    };
  }

  const lengthGuidance = autoCalculate
    ? `Enter ${dataLength} digits to calculate the check digit, or ${totalLength} digits to validate it.`
    : `Enter ${totalLength} digits with the check digit included.`;
  return invalidValidation(value, `${format.name} requires ${dataLength} or ${totalLength} digits.`, lengthGuidance);
}

export function validateBarcodeInput(
  formatId: BarcodeFormatId,
  value: string,
  autoCalculateCheckDigit = true,
): BarcodeValidation {
  const format = getFormatById(formatId);
  if (!format) {
    return invalidValidation(value, 'Unknown barcode format.', '');
  }

  if (value.length === 0) {
    return {
      valid: false,
      value,
      checkDigitCalculated: false,
      checkDigitValidated: false,
      error: null,
      guidance: format.placeholder,
    };
  }

  if (format.numericOnly) {
    const numeric = validateNumeric(value);
    if (!numeric.valid) {
      return invalidValidation(value, numeric.error ?? 'Only numeric digits (0-9) are allowed.', format.placeholder);
    }
  } else if (formatId === 'code39') {
    if (!/^[0-9A-Z \-.$/+%]+$/.test(value)) {
      return invalidValidation(
        value,
        'CODE 39 only supports uppercase letters (A-Z), numbers (0-9), spaces, and - . $ / + %. Remove or correct unsupported characters.',
        format.placeholder,
      );
    }
  } else if (formatId === 'codabar') {
    if (!/^[A-D][0-9$:/+.-]+[A-D]$/.test(value)) {
      return invalidValidation(
        value,
        'Codabar must start and end with A, B, C, or D, with at least one data character using 0-9, -, $, :, /, ., or + between them.',
        format.placeholder,
      );
    }
  } else if (formatId === 'code128' && !/^[\x20-\x7e]+$/.test(value)) {
    return invalidValidation(
      value,
      'CODE 128 accepts printable ASCII characters only (letters, numbers, spaces, and common symbols).',
      format.placeholder,
    );
  }

  if (format.maxLength !== undefined && value.length > format.maxLength) {
    return invalidValidation(
      value,
      `Input is too long. Maximum ${format.maxLength} characters for ${format.name}.`,
      format.placeholder,
    );
  }

  if (formatId === 'ean13') {
    return validateCheckDigitInput(format, value, 12, autoCalculateCheckDigit);
  }
  if (formatId === 'ean8') {
    return validateCheckDigitInput(format, value, 7, autoCalculateCheckDigit);
  }
  if (formatId === 'upca') {
    return validateCheckDigitInput(format, value, 11, autoCalculateCheckDigit);
  }
  if (formatId === 'itf14') {
    return validateCheckDigitInput(format, value, 13, autoCalculateCheckDigit);
  }
  if (formatId === 'itf' && (value.length < 2 || value.length % 2 !== 0)) {
    return invalidValidation(value, 'ITF requires an even number of digits (at least 2).', format.placeholder);
  }

  return {
    valid: true,
    value,
    checkDigitCalculated: false,
    checkDigitValidated: false,
    error: null,
    guidance: format.placeholder,
  };
}

export function validateBarcodeCustomization(customization: BarcodeCustomization): string | null {
  const { width, height, barThickness, fontSize, margin, lineColor, backgroundColor } = customization;
  if (!Number.isFinite(width) || width < 120 || width > 1200) return 'Width must be between 120 and 1200 pixels.';
  if (!Number.isFinite(height) || height < 40 || height > 500) return 'Bar height must be between 40 and 500 pixels.';
  if (!Number.isFinite(barThickness) || barThickness < 0.5 || barThickness > 4) return 'Bar thickness must be between 0.5 and 4.';
  if (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 36) return 'Text size must be between 8 and 36 pixels.';
  if (!Number.isFinite(margin) || margin < 0 || margin > 40) return 'Margin must be between 0 and 40 pixels.';
  if (!isValidHexColor(lineColor)) return 'Enter a valid six-digit line color, such as #000000.';
  if (!isValidHexColor(backgroundColor)) return 'Enter a valid six-digit background color, such as #FFFFFF.';
  if (getContrastRatio(lineColor, backgroundColor) < 4.5) {
    return 'Line and background colors need a contrast ratio of at least 4.5:1 for reliable scanning.';
  }
  return null;
}

function buildBwipOptions(
  formatId: BarcodeFormatId,
  text: string,
  customization: BarcodeCustomization,
): BwipJs.RenderOptions {
  const format = getFormatById(formatId);
  if (!format) throw new Error('Unsupported barcode format.');

  return {
    bcid: format.bcid,
    text,
    height: customization.height / 3.78,
    scaleX: customization.barThickness,
    scaleY: 1,
    barcolor: customization.lineColor.slice(1),
    backgroundcolor: customization.backgroundColor.slice(1),
    includetext: customization.showText,
    textsize: customization.fontSize,
    textyalign: 'below',
    textxalign: 'center',
    textcolor: customization.lineColor.slice(1),
    padding: customization.margin,
  };
}

function addSvgDimensions(svg: string, width: number): { svg: string; height: number } {
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBox) throw new Error('The barcode library returned SVG without valid dimensions.');
  const viewWidth = Number(viewBox[1]);
  const viewHeight = Number(viewBox[2]);
  const height = Math.max(1, Math.round(width * viewHeight / viewWidth));
  return {
    svg: svg.replace('<svg ', `<svg width="${width}px" height="${height}px" `),
    height,
  };
}

async function rasterizeSvg(svg: string, width: number, height: number): Promise<string> {
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The generated barcode could not be prepared as a PNG.'));
      image.src = objectUrl;
    });

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG export is unavailable because this browser could not create a canvas.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function generateBarcode(
  formatId: BarcodeFormatId,
  value: string,
  customization: BarcodeCustomization,
): Promise<BarcodeGenerationResult> {
  const format = getFormatById(formatId);
  if (!format) {
    return { svg: null, png: null, text: value, format: 'code128', error: 'Unsupported barcode format.' };
  }

  const customizationError = validateBarcodeCustomization(customization);
  if (customizationError) {
    return { svg: null, png: null, text: value, format: formatId, error: customizationError };
  }

  try {
    const rawSvg = BwipJs.toSVG(buildBwipOptions(formatId, value, customization));
    const { svg, height } = addSvgDimensions(rawSvg, customization.width);
    const png = await rasterizeSvg(svg, customization.width, height);
    return { svg, png, text: value, format: formatId, error: null };
  } catch (error) {
    return {
      svg: null,
      png: null,
      text: value,
      format: formatId,
      error: error instanceof Error ? error.message : 'Failed to generate the barcode. Check the content and settings.',
    };
  }
}

export function barcodeDownloadFilename(formatId: BarcodeFormatId, extension: 'png' | 'svg'): string {
  return `toolbox-${formatId}.${extension}`;
}

export const RETAIL_DISCLAIMER =
  'Generated barcodes are for demonstration and internal use. Retail distribution or official product registration may require officially assigned identifiers (e.g. a GS1 company prefix and GTIN).';
