// ─── Conversion Result Component ────────────────────────────────────────────

interface ConversionResultProps {
  result: string;
  onCopy: () => void;
  fromValue?: string;
  fromUnitName?: string;
  toUnitName?: string;
}

export default function ConversionResult({
  result,
  onCopy,
  fromValue,
  fromUnitName,
  toUnitName,
}: ConversionResultProps) {
  if (!result || result === 'Error') {
    return null;
  }

  return (
    <div className="conversion-result">
      <div className="conversion-result__label">
        Result
      </div>
      <div className="conversion-result__display">
        <span className="conversion-result__value">{result}</span>
        <span className="conversion-result__unit">{toUnitName}</span>
      </div>
      <div className="conversion-result__text">
        {fromValue} {fromUnitName} = {result} {toUnitName}
      </div>
      <button
        type="button"
        className="conversion-result__copy-btn"
        onClick={onCopy}
        aria-label="Copy result"
      >
        Copy
      </button>
    </div>
  );
}