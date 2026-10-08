export interface PasswordLengthProps {
  value: number;
  onChange: (value: number) => void;
}

export default function PasswordLength({ value, onChange }: PasswordLengthProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(event.target.value, 10);
    if (!isNaN(parsed)) {
      onChange(Math.max(8, Math.min(64, parsed)));
    }
  };

  return (
    <div className="password-generator__field">
      <label htmlFor="password-length" className="password-generator__label">
        Password Length
      </label>
      <div className="password-generator__range-wrapper">
        <input
          type="range"
          id="password-length"
          min={8}
          max={64}
          value={value}
          onChange={handleInputChange}
          className="password-generator__range"
          aria-describedby="password-length-value"
        />
        <span id="password-length-value" className="password-generator__range-value">
          {value}
        </span>
      </div>
    </div>
  );
}
