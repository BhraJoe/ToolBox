import { useMemo, useState } from 'react';
import { Copy, Download, Dice5, RotateCcw } from 'lucide-react';
import {
  BORDER_STYLES,
  buildDownloadableBorderCss,
  clampRadiusValue,
  createDefaultConfig,
  generateBorderCss,
  getActivePresetName,
  getBorderValueCss,
  parseColorInput,
  randomBorderConfig,
  type BorderGeneratorConfig,
} from '../../../utils/border';

type Feedback = { kind: 'success' | 'error'; text: string };
const SIDE_KEYS = ['top', 'right', 'bottom', 'left'] as const;

function formatRadiusValue(value: string): string {
  if (value.includes('%')) return value;
  const num = clampRadiusValue(parseInt(value.replace('px', ''), 10) || 0);
  return `${num}px`;
}

function clampRadiusString(value: string): string {
  if (value.includes('%')) return value;
  const num = clampRadiusValue(parseInt(value.replace('px', ''), 10) || 0);
  return `${num}px`;
}

export default function BorderGenerator() {
  const [config, setConfig] = useState<BorderGeneratorConfig>(createDefaultConfig());
  const [uniformWidth, setUniformWidth] = useState(true);
  const [uniformStyle, setUniformStyle] = useState(true);
  const [uniformColor, setUniformColor] = useState(true);
  const [uniformRadius, setUniformRadius] = useState(true);
  const [previewBackground, setPreviewBackground] = useState('#f8fafc');
  const [previewBoxBg, setPreviewBoxBg] = useState('#ffffff');
  const [borderColorDrafts, setBorderColorDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const css = useMemo(() => generateBorderCss(config), [config]);
  const activePresetName = useMemo(() => getActivePresetName(config), [config]);
  const borderValue = useMemo(() => getBorderValueCss(config), [config]);

  const showFeedback = (kind: Feedback['kind'], text: string) => {
    setFeedback({ kind, text });
    window.setTimeout(() => setFeedback(null), 3000);
  };

  const updateWidths = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    const v = value === '0' ? '0' : `${value}px`;
    setConfig((current) => ({
      ...current,
      widths: { ...current.widths, [side]: v },
    }));
  };

  const updateStyles = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    setConfig((current) => ({
      ...current,
      styles: { ...current.styles, [side]: value },
    }));
  };

  const updateColors = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    const parsed = parseColorInput(value);
    setConfig((current) => ({
      ...current,
      colors: { ...current.colors, [side]: parsed },
    }));
    setBorderColorDrafts((drafts) => ({ ...drafts, [side]: value }));
  };

  const updateRadius = (corner: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft', value: string) => {
    const clamped = clampRadiusString(value);
    setConfig((current) => ({
      ...current,
      radius: { ...current.radius, [corner]: clamped },
    }));
  };

  const setAllWidths = (value: string) => {
    const v = value === '0' ? '0' : `${value}px`;
    setUniformWidth(true);
    setConfig((current) => ({
      ...current,
      widths: { top: v, right: v, bottom: v, left: v },
    }));
  };

  const setAllStyles = (value: string) => {
    setUniformStyle(true);
    setConfig((current) => ({
      ...current,
      styles: { top: value, right: value, bottom: value, left: value },
    }));
  };

  const setAllRadii = (value: string) => {
    const clamped = clampRadiusString(value);
    setUniformRadius(true);
    setConfig((current) => ({
      ...current,
      radius: { topLeft: clamped, topRight: clamped, bottomRight: clamped, bottomLeft: clamped },
    }));
  };

  const toggleSide = () => {
    setUniformWidth(false);
    setUniformStyle(false);
    setUniformColor(false);
  };

  const reset = () => {
    setConfig(createDefaultConfig());
    setUniformWidth(true);
    setUniformStyle(true);
    setUniformColor(true);
    setUniformRadius(true);
    setBorderColorDrafts({});
    setPreviewBackground('#f8fafc');
    setPreviewBoxBg('#ffffff');
    showFeedback('success', 'Border settings reset.');
  };

  const randomize = () => {
    const next = randomBorderConfig();
    setConfig(next);
    setUniformWidth(false);
    setUniformStyle(false);
    setUniformColor(false);
    setUniformRadius(false);
    showFeedback('success', 'A new border style has been generated.');
  };

  const copyText = async (text: string, label: string) => {
    if (typeof navigator.clipboard?.writeText !== 'function') {
      showFeedback('error', 'Clipboard access is not available in this browser.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showFeedback('success', `${label} copied to the clipboard.`);
    } catch {
      showFeedback('error', `Unable to copy ${label.toLowerCase()}. Check browser permissions and try again.`);
    }
  };

  const downloadCss = () => {
    const blob = new Blob([buildDownloadableBorderCss(config)], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'border-generator.css';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showFeedback('success', 'CSS file downloaded.');
  };

  const getWidthValue = (side: 'top' | 'right' | 'bottom' | 'left'): string => config.widths[side];

  const previewStyle = {
    backgroundColor: previewBackground,
  } as React.CSSProperties;

  const boxStyle = {
    backgroundColor: previewBoxBg,
    borderTopWidth: config.widths.top === '0' ? '0' : config.widths.top,
    borderTopStyle: config.styles.top,
    borderTopColor: config.colors.top,
    borderRightWidth: config.widths.right === '0' ? '0' : config.widths.right,
    borderRightStyle: config.styles.right,
    borderRightColor: config.colors.right,
    borderBottomWidth: config.widths.bottom === '0' ? '0' : config.widths.bottom,
    borderBottomStyle: config.styles.bottom,
    borderBottomColor: config.colors.bottom,
    borderLeftWidth: config.widths.left === '0' ? '0' : config.widths.left,
    borderLeftStyle: config.styles.left,
    borderLeftColor: config.colors.left,
    borderTopLeftRadius: formatRadiusValue(config.radius.topLeft),
    borderTopRightRadius: formatRadiusValue(config.radius.topRight),
    borderBottomRightRadius: formatRadiusValue(config.radius.bottomRight),
    borderBottomLeftRadius: formatRadiusValue(config.radius.bottomLeft),
  } as React.CSSProperties;

  const borderStyleOptions = BORDER_STYLES.map((style) => style);

  return (
    <div className="border-tool">
      <div className="border-tool__toolbar">
        <div className="border-tool__toolbar-status">
          <strong>Border Generator</strong>
          <span>{activePresetName ? `${activePresetName} active` : 'Custom border'} · updates live</span>
        </div>
        <div className="border-tool__toolbar-actions">
          <button type="button" className="tool-button tool-button--secondary" onClick={randomize}>
            <Dice5 size={16} aria-hidden="true" /> Randomize
          </button>
          <button type="button" className="tool-button tool-button--secondary" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
      </div>

      <div className="border-tool__layout">
        <aside className="border-tool__controls-column">
          <section className="tool-card" aria-labelledby="border-width-title">
            <div className="tool-card__header">
              <h2 id="border-width-title">Border width</h2>
              <p>Set the thickness of each border side.</p>
            </div>

            <label className="border-tool__toggle">
              <span>
                <strong>Uniform width</strong>
                <small>Use one width for all sides</small>
              </span>
              <input
                type="checkbox"
                checked={uniformWidth}
                onChange={(event) => setUniformWidth(event.target.checked)}
                aria-label="Uniform border width"
              />
            </label>

            {uniformWidth ? (
              <div className="field-group">
                <label className="field-label">Border width</label>
                <div className="range-row">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={config.widths.top.replace('px', '')}
                    onChange={(event) => setAllWidths(event.target.value)}
                    aria-label="Border width"
                  />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={config.widths.top.replace('px', '')}
                    onChange={(event) => setAllWidths(event.target.value)}
                    aria-label="Border width value"
                  />
                  <span>px</span>
                </div>
              </div>
            ) : (
              <>
                <div className="field-group">
                  <label className="field-label">Top</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={getWidthValue('top').replace('px', '')}
                      onChange={(event) => updateWidths('top', event.target.value)}
                      aria-label="Top border width"
                    />
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      value={getWidthValue('top').replace('px', '')}
                      onChange={(event) => updateWidths('top', event.target.value)}
                      aria-label="Top border width value"
                    />
                    <span>px</span>
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Right</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={getWidthValue('right').replace('px', '')}
                      onChange={(event) => updateWidths('right', event.target.value)}
                      aria-label="Right border width"
                    />
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      value={getWidthValue('right').replace('px', '')}
                      onChange={(event) => updateWidths('right', event.target.value)}
                      aria-label="Right border width value"
                    />
                    <span>px</span>
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Bottom</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={getWidthValue('bottom').replace('px', '')}
                      onChange={(event) => updateWidths('bottom', event.target.value)}
                      aria-label="Bottom border width"
                    />
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      value={getWidthValue('bottom').replace('px', '')}
                      onChange={(event) => updateWidths('bottom', event.target.value)}
                      aria-label="Bottom border width value"
                    />
                    <span>px</span>
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Left</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={getWidthValue('left').replace('px', '')}
                      onChange={(event) => updateWidths('left', event.target.value)}
                      aria-label="Left border width"
                    />
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      value={getWidthValue('left').replace('px', '')}
                      onChange={(event) => updateWidths('left', event.target.value)}
                      aria-label="Left border width value"
                    />
                    <span>px</span>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="tool-card" aria-labelledby="border-style-title">
            <div className="tool-card__header">
              <h2 id="border-style-title">Border style</h2>
              <p>Choose the line style for each border side.</p>
            </div>

            {uniformStyle ? (
              <div className="field-group">
                <label className="field-label">Style</label>
                <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Border style">
                  {borderStyleOptions.map((style) => (
                    <button
                      key={style}
                      type="button"
                      role="radio"
                      aria-checked={config.styles.top === style}
                      className={`segmented-control${config.styles.top === style ? ' segmented-control--active' : ''}`}
                      onClick={() => setAllStyles(style)}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="field-group">
                  <label className="field-label">Top style</label>
                  <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Top border style">
                    {borderStyleOptions.map((style) => (
                      <button
                        key={style}
                        type="button"
                        role="radio"
                        aria-checked={config.styles.top === style}
                        className={`segmented-control${config.styles.top === style ? ' segmented-control--active' : ''}`}
                        onClick={() => updateStyles('top', style)}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Right style</label>
                  <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Right border style">
                    {borderStyleOptions.map((style) => (
                      <button
                        key={style}
                        type="button"
                        role="radio"
                        aria-checked={config.styles.right === style}
                        className={`segmented-control${config.styles.right === style ? ' segmented-control--active' : ''}`}
                        onClick={() => updateStyles('right', style)}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Bottom style</label>
                  <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Bottom border style">
                    {borderStyleOptions.map((style) => (
                      <button
                        key={style}
                        type="button"
                        role="radio"
                        aria-checked={config.styles.bottom === style}
                        className={`segmented-control${config.styles.bottom === style ? ' segmented-control--active' : ''}`}
                        onClick={() => updateStyles('bottom', style)}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Left style</label>
                  <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Left border style">
                    {borderStyleOptions.map((style) => (
                      <button
                        key={style}
                        type="button"
                        role="radio"
                        aria-checked={config.styles.left === style}
                        className={`segmented-control${config.styles.left === style ? ' segmented-control--active' : ''}`}
                        onClick={() => updateStyles('left', style)}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="tool-card" aria-labelledby="border-color-title">
            <div className="tool-card__header">
              <h2 id="border-color-title">Border color</h2>
              <p>Pick the color for each border side.</p>
            </div>

            {uniformColor ? (
              <div className="field-group">
                <label className="field-label">Border color</label>
                <div className="border-tool__color-row">
                  <input
                    type="color"
                    value={config.colors.top}
                    onChange={(event) => updateColors('top', event.target.value)}
                    aria-label="Border color"
                  />
                  <input
                    type="text"
                    value={borderColorDrafts.top ?? config.colors.top}
                    onChange={(event) => updateColors('top', event.target.value)}
                    onBlur={() => setBorderColorDrafts((current) => ({ ...current, top: '' }))}
                    aria-label="Border color hexadecimal value"
                    spellCheck={false}
                  />
                  <span>{config.colors.top}</span>
                </div>
              </div>
            ) : (
              <>
                {SIDE_KEYS.map((side) => (
                  <div className="field-group" key={side}>
                    <label className="field-label">{side.charAt(0).toUpperCase() + side.slice(1)} color</label>
                    <div className="border-tool__color-row">
                      <input
                        type="color"
                        value={config.colors[side]}
                        onChange={(event) => updateColors(side, event.target.value)}
                        aria-label={`${side} border color`}
                      />
                      <input
                        type="text"
                        value={borderColorDrafts[side] ?? config.colors[side]}
                        onChange={(event) => updateColors(side, event.target.value)}
                        onBlur={() => setBorderColorDrafts((current) => ({ ...current, [side]: '' }))}
                        aria-label={`${side} border color hexadecimal value`}
                        spellCheck={false}
                      />
                      <span>{config.colors[side]}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>

          <section className="tool-card" aria-labelledby="border-radius-title">
            <div className="tool-card__header">
              <h2 id="border-radius-title">Border radius</h2>
              <p>Round the corners of the preview box.</p>
            </div>

            {uniformRadius ? (
              <>
                <div className="field-group">
                  <label className="field-label">Border radius</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.topLeft.replace('px', '')}
                      onChange={(event) => setAllRadii(event.target.value)}
                      aria-label="Border radius"
                    />
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.topLeft.replace('px', '')}
                      onChange={(event) => setAllRadii(event.target.value)}
                      aria-label="Border radius value"
                    />
                    <span>px</span>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Quick shapes</label>
                  <div className="segmented-group" role="radiogroup" aria-label="Quick shape presets">
                    {[
                      { name: 'Square', value: '0px' },
                      { name: 'Slightly Rounded', value: '6px' },
                      { name: 'Rounded', value: '16px' },
                      { name: 'Pill', value: '9999px' },
                      { name: 'Circle', value: '50%' },
                    ].map((shape) => (
                      <button
                        key={shape.value}
                        type="button"
                        role="radio"
                        aria-checked={config.radius.topLeft === shape.value}
                        className={`segmented-control${config.radius.topLeft === shape.value ? ' segmented-control--active' : ''}`}
                        onClick={() => setAllRadii(shape.value)}
                      >
                        {shape.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="field-group">
                  <label className="field-label">Top-left</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.topLeft.replace('px', '')}
                      onChange={(event) => updateRadius('topLeft', event.target.value)}
                      aria-label="Top-left border radius"
                    />
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.topLeft.replace('px', '')}
                      onChange={(event) => updateRadius('topLeft', event.target.value)}
                      aria-label="Top-left border radius value"
                    />
                    <span>px</span>
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Top-right</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.topRight.replace('px', '')}
                      onChange={(event) => updateRadius('topRight', event.target.value)}
                      aria-label="Top-right border radius"
                    />
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.topRight.replace('px', '')}
                      onChange={(event) => updateRadius('topRight', event.target.value)}
                      aria-label="Top-right border radius value"
                    />
                    <span>px</span>
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Bottom-right</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.bottomRight.replace('px', '')}
                      onChange={(event) => updateRadius('bottomRight', event.target.value)}
                      aria-label="Bottom-right border radius"
                    />
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.bottomRight.replace('px', '')}
                      onChange={(event) => updateRadius('bottomRight', event.target.value)}
                      aria-label="Bottom-right border radius value"
                    />
                    <span>px</span>
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Bottom-left</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.bottomLeft.replace('px', '')}
                      onChange={(event) => updateRadius('bottomLeft', event.target.value)}
                      aria-label="Bottom-left border radius"
                    />
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      value={config.radius.bottomLeft.replace('px', '')}
                      onChange={(event) => updateRadius('bottomLeft', event.target.value)}
                      aria-label="Bottom-left border radius value"
                    />
                    <span>px</span>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="tool-card" aria-labelledby="border-sides-title">
            <div className="tool-card__header">
              <h2 id="border-sides-title">Border sides</h2>
              <p>Choose which sides receive the border styling.</p>
            </div>

            <div className="border-tool__side-selector" role="radiogroup" aria-label="Border sides">
              <button
                type="button"
                className={`border-tool__side-btn${uniformWidth && uniformStyle && uniformColor ? ' border-tool__side-btn--active' : ''}`}
                onClick={() => {
                  setUniformWidth(true);
                  setUniformStyle(true);
                  setUniformColor(true);
                }}
                aria-pressed={uniformWidth && uniformStyle && uniformColor}
                title="All sides"
              >
                <span className="border-tool__side-visual" aria-hidden="true">
                  <span className="border-tool__side-border" />
                </span>
                <span className="border-tool__side-label">All</span>
              </button>
              <button
                type="button"
                className={`border-tool__side-btn${!uniformWidth && !uniformStyle && !uniformColor ? ' border-tool__side-btn--active' : ''}`}
                onClick={() => toggleSide('top')}
                aria-pressed={!uniformWidth && !uniformStyle && !uniformColor}
                title="Top only"
              >
                <span className="border-tool__side-visual" aria-hidden="true">
                  <span className="border-tool__side-border border-tool__side-border--top" />
                </span>
                <span className="border-tool__side-label">Top</span>
              </button>
              <button
                type="button"
                className={`border-tool__side-btn${!uniformWidth && !uniformStyle && !uniformColor ? ' border-tool__side-btn--active' : ''}`}
                onClick={() => toggleSide('right')}
                aria-pressed={!uniformWidth && !uniformStyle && !uniformColor}
                title="Right only"
              >
                <span className="border-tool__side-visual" aria-hidden="true">
                  <span className="border-tool__side-border border-tool__side-border--right" />
                </span>
                <span className="border-tool__side-label">Right</span>
              </button>
              <button
                type="button"
                className={`border-tool__side-btn${!uniformWidth && !uniformStyle && !uniformColor ? ' border-tool__side-btn--active' : ''}`}
                onClick={() => toggleSide('bottom')}
                aria-pressed={!uniformWidth && !uniformStyle && !uniformColor}
                title="Bottom only"
              >
                <span className="border-tool__side-visual" aria-hidden="true">
                  <span className="border-tool__side-border border-tool__side-border--bottom" />
                </span>
                <span className="border-tool__side-label">Bottom</span>
              </button>
              <button
                type="button"
                className={`border-tool__side-btn${!uniformWidth && !uniformStyle && !uniformColor ? ' border-tool__side-btn--active' : ''}`}
                onClick={() => toggleSide('left')}
                aria-pressed={!uniformWidth && !uniformStyle && !uniformColor}
                title="Left only"
              >
                <span className="border-tool__side-visual" aria-hidden="true">
                  <span className="border-tool__side-border border-tool__side-border--left" />
                </span>
                <span className="border-tool__side-label">Left</span>
              </button>
            </div>
          </section>
        </aside>

        <div className="border-tool__preview-column">
          <section className="tool-card tool-card--preview" aria-labelledby="border-preview-title">
            <div className="tool-card__header tool-card__header--split">
              <h2 id="border-preview-title">Live preview</h2>
              <button type="button" className="border-tool__text-button" onClick={() => {
                setPreviewBackground('#f8fafc');
                setPreviewBoxBg('#ffffff');
              }}>
                <RotateCcw size={14} aria-hidden="true" /> Reset colors
              </button>
            </div>

            <div className="border-tool__preview-wrap">
              <div className="border-tool__preview-box-container" style={previewStyle}>
                <div className="border-tool__preview-box" style={boxStyle}>
                  <span>Preview box</span>
                  <small>border</small>
                </div>
              </div>
            </div>

            <div className="border-tool__preview-colors">
              <label>
                <span>Background</span>
                <input
                  type="color"
                  value={previewBackground}
                  onChange={(event) => setPreviewBackground(event.target.value)}
                  aria-label="Preview background color"
                />
              </label>
              <label>
                <span>Box color</span>
                <input
                  type="color"
                  value={previewBoxBg}
                  onChange={(event) => setPreviewBoxBg(event.target.value)}
                  aria-label="Preview box color"
                />
              </label>
            </div>
          </section>

          <section className="tool-card" aria-labelledby="border-css-title">
            <div className="tool-card__header">
              <h2 id="border-css-title">Generated CSS</h2>
              <p>Copy or download the CSS for your border.</p>
            </div>

            <div className="code-block">
              <pre>{css}</pre>
            </div>

            <div className="tool-card__actions">
              <button type="button" className="tool-button tool-button--secondary" onClick={() => void copyText(css, 'CSS')}>
                <Copy size={15} aria-hidden="true" /> Copy CSS
              </button>
              <button type="button" className="tool-button tool-button--secondary" onClick={() => void copyText(borderValue, 'Border value')}>
                <Copy size={15} aria-hidden="true" /> Copy Border Value
              </button>
              <button type="button" className="tool-button tool-button--primary" onClick={downloadCss}>
                <Download size={15} aria-hidden="true" /> Download CSS
              </button>
            </div>
          </section>
        </div>
      </div>

      <section className="border-tool__help" aria-labelledby="border-help-title">
        <div className="tool-card">
          <div className="tool-card__header">
            <h2 id="border-help-title">Beginner guide</h2>
          </div>
          <ul className="help-list">
            <li><strong>What is a CSS border?</strong> A border is a line drawn around the padding edge of an element, inside any margin and outside any padding.</li>
            <li><strong>Width, style, color.</strong> Every border needs a width (thickness), a style (solid, dashed, dotted, etc.), and a color. All three must be present for a visible border.</li>
            <li><strong>Border vs border-radius.</strong> <code>border</code> draws an outline around the element; <code>border-radius</code> rounds its corners independently.</li>
            <li><strong>Individual sides.</strong> You can set different widths, styles, and colors on the top, right, bottom, and left sides independently.</li>
            <li><strong>Borders vs outlines.</strong> Borders take up layout space (affecting element size); outlines do not and are drawn outside the element's box.</li>
            <li><strong>Border image.</strong> <code>border-image</code> lets you use an image instead of a solid color or pattern for the border.</li>
            <li><strong>Percentage radii.</strong> Using percentages (e.g. <code>50%</code>) on <code>border-radius</code> creates elliptical corner rounding relative to the element's dimensions.</li>
          </ul>
        </div>
      </section>

      {feedback && (
        <p className={`feedback feedback--${feedback.kind}`} role="status">
          {feedback.text}
        </p>
      )}
    </div>
  );
}