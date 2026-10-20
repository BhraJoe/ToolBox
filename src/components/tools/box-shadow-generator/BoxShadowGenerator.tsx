import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Dice5,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  buildDownloadableShadowCss,
  buildShadowValue,
  clampShadowValue,
  createShadowLayer,
  DEFAULT_SHADOW,
  matchesPreset,
  PREVIEW_DEFAULTS,
  SHADOW_PRESETS,
  type ShadowLayer,
} from '../../../utils/boxShadow';

type Feedback = { kind: 'success' | 'error'; text: string };
type NumericField = 'x' | 'y' | 'blur' | 'spread' | 'opacity';

const NUMERIC_FIELDS: { key: NumericField; label: string; min: number; max: number; unit: string }[] = [
  { key: 'x', label: 'Horizontal offset', min: -100, max: 100, unit: 'px' },
  { key: 'y', label: 'Vertical offset', min: -100, max: 100, unit: 'px' },
  { key: 'blur', label: 'Blur radius', min: 0, max: 100, unit: 'px' },
  { key: 'spread', label: 'Spread radius', min: -50, max: 100, unit: 'px' },
  { key: 'opacity', label: 'Shadow opacity', min: 0, max: 100, unit: '%' },
];

function randomInteger(min: number, max: number): number {
  return Math.round(Math.random() * (max - min) + min);
}

function randomColor(): string {
  return `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0').toUpperCase()}`;
}

