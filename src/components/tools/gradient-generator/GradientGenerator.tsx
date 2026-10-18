import { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Dice6,
  Circle,
  ArrowUpDown,
  Maximize2,
} from 'lucide-react';
import {
  GRADIENT_TYPES,
  RADIAL_SIZES,
  RADIAL_POSITIONS,
  PRESET_GRADIENTS,
  INITIAL_CONFIG,
  buildGradientCss,
  buildDownloadableCss,
  randomStopColor,
  randomPosition,
  parseHexInput,
  parsePresetCss,
  clampAngle,
  clampPosition,
  applyPresetToConfig,
  type GradientType,
  type RadialShape,
  type RadialPosition,
  type ColorStop,
  type PresetGradient,
} from './gradientUtils';

type Feedback = { kind: 'success' | 'error'; text: string };

export default function GradientGenerator() {
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const gradientCss = useMemo(() => buildGradientCss(config), [config]);
  const downloadableCss = useMemo(() => buildDownloadableCss(config), [config]);
  const previewStyle = useMemo(() => ({ background: gradientCss }), [gradientCss]);

  const showFeedback = useCallback((kind: Feedback['kind'], text: string) => {
    setFeedback({ kind, text });
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  const setValidationError = useCallback((key: string, message: string) => {
    setValidationErrors((prev) => ({ ...prev, [key]: message }));
  }, []);

  const clearValidationError = useCallback((key: string) => {
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const updateConfig = useCallback((updates: Partial<typeof config>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateStopColor = useCallback((id: number, color: string) => {
    const parsed = parseHexInput(color);
    if (!parsed) {
      showFeedback('error', 'Invalid HEX color. Use format #RRGGBB.');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      stops: prev.stops.map((s) => (s.id === id ? { ...s, color: parsed } : s)),
    }));
    clearValidationError(`stop-${id}-color`);
  }, [clearValidationError, showFeedback]);

  const updateStopPosition = useCallback((id: number, position: string | number) => {
    const pos = clampPosition(position);
    if (pos === null) {
      showFeedback('error', 'Position must be between 0 and 100.');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      stops: prev.stops.map((s) => (s.id === id ? { ...s, position: pos } : s)),
    }));
    clearValidationError(`stop-${id}-position`);
  }, [clearValidationError, showFeedback]);

  const addColorStop = useCallback(() => {
    setConfig((prev) => {
      if (prev.stops.length >= 10) {
        showFeedback('error', 'Maximum of 10 color stops allowed.');
        return prev;
      }
      const positions = prev.stops.map((s) => s.position).sort((a, b) => a - b);
      const newPosition = positions.length > 1
        ? Math.round((positions[positions.length - 2] + positions[positions.length - 1]) / 2)
        : 50;
      const newStop: ColorStop = {
        id: Date.now(),
        color: randomStopColor(),
        position: newPosition,
      };
      return { ...prev, stops: [...prev.stops, newStop] };
    });
  }, [showFeedback]);

  const removeColorStop = useCallback((id: number) => {
    setConfig((prev) => {
      if (prev.stops.length <= 2) {
        showFeedback('error', 'At least two color stops are required.');
        return prev;
      }
      return { ...prev, stops: prev.stops.filter((s) => s.id !== id) };
    });
  }, [showFeedback]);

  const handleAngleChange = useCallback((value: number) => {
    updateConfig({ angle: clampAngle(value) });
  }, [updateConfig]);

  const handleShapeChange = useCallback((shape: RadialShape) => {
    updateConfig({ shape });
  }, [updateConfig]);

  const handleSizeChange = useCallback((size: string) => {
    updateConfig({ size });
  }, [updateConfig]);

  const handlePositionChange = useCallback((position: RadialPosition) => {
    updateConfig({ position });
  }, [updateConfig]);

  const handleTypeChange = useCallback((type: GradientType) => {
    updateConfig({ type });
  }, [updateConfig]);

  const randomize = useCallback(() => {
    setConfig((prev) => {
      const newStops: ColorStop[] = prev.stops.map((stop) => ({
        ...stop,
        color: randomStopColor(),
        position: randomPosition(),
      }));
      return {
        ...prev,
        type: Math.random() > 0.5 ? 'linear' : 'radial',
        angle: Math.round(Math.random() * 360 / 15) * 15,
        shape: Math.random() > 0.5 ? 'circle' : 'ellipse',
        size: RADIAL_SIZES[Math.floor(Math.random() * RADIAL_SIZES.length)].value,
        position: RADIAL_POSITIONS[Math.floor(Math.random() * RADIAL_POSITIONS.length)].value,
        stops: newStops,
      };
    });
    showFeedback('success', 'Random gradient generated!');
  }, [showFeedback]);

  const reset = useCallback(() => {
    setConfig(INITIAL_CONFIG);
    showFeedback('success', 'Reset to default gradient.');
  }, [showFeedback]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showFeedback('success', `${label} copied to clipboard.`);
    } catch {
      showFeedback('error', `Failed to copy ${label.toLowerCase()}.`);
    }
  }, [showFeedback]);

  const copyCss = useCallback(() => {
    copyToClipboard(`background: ${gradientCss};`, 'CSS declaration');
  }, [copyToClipboard, gradientCss]);

  const copyBackgroundValue = useCallback(() => {
    copyToClipboard(gradientCss, 'Background value');
  }, [copyToClipboard, gradientCss]);

  const downloadCss = useCallback(() => {
    const blob = new Blob([downloadableCss], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradient.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback('success', 'CSS file downloaded.');
  }, [downloadableCss, showFeedback]);

  const applyPreset = useCallback((preset: PresetGradient) => {
    const newConfig = applyPresetToConfig(preset, config);
    setConfig(newConfig);
    showFeedback('success', `Applied "${preset.name}" preset.`);
  }, [config, showFeedback]);

  const presetToSwatch = (preset: PresetGradient): string => {
    const parsed = parsePresetCss(preset.css);
    if (!parsed) return 'transparent';
    return preset.css;
  };

  return (
    <div className="gradient-tool">
      <section className="gradient-tool__header" aria-labelledby="tool-header">
        <div className="gradient-tool__header-main">
          <div className="gradient-tool__type-selector" role="radiogroup" aria-label="Gradient type">
            {GRADIENT_TYPES.map((t) => {
              const Icon = t.value === 'linear' ? ArrowUpDown : Circle;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={config.type === t.value}
                  className={`gradient-tool__type-btn${config.type === t.value ? ' gradient-tool__type-btn--active' : ''}`}
                  onClick={() => handleTypeChange(t.value)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="gradient-tool__header-actions">
          <button type="button" className="gradient-tool__btn gradient-tool__btn--secondary" onClick={randomize}>
            <Dice6 size={16} aria-hidden="true" /> Randomize
          </button>
          <button type="button" className="gradient-tool__btn gradient-tool__btn--secondary" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
      </section>

      <div className="gradient-tool__main">
        <div className="gradient-tool__controls">
          <section className="gradient-tool__card" aria-labelledby="customize-heading">
            <div className="gradient-tool__card-header">
              <h2 id="customize-heading">Customize</h2>
            </div>

            {config.type === 'linear' && (
              <div className="gradient-tool__field">
                <label htmlFor="angle" className="gradient-tool__label">Angle</label>
                <div className="gradient-tool__angle-wrapper">
                  <input
                    type="range"
                    id="angle"
                    min="0"
                    max="360"
                    step="1"
                    value={config.angle}
                    onChange={(e) => handleAngleChange(Number(e.target.value))}
                    className="gradient-tool__range"
                    aria-label="Gradient angle"
                  />
                  <input
                    type="number"
                    min="0"
                    max="360"
                    step="1"
                    value={config.angle}
                    onChange={(e) => handleAngleChange(Number(e.target.value))}
                    className="gradient-tool__angle-input"
                    aria-label="Angle in degrees"
                  />
                  <span className="gradient-tool__angle-unit">deg</span>
                </div>
              </div>
            )}

            {config.type === 'radial' && (
              <>
                <div className="gradient-tool__field">
                  <label className="gradient-tool__label">Shape</label>
                  <div className="gradient-tool__segmented" role="radiogroup" aria-label="Radial shape">
                    {(['circle', 'ellipse'] as RadialShape[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={config.shape === s}
                        className={`gradient-tool__segment${config.shape === s ? ' gradient-tool__segment--active' : ''}`}
                        onClick={() => handleShapeChange(s)}
                      >
                        {s === 'circle' ? <Circle size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
                        <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="gradient-tool__field">
                  <label htmlFor="size" className="gradient-tool__label">Size</label>
                  <select
                    id="size"
                    value={config.size}
                    onChange={(e) => handleSizeChange(e.target.value)}
                    className="gradient-tool__select"
                  >
                    {RADIAL_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="gradient-tool__field">
                  <label htmlFor="position" className="gradient-tool__label">Position</label>
                  <select
                    id="position"
                    value={config.position}
                    onChange={(e) => handlePositionChange(e.target.value as RadialPosition)}
                    className="gradient-tool__select"
                  >
                    {RADIAL_POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="gradient-tool__field gradient-tool__field--stops">
              <div className="gradient-tool__label-row">
                <label className="gradient-tool__label">Color Stops</label>
                <button
                  type="button"
                  className="gradient-tool__btn gradient-tool__btn--icon gradient-tool__btn--add-stop"
                  onClick={addColorStop}
                  aria-label="Add color stop"
                  disabled={config.stops.length >= 10}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
              <p className="gradient-tool__hint">
                {config.stops.length} / 10 stops. Drag handles to reorder (click and drag position values).
              </p>
              <div className="gradient-tool__stops-list">
                {config.stops.map((stop, index) => (
                  <div key={stop.id} className="gradient-tool__stop">
                    <div className="gradient-tool__stop-handle" aria-label="Drag to reorder">
                      <ArrowUpDown size={14} aria-hidden="true" />
                    </div>
                    <div className="gradient-tool__stop-color">
                      <input
                        type="color"
                        value={stop.color}
                        onChange={(e) => updateStopColor(stop.id, e.target.value)}
                        className="gradient-tool__color-picker"
                        aria-label={`Color ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={stop.color}
                        onChange={(e) => {
                          const parsed = parseHexInput(e.target.value);
                          if (parsed) {
                            updateStopColor(stop.id, parsed);
                            clearValidationError(`stop-${stop.id}-color`);
                          } else if (!e.target.value.trim()) {
                            clearValidationError(`stop-${stop.id}-color`);
                          } else {
                            setValidationError(`stop-${stop.id}-color`, 'Invalid HEX color');
                          }
                        }}
                        onBlur={(e) => {
                          const parsed = parseHexInput(e.target.value);
                          if (!parsed && e.target.value.trim()) {
                            showFeedback('error', 'Invalid HEX color. Use format #RRGGBB.');
                          }
                        }}
                        className={`gradient-tool__color-input${validationErrors[`stop-${stop.id}-color`] ? ' gradient-tool__color-input--error' : ''}`}
                        placeholder="#RRGGBB"
                        aria-label={`Color ${index + 1} HEX`}
                        spellCheck={false}
                        maxLength={7}
                      />
                      {validationErrors[`stop-${stop.id}-color`] && (
                        <span className="gradient-tool__error" role="alert">{validationErrors[`stop-${stop.id}-color`]}</span>
                      )}
                    </div>
                    <div className="gradient-tool__stop-position">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={stop.position}
                        onChange={(e) => updateStopPosition(stop.id, e.target.value)}
                        onBlur={(e) => {
                          const pos = clampPosition(e.target.value);
                          if (pos === null && e.target.value.trim()) {
                            showFeedback('error', 'Position must be between 0 and 100.');
                          }
                        }}
                        className={`gradient-tool__position-input${validationErrors[`stop-${stop.id}-position`] ? ' gradient-tool__position-input--error' : ''}`}
                        aria-label={`Stop ${index + 1} position`}
                      />
                      <span className="gradient-tool__position-unit">%</span>
                    </div>
                    {config.stops.length > 2 && (
                      <button
                        type="button"
                        className="gradient-tool__btn gradient-tool__btn--icon gradient-tool__btn--remove"
                        onClick={() => removeColorStop(stop.id)}
                        aria-label={`Remove stop ${index + 1}`}
                        disabled={config.stops.length <= 2}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="gradient-tool__card" aria-labelledby="presets-heading">
            <div className="gradient-tool__card-header">
              <h2 id="presets-heading">Presets</h2>
            </div>
            <div className="gradient-tool__presets-grid" role="listbox" aria-label="Gradient presets">
              {PRESET_GRADIENTS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  role="option"
                  className="gradient-tool__preset"
                  onClick={() => applyPreset(preset)}
                  style={{ background: presetToSwatch(preset) }}
                  aria-label={`Apply ${preset.name} preset`}
                >
                  <span className="gradient-tool__preset-name">{preset.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="gradient-tool__output">
          <section className="gradient-tool__card gradient-tool__preview-card" aria-labelledby="preview-heading">
            <div className="gradient-tool__card-header">
              <h2 id="preview-heading">Live Preview</h2>
              <span className="gradient-tool__preview-badge">{config.type === 'linear' ? 'Linear' : 'Radial'} Gradient</span>
            </div>
            <div
              className="gradient-tool__preview"
              style={previewStyle}
              role="img"
              aria-label={`Preview of ${config.type} gradient with ${config.stops.length} color stops`}
            />
          </section>

          <section className="gradient-tool__card gradient-tool__css-card" aria-labelledby="css-heading">
            <div className="gradient-tool__card-header">
              <h2 id="css-heading">Generated CSS</h2>
            </div>
            <pre className="gradient-tool__code" aria-label="Generated CSS code">
              <code>background: {gradientCss};</code>
            </pre>
            <div className="gradient-tool__css-actions">
              <button
                type="button"
                className="gradient-tool__btn gradient-tool__btn--secondary"
                onClick={copyBackgroundValue}
                disabled={!gradientCss}
              >
                <Copy size={15} aria-hidden="true" /> Copy Background Value
              </button>
              <button
                type="button"
                className="gradient-tool__btn gradient-tool__btn--primary"
                onClick={copyCss}
                disabled={!gradientCss}
              >
                <Copy size={15} aria-hidden="true" /> Copy CSS
              </button>
              <button
                type="button"
                className="gradient-tool__btn gradient-tool__btn--secondary"
                onClick={downloadCss}
                disabled={!gradientCss}
              >
                <ArrowUpDown size={15} aria-hidden="true" /> Download CSS
              </button>
            </div>
          </section>
        </div>
      </div>

      {feedback && (
        <p className={`gradient-tool__feedback gradient-tool__feedback--${feedback.kind}`} role="status">
          {feedback.text}
        </p>
      )}
    </div>
  );
}