import { useState, useCallback } from 'react';
import { generatePassword, type PasswordOptions } from '../../../utils/passwordGenerator';
import PasswordDisplay from './PasswordDisplay';
import CharacterSetOptions from './CharacterSetOptions';
import PasswordStrength from './PasswordStrength';
import PasswordLength from './PasswordLength';

const DEFAULT_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

export default function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const generate = useCallback(() => {
    try {
      const result = generatePassword(options);
      setPassword(result);
      setError('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to generate password'
      );
      setPassword('');
    }
  }, [options]);

  const handleReset = useCallback(() => {
    setOptions(DEFAULT_OPTIONS);
    setPassword('');
    setError('');
  }, []);

  const updateOption = useCallback(
    <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
      setOptions((prev) => {
        const next = { ...prev, [key]: value };
        return next;
      });
    },
    []
  );

  return (
    <div className="password-generator">
      <div className="password-generator__card">
        <PasswordDisplay password={password} />

        <PasswordLength
          value={options.length}
          onChange={(length) => updateOption('length', length)}
        />

        <CharacterSetOptions
          uppercase={options.uppercase}
          lowercase={options.lowercase}
          numbers={options.numbers}
          symbols={options.symbols}
          onUppercaseChange={(checked: boolean) => updateOption('uppercase', checked)}
          onLowercaseChange={(checked: boolean) => updateOption('lowercase', checked)}
          onNumbersChange={(checked: boolean) => updateOption('numbers', checked)}
          onSymbolsChange={(checked: boolean) => updateOption('symbols', checked)}
        />

        {error && (
          <div className="password-generator__error" role="alert">
            {error}
          </div>
        )}

        <PasswordStrength password={password} />

        <div className="password-generator__actions">
          <button
            type="button"
            onClick={generate}
            className="password-generator__btn password-generator__btn--primary"
          >
            Generate Password
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="password-generator__btn password-generator__btn--secondary"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}