export default function BoxShadowGenerator() {
  const [layers, setLayers] = useState<ShadowLayer[]>(() => [createShadowLayer()]);
  const [selectedId, setSelectedId] = useState(layers[0].id);
  const [previewColors, setPreviewColors] = useState(PREVIEW_DEFAULTS);
  const [colorDrafts, setColorDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const selectedLayer = layers.find((layer) => layer.id === selectedId) ?? layers[0];
  const shadowValue = useMemo(() => buildShadowValue(layers), [layers]);
  const declaration = `box-shadow: ${shadowValue};`;
  const selectedPreset = layers.length === 1
    ? SHADOW_PRESETS.find((preset) => matchesPreset(layers[0], preset))?.name
    : undefined;

  const updateLayer = (id: string, updates: Partial<Omit<ShadowLayer, 'id'>>) => {
    setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, ...updates } : layer));
  };

  const updateNumeric = (key: NumericField, value: number, min: number, max: number) => {
    updateLayer(selectedLayer.id, { [key]: clampShadowValue(value, min, max) });
  };

  const applyPreset = (presetName: string) => {
    const preset = SHADOW_PRESETS.find((item) => item.name === presetName);
    if (!preset) return;
    const layer = createShadowLayer(preset.settings);
    setLayers([layer]);
    setSelectedId(layer.id);
    setColorDrafts({});
    setFeedback({ kind: 'success', text: `${preset.name} preset applied.` });
  };

  const reset = () => {
    const layer = createShadowLayer(DEFAULT_SHADOW);
    setLayers([layer]);
    setSelectedId(layer.id);
    setPreviewColors(PREVIEW_DEFAULTS);
    setColorDrafts({});
    setFeedback({ kind: 'success', text: 'Shadow settings reset.' });
  };

  const randomize = () => {
    const count = randomInteger(1, 3);
    const nextLayers = Array.from({ length: count }, (_, index) => createShadowLayer({
      x: randomInteger(-24, 24),
      y: randomInteger(-8, 32),
      blur: randomInteger(0, 48),
      spread: randomInteger(-12, 8),
      color: randomColor(),
      opacity: randomInteger(10, 72),
      inset: index > 0 && Math.random() > 0.7,
    }));
    setLayers(nextLayers);
    setSelectedId(nextLayers[0].id);
    setColorDrafts({});
    setFeedback({ kind: 'success', text: 'A new shadow has been generated.' });
  };

  const addLayer = () => {
    const { id: _id, ...settings } = selectedLayer;
    const layer = createShadowLayer(settings);
    setLayers((current) => [...current, layer]);
    setSelectedId(layer.id);
    setFeedback(null);
  };

  const removeLayer = (id: string) => {
    if (layers.length <= 1) return;
    const index = layers.findIndex((layer) => layer.id === id);
    const remaining = layers.filter((layer) => layer.id !== id);
    setLayers(remaining);
    if (selectedId === id) setSelectedId(remaining[Math.max(0, index - 1)].id);
    setColorDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const moveLayer = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= layers.length) return;
    setLayers((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const copyText = async (text: string, label: string) => {
    if (typeof navigator.clipboard?.writeText !== 'function') {
      setFeedback({ kind: 'error', text: 'Clipboard access is not available in this browser.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ kind: 'success', text: `${label} copied to the clipboard.` });
    } catch {
      setFeedback({ kind: 'error', text: `Unable to copy ${label.toLowerCase()}. Check browser permissions and try again.` });
    }
  };

  const downloadCss = () => {
    const blob = new Blob([buildDownloadableShadowCss(shadowValue)], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'box-shadow.css';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback({ kind: 'success', text: 'CSS file downloaded.' });
  };

  const updateColor = (value: string) => {
    setColorDrafts((current) => ({ ...current, [selectedLayer.id]: value }));
    if (/^#[\da-f]{6}$/i.test(value)) updateLayer(selectedLayer.id, { color: value.toUpperCase() });
  };

  return (
    <div className="shadow-tool">
      <div className="shadow-tool__toolbar">
        <div className="shadow-tool__toolbar-copy">
          <strong>Shadow recipe</strong>
          <span>{layers.length} {layers.length === 1 ? 'layer' : 'layers'} · updates live</span>
        </div>
        <div className="shadow-tool__toolbar-actions">
          <button type="button" className="shadow-tool__button" onClick={randomize}>
            <Dice5 size={16} aria-hidden="true" /> Randomize
          </button>
          <button type="button" className="shadow-tool__button" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
      </div>

      <div className="shadow-tool__layout">
        <section className="shadow-tool__panel shadow-tool__controls" aria-labelledby="shadow-controls-title">
          <div className="shadow-tool__panel-heading">
            <div>
              <h2 id="shadow-controls-title">Shadow controls</h2>
              <p>Fine-tune each layer of your shadow.</p>
            </div>
          </div>

          <div className="shadow-tool__layers" aria-label="Shadow layers">
            {layers.map((layer, index) => (
              <div className={`shadow-tool__layer-row${selectedId === layer.id ? ' is-selected' : ''}`} key={layer.id}>
                <button
                  type="button"
                  className="shadow-tool__layer-select"
                  aria-pressed={selectedId === layer.id}
                  onClick={() => setSelectedId(layer.id)}
                >
                  <span className="shadow-tool__layer-index">{String(index + 1).padStart(2, '0')}</span>
                  <span>Shadow layer {index + 1}</span>
                </button>
                <div className="shadow-tool__layer-actions">
                  <button type="button" className="shadow-tool__icon-button" onClick={() => moveLayer(index, -1)} disabled={index === 0} aria-label={`Move layer ${index + 1} up`} title="Move up">
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="shadow-tool__icon-button" onClick={() => moveLayer(index, 1)} disabled={index === layers.length - 1} aria-label={`Move layer ${index + 1} down`} title="Move down">
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="shadow-tool__icon-button shadow-tool__icon-button--danger" onClick={() => removeLayer(layer.id)} disabled={layers.length === 1} aria-label={`Remove layer ${index + 1}`} title="Remove layer">
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="shadow-tool__add-layer" onClick={addLayer}>
              <Plus size={15} aria-hidden="true" /> Add shadow layer
            </button>
          </div>

          <div className="shadow-tool__numeric-fields">
            {NUMERIC_FIELDS.map(({ key, label, min, max, unit }) => (
              <div className="shadow-tool__field" key={key}>
                <div className="shadow-tool__field-heading">
                  <label htmlFor={`shadow-${key}`}>{label}</label>
                  <span>{min} to {max} {unit}</span>
                </div>
                <div className="shadow-tool__numeric-control">
                  <input
                    id={`shadow-${key}`}
                    type="range"
                    min={min}
                    max={max}
                    step="1"
                    value={selectedLayer[key]}
                    onChange={(event) => updateNumeric(key, Number(event.target.value), min, max)}
                    aria-label={`${label} in ${unit}`}
                  />
                  <div className="shadow-tool__number-wrap">
                    <input
                      type="number"
                      min={min}
                      max={max}
                      step="1"
                      value={selectedLayer[key]}
                      onChange={(event) => updateNumeric(key, Number(event.target.value), min, max)}
                      aria-label={`${label} value in ${unit}`}
                    />
                    <span>{unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="shadow-tool__field">
            <label className="shadow-tool__field-label" htmlFor="shadow-color-text">Shadow color</label>
            <div className="shadow-tool__color-row">
              <input
                type="color"
                value={selectedLayer.color}
                onChange={(event) => {
                  updateLayer(selectedLayer.id, { color: event.target.value.toUpperCase() });
                  setColorDrafts((current) => ({ ...current, [selectedLayer.id]: event.target.value.toUpperCase() }));
                }}
                aria-label="Choose shadow color"
              />
              <input
                id="shadow-color-text"
                type="text"
                value={colorDrafts[selectedLayer.id] ?? selectedLayer.color}
                onChange={(event) => updateColor(event.target.value)}
                onBlur={() => setColorDrafts((current) => ({ ...current, [selectedLayer.id]: selectedLayer.color }))}
                aria-label="Shadow color hexadecimal value"
                aria-invalid={Boolean(colorDrafts[selectedLayer.id] && !/^#[\da-f]{6}$/i.test(colorDrafts[selectedLayer.id]))}
                spellCheck={false}
              />
            </div>
            <span className="shadow-tool__field-hint">Use a 6-digit HEX color.</span>
          </div>

          <label className="shadow-tool__toggle">
            <span>
              <strong>Inset shadow</strong>
              <small>Render the shadow inside the box.</small>
            </span>
            <input
              type="checkbox"
              checked={selectedLayer.inset}
              onChange={(event) => updateLayer(selectedLayer.id, { inset: event.target.checked })}
              aria-label="Inset shadow"
            />
          </label>
        </section>

        <div className="shadow-tool__right-column">
          <section className="shadow-tool__panel" aria-labelledby="shadow-preview-title">
            <div className="shadow-tool__panel-heading shadow-tool__panel-heading--preview">
              <div>
                <h2 id="shadow-preview-title">Live preview</h2>
                <p>See the shadow against your chosen surfaces.</p>
              </div>
              <button type="button" className="shadow-tool__text-button" onClick={() => setPreviewColors(PREVIEW_DEFAULTS)}>
                <RotateCcw size={14} aria-hidden="true" /> Reset colors
              </button>
            </div>
            <div className="shadow-tool__preview" style={{ backgroundColor: previewColors.background }}>
              <div className="shadow-tool__preview-box" style={{ backgroundColor: previewColors.box, boxShadow: shadowValue }}>
                <span>Preview box</span>
                <small>box-shadow</small>
              </div>
            </div>
            <div className="shadow-tool__preview-colors">
              <label>
                <span>Background</span>
                <input type="color" value={previewColors.background} onChange={(event) => setPreviewColors((current) => ({ ...current, background: event.target.value }))} aria-label="Preview background color" />
              </label>
              <label>
                <span>Box color</span>
                <input type="color" value={previewColors.box} onChange={(event) => setPreviewColors((current) => ({ ...current, box: event.target.value }))} aria-label="Preview box color" />
              </label>
            </div>
          </section>

          <section className="shadow-tool__panel shadow-tool__presets" aria-labelledby="shadow-presets-title">
            <div className="shadow-tool__panel-heading">
              <div>
                <h2 id="shadow-presets-title">Presets</h2>
                <p>Start with a recipe, then make it yours.</p>
              </div>
            </div>
            <div className="shadow-tool__preset-list">
              {SHADOW_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  className={`shadow-tool__preset${selectedPreset === preset.name ? ' is-active' : ''}`}
                  aria-pressed={selectedPreset === preset.name}
                  onClick={() => applyPreset(preset.name)}
                >
                  <span className="shadow-tool__preset-sample" style={{ boxShadow: buildShadowValue([createShadowLayer(preset.settings)]) }} aria-hidden="true" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="shadow-tool__panel shadow-tool__output" aria-labelledby="shadow-css-title">
            <div className="shadow-tool__panel-heading">
              <div>
                <h2 id="shadow-css-title">Generated CSS</h2>
                <p>Copy a declaration or export a reusable class.</p>
              </div>
            </div>
            <pre className="shadow-tool__code" aria-live="polite"><code><span className="shadow-tool__code-property">box-shadow</span>: {shadowValue};</code></pre>
            <div className="shadow-tool__output-actions">
              <button type="button" className="shadow-tool__button shadow-tool__button--primary" onClick={() => void copyText(declaration, 'CSS declaration')}>
                <Copy size={15} aria-hidden="true" /> Copy CSS
              </button>
              <button type="button" className="shadow-tool__button" onClick={() => void copyText(shadowValue, 'Shadow value')}>
                <Copy size={15} aria-hidden="true" /> Copy value
              </button>
              <button type="button" className="shadow-tool__button" onClick={downloadCss}>
                Download CSS
              </button>
            </div>
          </section>
        </div>
      </div>

      {feedback && <p className={`shadow-tool__feedback shadow-tool__feedback--${feedback.kind}`} role="status">{feedback.text}</p>}
    </div>
  );
}