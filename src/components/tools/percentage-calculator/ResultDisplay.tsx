import type { PercentageResult } from '../../../utils/percentageCalculator';

interface ResultDisplayProps {
  result: PercentageResult | null;
  copied: boolean;
  onCopy: () => void;
}

export default function ResultDisplay({ result, copied, onCopy }: ResultDisplayProps) {
  if (!result) return null;

  return (
    <div className="percentage-calculator__result">
      <div className="percentage-calculator__result-label">Result</div>

      <div className="percentage-calculator__result-value">
        {result.isPercentage
          ? result.value.toFixed(2).replace(/\.?0+$/, "") + "%"
          : result.value}
      </div>

      <div className="percentage-calculator__result-text">
        {result.label}
      </div>

      <button
        type="button"
        className="percentage-calculator__copy-btn"
        onClick={onCopy}
        aria-label="Copy result"
      >
        {copied ? "✓ Copied" : "📋 Copy Result"}
      </button>
    </div>
  );
}