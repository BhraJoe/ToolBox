import { useState } from 'react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';

interface PasswordDisplayProps {
  password: string;
}

export default function PasswordDisplay({ password }: PasswordDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(true);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available; do nothing
    }
  };

  return (
    <div className="password-generator__field">
      <label className="password-generator__label">
        Generated Password
      </label>
      <div className="password-generator__display-row">
        <input
          type={visible ? 'text' : 'password'}
          readOnly
          value={password}
          className="password-generator__display"
          aria-label="Generated password"
          placeholder="Click Generate"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="password-generator__display-actions">
          <button
            type="button"
            onClick={handleCopy}
            className="password-generator__icon-btn"
            disabled={!password}
            aria-label={copied ? 'Password copied' : 'Copy password to clipboard'}
            title={copied ? 'Copied' : 'Copy'}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="password-generator__icon-btn"
            disabled={!password}
            aria-label={visible ? 'Hide password' : 'Show password'}
            title={visible ? 'Hide' : 'Show'}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
