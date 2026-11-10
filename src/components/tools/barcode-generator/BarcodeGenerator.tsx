import { useEffect, useMemo, useState } from 'react';
import { Check, Download, Image as ImageIcon, Printer, RotateCcw, Copy } from 'lucide-react';
import {
  BARCODE_FORMATS,
  DEFAULT_CUSTOMIZATION,
  RETAIL_DISCLAIMER,
  barcodeDownloadFilename,
  generateBarcode,
  getContrastRatio,
  isValidHexColor,
  validateBarcodeCustomization,
  validateBarcodeInput,
  type BarcodeCustomization,
  type BarcodeFormatId,
  type BarcodeGenerationResult,
} from '../../../utils/barcode';
import './barcode-generator.css';

type Feedback = { message: string; kind: 'success' | 'error' } | null;

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
    <div className="barcode-tool__color-field">
      <label htmlFor={`${id}-hex`}>{label}</label>
      <div className="barcode-tool__color-inputs">
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
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function NumberControl({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="barcode-tool__field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step ?? 1}
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="barcode-tool__field-hint">Range: {min}–{max}</span>
    </div>
  );
}

export default function BarcodeGenerator() {
  const [formatId, setFormatId] = useState<BarcodeFormatId>('code128');
  const [value, setValue] = useState('');
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [customization, setCustomization] = useState<BarcodeCustomization>({ ...DEFAULT_CUSTOMIZATION });
  const [generated, setGenerated] = useState<{ key: string; result: BarcodeGenerationResult } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const format = BARCODE_FORMATS.find((item) => item.id === formatId) ?? BARCODE_FORMATS[0];
  const validation = useMemo(
    () => validateBarcodeInput(formatId, value, autoCalculate),
    [formatId, value, autoCalculate],
  );
  const customizationError = validateBarcodeCustomization(customization);
  const contrastRatio = isValidHexColor(customization.lineColor) && isValidHexColor(customization.backgroundColor)
    ? getContrastRatio(customization.lineColor, customization.backgroundColor)
    : 0;
  const generationKey = JSON.stringify([formatId, validation.value, customization]);
  const currentResult = generated?.key === generationKey ? generated.result : null;

  useEffect(() => {
    if (!validation.valid || customizationError) return undefined;

    let active = true;
    generateBarcode(formatId, validation.value, customization).then((result) => {
      if (active) setGenerated({ key: generationKey, result });
    });

    return () => {
      active = false;
    };
  }, [formatId, validation.valid, validation.value, customization, customizationError, generationKey]);

  const updateCustomization = (updates: Partial<BarcodeCustomization>) => {
    setCustomization((current) => ({ ...current, ...updates }));
  };

  const showFeedback = (message: string, kind: NonNullable<Feedback>['kind']) => {
    setFeedback({ message, kind });
    window.setTimeout(() => setFeedback(null), 3500);
  };

  const clear = () => {
    setValue('');
    setFeedback(null);
  };

  const download = (extension: 'png' | 'svg') => {
    if (!currentResult || currentResult.error) {
      showFeedback(currentResult?.error ?? 'Enter valid content to generate a barcode first.', 'error');
      return;
    }

    const contents = extension === 'png' ? currentResult.png : currentResult.svg;
    if (!contents) {
      showFeedback(`The ${extension.toUpperCase()} export could not be generated. Try again or use the other format.`, 'error');
      return;
    }

    try {
      const blob = extension === 'png'
        ? new Blob([Uint8Array.from(atob(contents.split(',')[1]), (character) => character.charCodeAt(0))], { type: 'image/png' })
        : new Blob([contents], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = barcodeDownloadFilename(formatId, extension);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showFeedback(`${extension.toUpperCase()} download started.`, 'success');
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : `The ${extension.toUpperCase()} could not be downloaded.`, 'error');
    }
  };

  const copyEncodedText = async () => {
    if (!validation.valid) return;
    try {
      await navigator.clipboard.writeText(validation.value);
      showFeedback('Encoded barcode text copied to the clipboard.', 'success');
    } catch {
      showFeedback('Could not copy text. Check your browser clipboard permissions.', 'error');
    }
  };

  const printBarcode = () => {
    if (!currentResult?.svg || currentResult.error) return;

    let printWindow: Window | null;
    try {
      printWindow = window.open('', '_blank');
      if (!printWindow) {
        showFeedback('Printing was blocked by the browser. Allow pop-ups and try again.', 'error');
        return;
      }

      const imageUrl = URL.createObjectURL(new Blob([currentResult.svg], { type: 'image/svg+xml;charset=utf-8' }));
      printWindow.document.title = `ToolBox ${format.name} Barcode`;
      printWindow.document.body.replaceChildren();
      printWindow.document.body.style.cssText = 'margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;';
      const image = printWindow.document.createElement('img');
      image.src = imageUrl;
      image.alt = `${format.name} barcode for ${validation.value}`;
      image.style.cssText = 'display:block;width:min(90vw,1000px);height:auto;';
      image.onload = () => {
        URL.revokeObjectURL(imageUrl);
        printWindow?.focus();
        printWindow?.print();
      };
      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        printWindow?.close();
        showFeedback('The barcode could not be prepared for printing.', 'error');
      };
      printWindow.document.body.appendChild(image);
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'Printing is not available in this browser.', 'error');
    }
  };

  const contentError = validation.error || customizationError || currentResult?.error || '';
  const ready = Boolean(currentResult?.svg && !currentResult.error);
  const guidance = validation.checkDigitCalculated || validation.checkDigitValidated
    ? validation.guidance
    : format.description;
  const lowContrast = contrastRatio > 0 && contrastRatio < 4.5;

  return (
    <div className="barcode-tool">
      <div className="barcode-tool__workspace">
        <div className="barcode-tool__controls">
          <section className="barcode-tool__card" aria-labelledby="barcode-input-heading">
            <div className="barcode-tool__section-heading">
              <div>
                <span className="barcode-tool__eyebrow">Barcode details</span>
                <h2 id="barcode-input-heading">Enter your content</h2>
              </div>
            </div>

            <div className="barcode-tool__fields">
              <div className="barcode-tool__field">
                <label htmlFor="barcode-format">Barcode format</label>
                <select
                  id="barcode-format"
                  value={formatId}
                  onChange={(event) => setFormatId(event.target.value as BarcodeFormatId)}
                >
                  {BARCODE_FORMATS.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="barcode-tool__field">
                <label htmlFor="barcode-value">Barcode content</label>
                <input
                  id="barcode-value"
                  type="text"
                  value={value}
                  placeholder={format.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(validation.error)}
                  aria-describedby="barcode-guidance barcode-validation"
                  onChange={(event) => setValue(event.target.value)}
                />
                <span id="barcode-guidance" className="barcode-tool__field-hint">{guidance}</span>
                <span id="barcode-validation" className={validation.error ? 'barcode-tool__field-error' : 'barcode-tool__field-hint'} role={validation.error ? 'alert' : 'status'}>
                  {validation.error ?? ''}
                </span>
              </div>
            </div>

            {format.autoCheckDigit && (
              <label className="barcode-tool__check" htmlFor="barcode-auto-check">
                <input
                  id="barcode-auto-check"
                  type="checkbox"
                  checked={autoCalculate}
                  onChange={(event) => setAutoCalculate(event.target.checked)}
                />
                <span>Automatically calculate supported check digits</span>
              </label>
            )}
          </section>

          <section className="barcode-tool__card" aria-labelledby="barcode-customize-heading">
            <div className="barcode-tool__section-heading">
              <div>
                <span className="barcode-tool__eyebrow">Appearance</span>
                <h2 id="barcode-customize-heading">Customize barcode</h2>
              </div>
            </div>

            <div className="barcode-tool__settings-grid">
              <NumberControl id="barcode-width" label="Maximum width (px)" value={customization.width} min={120} max={1200} onChange={(width) => updateCustomization({ width })} />
              <NumberControl id="barcode-height" label="Bar height (px)" value={customization.height} min={40} max={500} onChange={(height) => updateCustomization({ height })} />
              <NumberControl id="barcode-thickness" label="Bar thickness" value={customization.barThickness} min={0.5} max={4} step={0.5} onChange={(barThickness) => updateCustomization({ barThickness })} />
              <NumberControl id="barcode-margin" label="Margin (px)" value={customization.margin} min={0} max={40} onChange={(margin) => updateCustomization({ margin })} />
            </div>

            <div className="barcode-tool__color-grid">
              <ColorControl
                id="barcode-lines"
                label="Line color"
                value={customization.lineColor}
                onChange={(lineColor) => updateCustomization({ lineColor })}
              />
              <ColorControl
                id="barcode-background"
                label="Background color"
                value={customization.backgroundColor}
                onChange={(backgroundColor) => updateCustomization({ backgroundColor })}
              />
            </div>

            <div className="barcode-tool__settings-grid barcode-tool__settings-grid--lower">
              <NumberControl id="barcode-font-size" label="Text size (px)" value={customization.fontSize} min={8} max={36} onChange={(fontSize) => updateCustomization({ fontSize })} />
              <label className="barcode-tool__check barcode-tool__check--setting" htmlFor="barcode-show-text">
                <input
                  id="barcode-show-text"
                  type="checkbox"
                  checked={customization.showText}
                  onChange={(event) => updateCustomization({ showText: event.target.checked })}
                />
                <span>Show human-readable text</span>
              </label>
            </div>

            {lowContrast && (
              <p className="barcode-tool__warning" role="status">
                Contrast is {contrastRatio.toFixed(1)}:1. Select darker bars or a lighter background to enable generation.
              </p>
            )}
            {customizationError && (
              <p className="barcode-tool__field-error" role="alert">{customizationError}</p>
            )}
          </section>

          <div className="barcode-tool__left-actions">
            <button type="button" className="barcode-tool__action barcode-tool__action--clear" onClick={clear}>
              <RotateCcw size={16} /> Clear content
            </button>
          </div>
        </div>

        <section className="barcode-tool__card barcode-tool__preview-card" aria-labelledby="barcode-preview-heading">
          <div className="barcode-tool__section-heading">
            <div>
              <span className="barcode-tool__eyebrow">Live preview</span>
              <h2 id="barcode-preview-heading">Your barcode</h2>
            </div>
            {ready && <span className="barcode-tool__ready"><Check size={14} /> Ready</span>}
          </div>

          <div
            className="barcode-tool__preview"
            style={{
              backgroundColor: isValidHexColor(customization.backgroundColor) ? customization.backgroundColor : '#FFFFFF',
            }}
          >
            {ready && currentResult?.svg ? (
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(currentResult.svg)}`}
                alt={`${format.name} barcode encoding ${validation.value}`}
                style={{ maxWidth: `${customization.width}px` }}
              />
            ) : contentError ? (
              <div className="barcode-tool__empty barcode-tool__empty--error" role="alert">
                <ImageIcon size={34} aria-hidden="true" />
                <strong>We couldn’t generate this barcode</strong>
                <span>{contentError}</span>
              </div>
            ) : (
              <div className="barcode-tool__empty">
                <ImageIcon size={34} aria-hidden="true" />
                <strong>Your preview will appear here</strong>
                <span>Enter valid content to create a live barcode preview.</span>
              </div>
            )}
          </div>

          <div className="barcode-tool__summary">
            <span className="barcode-tool__format-label">{format.name}</span>
            {validation.valid && <code>{validation.value}</code>}
            {validation.checkDigitCalculated && <span className="barcode-tool__check-result">Check digit calculated: {validation.checkDigit}</span>}
            {validation.checkDigitValidated && validation.valid && <span className="barcode-tool__check-result">Check digit validated: {validation.checkDigit}</span>}
          </div>

          <p className="barcode-tool__retail-note">{RETAIL_DISCLAIMER}</p>

          <div className="barcode-tool__actions">
            <button type="button" className="barcode-tool__action barcode-tool__action--primary" onClick={() => download('png')} disabled={!ready}>
              <Download size={16} /> Download PNG
            </button>
            <button type="button" className="barcode-tool__action" onClick={() => download('svg')} disabled={!ready}>
              <Download size={16} /> Download SVG
            </button>
            <button type="button" className="barcode-tool__action" onClick={copyEncodedText} disabled={!validation.valid}>
              <Copy size={16} /> Copy encoded text
            </button>
            <button type="button" className="barcode-tool__action" onClick={printBarcode} disabled={!ready}>
              <Printer size={16} /> Print
            </button>
          </div>

          {feedback && (
            <p className={`barcode-tool__feedback barcode-tool__feedback--${feedback.kind}`} role="status">
              {feedback.message}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
