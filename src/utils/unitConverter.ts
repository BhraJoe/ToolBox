// ─── Unit Converter Utility ────────────────────────────────────────────────

export type UnitCategory = 
  | 'length'
  | 'weight'
  | 'temperature'
  | 'area'
  | 'volume'
  | 'speed'
  | 'time'
  | 'data';

interface CategoryUnits {
  [K in UnitCategory]?: UnitDefinition[];
}

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  factor?: number;
  formula?: (value: number) => number;
  baseUnit?: string;
}

// Define units by category
const unitDefinitions: CategoryUnits = {
  length: [
    { id: 'mm', name: 'Millimeter', symbol: 'mm', factor: 0.001, baseUnit: 'm' },
    { id: 'cm', name: 'Centimeter', symbol: 'cm', factor: 0.01, baseUnit: 'm' },
    { id: 'm', name: 'Meter', symbol: 'm', baseUnit: 'm' },
    { id: 'km', name: 'Kilometer', symbol: 'km', factor: 1000, baseUnit: 'm' },
    { id: 'inch', name: 'Inch', symbol: '"', factor: 0.0254, baseUnit: 'm' },
    { id: 'ft', name: 'Foot', symbol: 'ft', factor: 0.3048, baseUnit: 'm' },
    { id: 'yd', name: 'Yard', symbol: 'yd', factor: 0.9144, baseUnit: 'm' },
    { id: 'mile', name: 'Mile', symbol: 'mi', factor: 1609.344, baseUnit: 'm' },
  ],
  weight: [
    { id: 'mg', name: 'Milligram', symbol: 'mg', factor: 0.000001, baseUnit: 'g' },
    { id: 'g', name: 'Gram', symbol: 'g', baseUnit: 'g' },
    { id: 'kg', name: 'Kilogram', symbol: 'kg', factor: 1000, baseUnit: 'g' },
    { id: 't', name: 'Metric Ton', symbol: 't', factor: 1000000, baseUnit: 'g' },
    { id: 'oz', name: 'Ounce', symbol: 'oz', factor: 28.34952, baseUnit: 'g' },
    { id: 'lb', name: 'Pound', symbol: 'lb', factor: 453.592, baseUnit: 'g' },
    { id: 'stone', name: 'Stone', symbol: 'st', factor: 6350.29, baseUnit: 'g' },
  ],
  temperature: [
    { id: 'c', name: 'Celsius', symbol: '°C' },
    { id: 'f', name: 'Fahrenheit', symbol: '°F' },
    { id: 'k', name: 'Kelvin', symbol: 'K' },
  ],
  area: [
    { id: 'mm2', name: 'Square Millimeter', symbol: 'mm²', factor: 0.000001, baseUnit: 'm2' },
    { id: 'cm2', name: 'Square Centimeter', symbol: 'cm²', factor: 0.0001, baseUnit: 'm2' },
    { id: 'm2', name: 'Square Meter', symbol: 'm²', baseUnit: 'm2' },
    { id: 'km2', name: 'Square Kilometer', symbol: 'km²', factor: 1000000, baseUnit: 'm2' },
    { id: 'inch2', name: 'Square Inch', symbol: 'in²', factor: 0.00064516, baseUnit: 'm2' },
    { id: 'ft2', name: 'Square Foot', symbol: 'ft²', factor: 0.092903, baseUnit: 'm2' },
    { id: 'yd2', name: 'Square Yard', symbol: 'yd²', factor: 0.836127, baseUnit: 'm2' },
    { id: 'acre', name: 'Acre', symbol: 'acre', factor: 4046.86, baseUnit: 'm2' },
    { id: 'hectare', name: 'Hectare', symbol: 'ha', factor: 10000, baseUnit: 'm2' },
  ],
  volume: [
    { id: 'ml', name: 'Milliliter', symbol: 'ml', factor: 0.000001, baseUnit: 'l' },
    { id: 'l', name: 'Liter', symbol: 'L', baseUnit: 'l' },
    { id: 'm3', name: 'Cubic Meter', symbol: 'm³', factor: 1000, baseUnit: 'l' },
    { id: 'cm3', name: 'Cubic Centimeter', symbol: 'cm³', factor: 0.001, baseUnit: 'l' },
    { id: 'inch3', name: 'Cubic Inch', symbol: 'in³', factor: 0.016387064, baseUnit: 'l' },
    { id: 'ft3', name: 'Cubic Foot', symbol: 'ft³', factor: 28.3168466, baseUnit: 'l' },
    { id: 'gal', name: 'US Gallon', symbol: 'gal', factor: 3.78541, baseUnit: 'l' },
    { id: 'qt', name: 'US Quart', symbol: 'qt', factor: 0.946353, baseUnit: 'l' },
    { id: 'pt', name: 'US Pint', symbol: 'pt', factor: 0.473176, baseUnit: 'l' },
  ],
  speed: [
    { id: 'ms', name: 'Meters per Second', symbol: 'm/s', factor: 1, baseUnit: 'm/s' },
    { id: 'kph', name: 'Kilometers per Hour', symbol: 'km/h', factor: 3.6, baseUnit: 'm/s' },
    { id: 'mph', name: 'Miles per Hour', symbol: 'mph', factor: 1.609344, baseUnit: 'm/s' },
    { id: 'fps', name: 'Feet per Second', symbol: 'ft/s', factor: 0.3048, baseUnit: 'm/s' },
    { id: 'knot', name: 'Knots', symbol: 'knot', factor: 0.514444, baseUnit: 'm/s' },
  ],
  time: [
    { id: 'ms', name: 'Millisecond', symbol: 'ms', factor: 0.001, baseUnit: 's' },
    { id: 's', name: 'Second', symbol: 's', baseUnit: 's' },
    { id: 'min', name: 'Minute', symbol: 'min', factor: 60, baseUnit: 's' },
    { id: 'h', name: 'Hour', symbol: 'h', factor: 3600, baseUnit: 's' },
    { id: 'd', name: 'Day', symbol: 'd', factor: 86400, baseUnit: 's' },
    { id: 'week', name: 'Week', symbol: 'week', factor: 604800, baseUnit: 's' },
  ],
  data: [
    { id: 'bit', name: 'Bit', symbol: 'bit', factor: 0.125, baseUnit: 'byte' },
    { id: 'byte', name: 'Byte', symbol: 'B', baseUnit: 'byte' },
    { id: 'kb', name: 'Kilobyte (decimal)', symbol: 'KB', factor: 1000, baseUnit: 'byte' },
    { id: 'mb', name: 'Megabyte (decimal)', symbol: 'MB', factor: 1000000, baseUnit: 'byte' },
    { id: 'gb', name: 'Gigabyte (decimal)', symbol: 'GB', factor: 1000000000, baseUnit: 'byte' },
    { id: 'tb', name: 'Terabyte (decimal)', symbol: 'TB', factor: 1000000000000, baseUnit: 'byte' },
  ],
};

