import { getQrContrastRatio, isValidHexColor, type QrCustomization } from '../../../utils/qrCode';

interface QrCodeCustomizationProps {
  value: QrCustomization;
  onChange: (updates: Partial<QrCustomization>) => void;
}

function ColorControl({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = isValidHexColor(value);
  return (
    <div className="qr-tool__color-field">
      <label htmlFor={`${id}-hex`}>{label}</label>
      <div className="qr-tool__color-inputs">
        <input
          aria-label={`${label} color picker`}
          type="color"
          value={valid ? value : '#000000'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <input
          id={`${id}-hex`}
          type="text"
          value={value}
          maxLength={7}
          spellCheck={false}
          placeholder="#RRGGBB"
          aria-invalid={!valid}
          aria-describedby={!valid ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {!valid && <span id={`${id}-error`} className="qr-tool__field-error">Use a six-digit hex color, such as #2563EB.</span>}
    </div>
  );
}

export default function QrCodeCustomization({ value, onChange }: QrCodeCustomizationProps) {
  const contrastBackground = value.transparentBackground ? '#FFFFFF' : value.backgroundColor;
  const contrastRatio = getQrContrastRatio(value.foregroundColor, contrastBackground);

  return (
    <section className="qr-tool__card" aria-labelledby="qr-customize-heading">
      <div className="qr-tool__section-heading">
        <div>
          <span className="qr-tool__eyebrow">Step 2</span>
          <h2 id="qr-customize-heading">Customize your code</h2>
        </div>
      </div>

      <div className="qr-tool__color-grid">
        <ColorControl
          id="qr-foreground"
          label="Foreground"
          value={value.foregroundColor}
          onChange={(foregroundColor) => onChange({ foregroundColor })}
        />
        <ColorControl
          id="qr-background"
          label="Background"
          value={value.backgroundColor}
          onChange={(backgroundColor) => onChange({ backgroundColor })}
        />
      </div>

      <label className="qr-tool__check" htmlFor="qr-transparent">
        <input
          id="qr-transparent"
          type="checkbox"
          checked={value.transparentBackground}
          onChange={(event) => onChange({ transparentBackground: event.target.checked })}
        />
        <span>Transparent background</span>
      </label>

      {isValidHexColor(value.foregroundColor) && isValidHexColor(contrastBackground) && contrastRatio < 4.5 && (
        <p className="qr-tool__warning" role="status">
          Low color contrast ({contrastRatio.toFixed(1)}:1) may make this QR code difficult to scan. Choose a darker foreground or lighter background.
        </p>
      )}

      <div className="qr-tool__settings-grid">
        <div className="qr-tool__field">
          <label htmlFor="qr-size">Image size</label>
          <select id="qr-size" value={value.size} onChange={(event) => onChange({ size: Number(event.target.value) })}>
            <option value={192}>Small · 192 px</option>
            <option value={256}>Medium · 256 px</option>
            <option value={320}>Large · 320 px</option>
            <option value={512}>Extra large · 512 px</option>
          </select>
        </div>
        <div className="qr-tool__field">
          <label htmlFor="qr-correction">Error correction</label>
          <select id="qr-correction" value={value.errorCorrectionLevel} onChange={(event) => onChange({ errorCorrectionLevel: event.target.value as QrCustomization['errorCorrectionLevel'] })}>
            <option value="L">Low · 7%</option>
            <option value="M">Medium · 15%</option>
            <option value="Q">Quartile · 25%</option>
            <option value="H">High · 30%</option>
          </select>
        </div>
      </div>

      <label className="qr-tool__check" htmlFor="qr-margin">
        <input
          id="qr-margin"
          type="checkbox"
          checked={value.includeMargin}
          onChange={(event) => onChange({ includeMargin: event.target.checked })}
        />
        <span>Include scan margin (recommended)</span>
      </label>
    </section>
  );
}
