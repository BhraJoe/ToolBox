// ─── Percentage Calculator ──────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  CalculationType,
  OriginalMode,
  PercentageResult,
} from '../../../utils/percentageCalculator';
import {
  parseNumericInput,
  calculatePercentageOf,
  calculatePercentageOfValue,
  calculateIncrease,
  calculateDecrease,
  calculateOriginalValue,
  calculatePercentageDifference,
  getConfigByType,
} from '../../../utils/percentageCalculator';
import CalculationSelector from './CalculationSelector';
import InputForm from './InputForm';
import ResultDisplay from './ResultDisplay';

const DEFAULT_INPUTS: Record<string, string> = {
  percentage: "10",
  number: "100",
  value: "",
  total: "",
  original: "",
  percentageIncrease: "20",
  percentageDecrease: "20",
  finalValue: "",
  value1: "",
  value2: "",
};

export default function PercentageCalculator() {
  const [calculationType, setCalculationType] = useState<CalculationType>("percentageOf");
  const [originalMode, setOriginalMode] = useState<OriginalMode>("increase");
  const [inputValues, setInputValues] = useState<Record<string, string>>(DEFAULT_INPUTS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PercentageResult | null>(null);
  const [copied, setCopied] = useState(false);

  const config = useMemo(() => getConfigByType(calculationType)!, [calculationType]);

  const compute = useCallback((): void => {
    const newErrors: Record<string, string> = {};
    if (!config) return;

    const nums: Record<string, number> = {};
    let hasEmpty = false;

    for (const input of config.inputs) {
      const val = inputValues[input.id] || "";
      if (val.trim() === "") {
        hasEmpty = true;
        continue;
      }
      const parsed = parseNumericInput(val);
      if (!parsed.valid) {
        newErrors[input.id] = parsed.message;
      } else {
        nums[input.id] = parsed.num;
      }
    }

    // Handle original mode
    if (calculationType === "original") {
      const pctVal = inputValues.percentage || "";
      if (pctVal.trim() !== "") {
        const parsed = parseNumericInput(pctVal);
        if (!parsed.valid) {
          newErrors.percentage = parsed.message;
        } else {
          nums.percentage = parsed.num;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setResult(null);
      return;
    }

    if (hasEmpty) {
      setErrors({});
      setResult(null);
      return;
    }

    try {
      let r: PercentageResult;

      switch (calculationType) {
        case "percentageOf":
          r = calculatePercentageOf(nums.percentage, nums.number);
          break;
        case "percentageOfValue":
          r = calculatePercentageOfValue(nums.value, nums.total);
          break;
        case "increase":
          r = calculateIncrease(nums.original, nums.percentageIncrease);
          break;
        case "decrease":
          r = calculateDecrease(nums.original, nums.percentageDecrease);
          break;
        case "original":
          r = calculateOriginalValue(nums.finalValue, nums.percentage, originalMode);
          break;
        case "difference":
          r = calculatePercentageDifference(nums.value1, nums.value2);
          break;
        default:
          return;
      }

      setErrors({});
      setResult(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Calculation error";
      setErrors({ general: msg });
      setResult(null);
    }
  }, [calculationType, inputValues, originalMode, config]);

  useEffect(() => {
    setInputValues(DEFAULT_INPUTS);
    setErrors({});
    setResult(null);
    setCopied(false);
  }, [calculationType]);

  const handleInputChange = (field: string, value: string) => {
    setInputValues(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setInputValues(DEFAULT_INPUTS);
    setErrors({});
    setResult(null);
    setCopied(false);
  };

  const handleCopyResult = async () => {
    if (!result) return;

    let textToCopy = result.label;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  useEffect(() => {
    compute();
  }, [compute]);

  return (
    <div className="percentage-calculator">
      <div className="percentage-calculator__container">
        <div className="percentage-calculator__header">
          <h2>Percentage Calculator</h2>
          <p>Calculate percentages quickly and easily.</p>
        </div>

        <div className="percentage-calculator__calculator">
          <CalculationSelector
            value={calculationType}
            onChange={setCalculationType}
          />

          <InputForm
            config={config!}
            values={inputValues}
            onChange={handleInputChange}
            errors={errors}
            mode={originalMode}
            onModeChange={setOriginalMode}
          />

          {Object.keys(errors).filter(k => k !== "general").length > 0 && (
            <div className="percentage-calculator__field-errors">
              {Object.entries(errors)
                .filter(([k]) => k !== "general")
                .map(([_, msg]) => (
                  <div key={_} className="percentage-calculator__error">
                    {msg}
                  </div>
                ))}
            </div>
          )}

          {errors.general && (
            <div className="percentage-calculator__general-error">
              {errors.general}
            </div>
          )}

          <ResultDisplay
            result={result}
            copied={copied}
            onCopy={handleCopyResult}
          />

          <div className="percentage-calculator__actions">
            <button
              type="button"
              className="percentage-calculator__btn percentage-calculator__btn--reset"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}