export function getUnitsByCategory(category: UnitCategory): UnitDefinition[] {
  return unitDefinitions[category] || [];
}

export function getUnitById(category: UnitCategory, unitId: string): UnitDefinition | undefined {
  const units = getUnitsByCategory(category);
  return units.find(u => u.id === unitId);
}

export function getDefaultUnitForCategory(category: UnitCategory): UnitDefinition {
  const units = getUnitsByCategory(category);
  if (units.length === 0) {
    throw new Error(`No units defined for category: ${category}`);
  }
  const temperatureUnits = category === 'temperature' ? 'c' : '';
  const defaultId = temperatureUnits || 'm';
  const defaultUnit = units.find(u => u.id === defaultId) || units[0];
  return defaultUnit;
}

export function convertValue(
  value: number,
  fromCategory: UnitCategory,
  fromUnitId: string,
  toUnitId: string
): number {
  const fromUnit = getUnitById(fromCategory, fromUnitId);
  const toUnit = getUnitById(fromCategory, toUnitId);

  if (!fromUnit || !toUnit) {
    throw new Error('Invalid unit selection');
  }

  if (fromCategory === 'temperature') {
    return convertTemperature(value, fromUnitId, toUnitId);
  }

  const baseValue = fromUnit.factor ? value * fromUnit.factor : value;
  const result = toUnit.factor ? baseValue / toUnit.factor : baseValue;

  return result;
}

