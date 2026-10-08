export interface CharacterSetOptionsProps {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  onUppercaseChange: (checked: boolean) => void;
  onLowercaseChange: (checked: boolean) => void;
  onNumbersChange: (checked: boolean) => void;
  onSymbolsChange: (checked: boolean) => void;
}

function Checkbox({ id, checked, onChange, label }: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="password-generator__checkbox-label">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="password-generator__checkbox-input"
        aria-checked={checked}
      />
      <span className="password-generator__checkbox-icon" aria-hidden="true">
        {checked ? '☑' : '☐'}
      </span>
      <span className="password-generator__checkbox-text">{label}</span>
    </label>
  );
}

export default function CharacterSetOptions({
  uppercase,
  lowercase,
  numbers,
  symbols,
  onUppercaseChange,
  onLowercaseChange,
  onNumbersChange,
  onSymbolsChange,
}: CharacterSetOptionsProps) {
  return (
    <div className="password-generator__options">
      <Checkbox
        id="uppercase"
        checked={uppercase}
        onChange={onUppercaseChange}
        label="Uppercase Letters"
      />
      <Checkbox
        id="lowercase"
        checked={lowercase}
        onChange={onLowercaseChange}
        label="Lowercase Letters"
      />
      <Checkbox
        id="numbers"
        checked={numbers}
        onChange={onNumbersChange}
        label="Numbers"
      />
      <Checkbox
        id="symbols"
        checked={symbols}
        onChange={onSymbolsChange}
        label="Symbols"
      />
    </div>
  );
}
