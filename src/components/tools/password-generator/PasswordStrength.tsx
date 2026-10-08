import { calculateStrength } from '../../../utils/passwordGenerator';

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = calculateStrength(password);

  if (!password) {
    return (
      <div className="password-generator__field">
        <label className="password-generator__label">Password Strength</label>
        <div className="password-generator__strength-empty">
          Generate a password to see strength
        </div>
      </div>
    );
  }

  const segments = 5;
  const filled = Math.round((strength.score / 8) * segments);

  return (
    <div className="password-generator__field">
      <label className="password-generator__label">Password Strength</label>
      <div className="password-generator__strength">
        <div className="password-generator__strength-bar">
          {Array.from({ length: segments }).map((_, index) => (
            <div
              key={index}
              className={`password-generator__strength-segment${
                index < filled
                  ? ' password-generator__strength-segment--filled'
                  : ''
              }`}
              style={
                index < filled ? { background: strength.color } : undefined
              }
            />
          ))}
        </div>
        <span
          className="password-generator__strength-label"
          style={{ color: strength.color }}
        >
          {strength.label}
        </span>
      </div>
    </div>
  );
}