function convertTemperature(value: number, fromUnitId: string, toUnitId: string): number {
  switch (fromUnitId) {
    case 'c':
      if (toUnitId === 'f') return (value * 9/5) + 32;
      if (toUnitId === 'k') return value + 273.15;
      return value;
    case 'f':
      if (toUnitId === 'c') return (value - 32) * 5/9;
      if (toUnitId === 'k') return (value - 32) * 5/9 + 273.15;
      return value;
    case 'k':
      if (toUnitId === 'c') return value - 273.15;
      if (toUnitId === 'f') return (value - 273.15) * 9/5 + 32;
      return value;
    default:
      return value;
  }
}

export function getConversionFormula(
  fromCategory: UnitCategory,
  fromUnitId: string,
  toUnitId: string,
  fromValue: number
): string | null {
  if (fromCategory === 'temperature') {
    const toUnit = getUnitById('temperature', toUnitId);
    
    switch (fromUnitId) {
      case 'c':
        if (toUnitId === 'f') {
          return `${fromValue}°C × 9/5 + 32 = ${fromValue * 9/5 + 32} ${toUnit?.symbol}`;
        }
        if (toUnitId === 'k') {
          return `${fromValue}°C + 273.15 = ${fromValue + 273.15} ${toUnit?.symbol}`;
        }
        break;
      case 'f':
        if (toUnitId === 'c') {
          return `(${fromValue}°F - 32) × 5/9 = ${((fromValue - 32) * 5/9).toFixed(2)} ${toUnit?.symbol}`;
        }
        if (toUnitId === 'k') {
          return `(${fromValue}°F - 32) × 5/9 + 273.15 = ${(((fromValue - 32) * 5/9) + 273.15).toFixed(2)} ${toUnit?.symbol}`;
        }
        break;
      case 'k':
        if (toUnitId === 'c') {
          return `${fromValue}K - 273.15 = ${(fromValue - 273.15).toFixed(2)} ${toUnit?.symbol}`;
        }
        if (toUnitId === 'f') {
          return `(${fromValue}K - 273.15) × 9/5 + 32 = ${(((fromValue - 273.15) * 9/5) + 32).toFixed(2)} ${toUnit?.symbol}`;
        }
        break;
    }
  } else {
    const fromUnit = getUnitById(fromCategory, fromUnitId);
    const toUnit = getUnitById(fromCategory, toUnitId);
    if (fromUnit?.factor && toUnit?.factor && fromUnit.id !== toUnit.id) {
      const ratio = fromUnit.factor / toUnit.factor;
      return `1 ${fromUnit.name} = ${ratio.toFixed(2)} ${toUnit.name}`;
    }
  }
  return null;
}

export function formatValue(value: number): string {
  if (!isFinite(value) || isNaN(value)) {
    return 'Error';
  }
  
  if (Math.abs(value) >= 1000000 || (Math.abs(value) < 0.0001 && value !== 0)) {
    return value.toExponential(3);
  } else if (Math.abs(value) < 1 && value !== 0) {
    return value.toPrecision(4);
  } else {
    const rounded = Math.round(value * 1000) / 1000;
    if (Math.floor(rounded) === rounded) {
      return rounded.toString();
    }
    return rounded.toFixed(Math.min(6, String(rounded).split('.')[1]?.length || 1));
  }
}