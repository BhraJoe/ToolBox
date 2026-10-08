// ─── Percentage Calculator Utilities ────────────────────────────────────────────

export type CalculationType =
  | "percentageOf"
  | "percentageOfValue"
  | "increase"
  | "decrease"
  | "original"
  | "difference";

export type OriginalMode = "increase" | "decrease";

export interface ResultBreakdown {
  changeLabel: string;
  changeAmount: number;
  newValue: number;
}

export interface PercentageResult {
  value: number;
  label: string;
  formula: string;
  breakdown?: ResultBreakdown;
  isPercentage: boolean;
}

export function parseNumericInput(value: string): { valid: boolean; num: number; message: string } {
  if (value === "" || value === ".") {
    return { valid: false, num: NaN, message: "" };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, num: NaN, message: "" };
  }

  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    return { valid: false, num: NaN, message: "Please enter a valid number." };
  }

  if (!isFinite(num)) {
    return { valid: false, num: NaN, message: "Value is too large." };
  }

  return { valid: true, num, message: "" };
}

export function formatPercentage(value: number): string {
  if (!isFinite(value) || isNaN(value)) {
    return "Error";
  }
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return value.toExponential(3);
  }
  const rounded = Math.round(value * 10000) / 10000;
  return `${rounded.toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function formatNumber(value: number): string {
  if (!isFinite(value) || isNaN(value)) {
    return "Error";
  }
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return value.toExponential(3);
  }
  const rounded = Math.round(value * 10000) / 10000;
  if (Math.floor(rounded) === rounded) {
    return rounded.toString();
  }
  return rounded.toFixed(4).replace(/\.?0+$/, "");
}

export function calculatePercentageOf(percentage: number, number: number): PercentageResult {
  const result = (percentage / 100) * number;
  return {
    value: result,
    label: `${formatNumber(percentage)}% of ${formatNumber(number)} = ${formatNumber(result)}`,
    formula: `(${formatPercentage(percentage)} / 100) × ${formatNumber(number)} = ${formatNumber(result)}`,
    isPercentage: false,
  };
}

export function calculatePercentageOfValue(value: number, total: number): PercentageResult {
  if (total === 0) {
    throw new Error("Total cannot be zero.");
  }
  const result = (value / total) * 100;
  return {
    value: result,
    label: `${formatNumber(value)} is ${formatPercentage(result)}% of ${formatNumber(total)}`,
    formula: `(${formatNumber(value)} / ${formatNumber(total)}) × 100 = ${formatPercentage(result)}`,
    isPercentage: true,
  };
}

export function calculateIncrease(original: number, percentage: number): PercentageResult {
  const changeAmount = original * (percentage / 100);
  const newValue = original + changeAmount;
  return {
    value: newValue,
    label: `${formatNumber(original)} + ${formatPercentage(percentage)}% = ${formatNumber(newValue)}`,
    formula: `${formatNumber(original)} × (1 + ${formatPercentage(percentage)} / 100) = ${formatNumber(newValue)}`,
    breakdown: {
      changeLabel: "Increase",
      changeAmount,
      newValue,
    },
    isPercentage: false,
  };
}

export function calculateDecrease(original: number, percentage: number): PercentageResult {
  const changeAmount = original * (percentage / 100);
  const newValue = original - changeAmount;
  return {
    value: newValue,
    label: `${formatNumber(original)} − ${formatPercentage(percentage)}% = ${formatNumber(newValue)}`,
    formula: `${formatNumber(original)} × (1 − ${formatPercentage(percentage)} / 100) = ${formatNumber(newValue)}`,
    breakdown: {
      changeLabel: "Decrease",
      changeAmount,
      newValue,
    },
    isPercentage: false,
  };
}

export function calculateOriginalValue(
  finalValue: number,
  percentage: number,
  mode: OriginalMode
): PercentageResult {
  const denominator = mode === "increase"
    ? (1 + percentage / 100)
    : (1 - percentage / 100);

  if (denominator === 0) {
    throw new Error(mode === "increase"
      ? "Percentage cannot be -100% for increase (denominator becomes zero)."
      : "Percentage cannot be 100% for decrease (denominator becomes zero).");
  }

  const original = finalValue / denominator;
  const label = mode === "increase"
    ? `${formatNumber(finalValue)} / (1 + ${formatPercentage(percentage)}) = ${formatNumber(original)}`
    : `${formatNumber(finalValue)} / (1 − ${formatPercentage(percentage)}) = ${formatNumber(original)}`;

  return {
    value: original,
    label,
    formula: `${formatNumber(finalValue)} / ${denominator.toFixed(4)} = ${formatNumber(original)}`,
    isPercentage: false,
  };
}

export function calculatePercentageDifference(value1: number, value2: number): PercentageResult {
  const avg = (value1 + value2) / 2;
  if (avg === 0) {
    throw new Error("Cannot calculate percentage difference when both values are zero.");
  }
  const diff = Math.abs(value1 - value2);
  const result = (diff / avg) * 100;
  return {
    value: result,
    label: `${formatNumber(value1)} vs ${formatNumber(value2)} = ${formatPercentage(result)}`,
    formula: `|${formatNumber(value1)} − ${formatNumber(value2)}| / ((${formatNumber(value1)} + ${formatNumber(value2)}) / 2) × 100 = ${formatPercentage(result)}`,
    isPercentage: true,
  };
}

// ─── Calculation Configurations ─────────────────────────────────────────

export interface InputFieldConfig {
  id: string;
  label: string;
  placeholder: string;
  suffix?: string;
}

export interface CalculationConfig {
  type: CalculationType;
  title: string;
  description: string;
  inputs: InputFieldConfig[];
}

export const CALCULATION_CONFIGS: CalculationConfig[] = [
  {
    type: "percentageOf",
    title: "What is X% of Y?",
    description: "Find a percentage of a number.",
    inputs: [
      { id: "percentage", label: "Percentage", placeholder: "20", suffix: "%" },
      { id: "number", label: "Number", placeholder: "500" },
    ],
  },
  {
    type: "percentageOfValue",
    title: "X is what % of Y?",
    description: "Find what percentage one number is of another.",
    inputs: [
      { id: "value", label: "Value", placeholder: "50" },
      { id: "total", label: "Total", placeholder: "200" },
    ],
  },
  {
    type: "increase",
    title: "Percentage Increase",
    description: "Calculate the increase of a value by a percentage.",
    inputs: [
      { id: "original", label: "Original Value", placeholder: "500" },
      { id: "percentageIncrease", label: "Increase", placeholder: "20", suffix: "%" },
    ],
  },
  {
    type: "decrease",
    title: "Percentage Decrease",
    description: "Calculate the decrease of a value by a percentage.",
    inputs: [
      { id: "original", label: "Original Value", placeholder: "500" },
      { id: "percentageDecrease", label: "Decrease", placeholder: "20", suffix: "%" },
    ],
  },
  {
    type: "original",
    title: "Find Original Value",
    description: "Calculate the original value before a percentage change.",
    inputs: [
      { id: "finalValue", label: "Final Value", placeholder: "120" },
      { id: "percentage", label: "Percentage", placeholder: "20", suffix: "%" },
    ],
  },
  {
    type: "difference",
    title: "Percentage Difference",
    description: "Find the percentage difference between two values.",
    inputs: [
      { id: "value1", label: "Value 1", placeholder: "100" },
      { id: "value2", label: "Value 2", placeholder: "120" },
    ],
  },
];

export function getConfigByType(type: CalculationType): CalculationConfig | undefined {
  return CALCULATION_CONFIGS.find(c => c.type === type);
}