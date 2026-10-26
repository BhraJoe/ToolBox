import { useMemo, useState } from 'react';
import { Copy, Download, Dice5, RotateCcw, Maximize2 } from 'lucide-react';
import type { TransformConfig, TransformMode } from '../../../utils/transform';
import {
  clampPerspective,
  clampRotation,
  clampScale,
  clampSkew,
  clampTranslation,
  createDefaultConfig,
  generateCss,
  getActivePresetName,
  randomTransformConfig,
} from '../../../utils/transform';

type Feedback = { kind: 'success' | 'error'; text: string };

export default function TransformGenerator() {
  const [config, setConfig] = useState<TransformConfig>(createDefaultConfig());
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const css = useMemo(() => generateCss(config), [config]);
  const activePresetName = useMemo(() => getActivePresetName(config), [config]);

  const showFeedback = (kind: Feedback['kind'], text: string) => {
    setFeedback({ kind, text });
    window.setTimeout(() => setFeedback(null), 3000);
  };

  const updateTranslateX = (value: string) => {
    setConfig((current) => ({
      ...current,
      translateX: clampTranslation(parseFloat(value) || 0),
    }));
  };

  const updateTranslateY = (value: string) => {
    setConfig((current) => ({
      ...current,
      translateY: clampTranslation(parseFloat(value) || 0),
    }));
  };

  const updateTranslateZ = (value: string) => {
    setConfig((current) => ({
      ...current,
      translateZ: clampTranslation(parseFloat(value) || 0),
    }));
  };

  const updateRotate = (value: string) => {
    setConfig((current) => ({
      ...current,
      rotate: clampRotation(parseFloat(value) || 0),
    }));
  };

  const updateRotateX = (value: string) => {
    setConfig((current) => ({
      ...current,
      rotateX: clampRotation(parseFloat(value) || 0),
    }));
  };

  const updateRotateY = (value: string) => {
    setConfig((current) => ({
      ...current,
      rotateY: clampRotation(parseFloat(value) || 0),
    }));
  };

  const updateRotateZ = (value: string) => {
    setConfig((current) => ({
      ...current,
      rotateZ: clampRotation(parseFloat(value) || 0),
    }));
  };

  const updateScale = (value: string) => {
    setConfig((current) => ({
      ...current,
      scale: clampScale(parseFloat(value) || 1),
    }));
  };

  const updateScaleX = (value: string) => {
    setConfig((current) => ({
      ...current,
      scaleX: clampScale(parseFloat(value) || 1),
    }));
  };

  const updateScaleY = (value: string) => {
    setConfig((current) => ({
      ...current,
      scaleY: clampScale(parseFloat(value) || 1),
    }));
  };

  const updateScaleZ = (value: string) => {
    setConfig((current) => ({
      ...current,
      scaleZ: clampScale(parseFloat(value) || 1),
    }));
  };

  const updateSkewX = (value: string) => {
    setConfig((current) => ({
      ...current,
      skewX: clampSkew(parseFloat(value) || 0),
    }));
  };

  const updateSkewY = (value: string) => {
    setConfig((current) => ({
      ...current,
      skewY: clampSkew(parseFloat(value) || 0),
    }));
  };

  const updateOrigin = (next: Partial<TransformConfig['origin']>) => {
    setConfig((current) => ({
      ...current,
      origin: { ...current.origin, ...next },
    }));
  };

  const setOriginPosition = (horizontal: TransformConfig['origin']['horizontal'], vertical: TransformConfig['origin']['vertical']) => {
    updateOrigin({ horizontal, vertical });
  };

  const setUniformScale = (checked: boolean) => {
    setConfig((current) => ({
      ...current,
      uniformScale: checked,
    }));
    if (checked) {
      setConfig((current) => ({
        ...current,
        scaleX: current.scale,
        scaleY: current.scale,
      }));
    }
  };

  const setMode = (mode: TransformMode) => {
    setConfig((current) => ({
      ...current,
      mode,
    }));
  };

  const updatePerspective = (value: string) => {
    setConfig((current) => ({
      ...current,
      perspective: clampPerspective(parseFloat(value) || 1000),
    }));
  };

  const updatePerspectiveOriginX = (value: string) => {
    setConfig((current) => ({
      ...current,
      perspectiveOriginX: value,
    }));
  };

  const updatePerspectiveOriginY = (value: string) => {
    setConfig((current) => ({
      ...current,
      perspectiveOriginY: value,
    }));
  };

  const togglePreserve3d = () => {
    setConfig((current) => ({
      ...current,
      preserve3d: !current.preserve3d,
    }));
  };

  const reset = () => {
    setConfig(createDefaultConfig());
    showFeedback('success', 'Transform settings reset.');
  };

  const randomize = () => {
    setConfig(randomTransformConfig());
    showFeedback('success', 'A new transformation has been generated.');
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
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'transform-generator.css';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showFeedback('success', 'CSS file downloaded.');
  };

  const mode3d = config.mode === '3d';

  const inlineTransform = generateTransformValue(config);
  const inlineOrigin = generateTransformOrigin(config);

  const hasTransform = inlineTransform !== 'none';

  const previewInnerStyle: React.CSSProperties = {
    transform: hasTransform ? inlineTransform : 'none',
    transformOrigin: inlineOrigin,
    backgroundColor: config.previewColor,
    color: getContrastColor(config.previewColor),
  };

  const sceneStyle: React.CSSProperties = {
    perspective: mode3d ? `${config.perspective}px` : undefined,
    perspectiveOrigin: `${config.perspectiveOriginX} ${config.perspectiveOriginY}`,
  };

  function generateTransformValue(config: TransformConfig): string {
    const parts: string[] = [];
    const mode3d = config.mode === '3d';

    if (config.translateX !== 0 || config.translateY !== 0) {
      const tx = formatValue(config.translateX, 'px');
      const ty = formatValue(config.translateY, 'px');
      parts.push(`translate(${tx}, ${ty})`);
      if (mode3d && config.translateZ !== 0) {
        parts.push(`translateZ(${formatValue(config.translateZ, 'px')})`);
      }
    } else if (mode3d && config.translateZ !== 0) {
      parts.push(`translateZ(${formatValue(config.translateZ, 'px')})`);
    }

    if (mode3d) {
      const rx = formatValue(config.rotateX, 'deg');
      const ry = formatValue(config.rotateY, 'deg');
      const rz = formatValue(config.rotateZ, 'deg');

      if (config.rotate !== 0) {
        parts.push(`rotate(${formatValue(config.rotate, 'deg')})`);
      }
      if (rx !== '0deg') parts.push(`rotateX(${rx})`);
      if (ry !== '0deg') parts.push(`rotateY(${ry})`);
      if (rz !== '0deg') parts.push(`rotateZ(${rz})`);
    } else {
      const r = formatValue(config.rotate, 'deg');
      if (r !== '0deg') parts.push(`rotate(${r})`);
    }

    if (config.uniformScale) {
      const s = formatValue(config.scale, '');
      if (s !== '1') parts.push(`scale(${s})`);
    } else {
      if (formatValue(config.scaleX, '') !== '1') parts.push(`scaleX(${formatValue(config.scaleX, '')})`);
      if (formatValue(config.scaleY, '') !== '1') parts.push(`scaleY(${formatValue(config.scaleY, '')})`);
      if (mode3d && formatValue(config.scaleZ, '') !== '1') parts.push(`scaleZ(${formatValue(config.scaleZ, '')})`);
    }

    const skx = formatValue(config.skewX, 'deg');
    const sky = formatValue(config.skewY, 'deg');
    if (skx !== '0deg') parts.push(`skewX(${skx})`);
    if (sky !== '0deg') parts.push(`skewY(${sky})`);

    if (parts.length === 0) return 'none';
    return parts.join(' ');
  }

  function generateTransformOrigin(config: TransformConfig): string {
    const { horizontal, vertical, z } = config.origin;

    let originX: string;
    if (horizontal === 'custom') {
      originX = config.origin.horizontalCustom;
    } else {
      originX = horizontal === 'left' ? '0%' : horizontal === 'center' ? '50%' : '100%';
    }

    let originY: string;
    if (vertical === 'custom') {
      originY = config.origin.verticalCustom;
    } else {
      originY = vertical === 'top' ? '0%' : vertical === 'center' ? '50%' : '100%';
    }

    return `${originX} ${originY} ${z}`;
  }

  function formatValue(value: number, unit: string): string {
    const num = Math.round(Math.abs(value) * 1000) / 1000;
    if (value === 0) return `0${unit}`;
    return `${value < 0 ? '-' : ''}${num}${unit}`;
  }

  function getContrastColor(hex: string): string {
    const c = hex.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 180 ? '#0f172a' : '#ffffff';
  }

  const rangeRow = (_label: string, value: number | string, min: number, max: number, step: number, unit: string, onChange: (v: string) => void, ariaLabel: string) => (
    <div className="range-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${ariaLabel} value`}
      />
      <span>{unit}</span>
    </div>
  );

  const originBtn = (key: string, label: string, onClick: () => void, active: boolean) => (
    <button
      key={key}
      type="button"
      className={`origin-btn${active ? ' origin-btn--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      title={label}
    >
      <span className="origin-visual" aria-hidden="true">{label}</span>
      <span className="origin-label">{label}</span>
    </button>
  );

  const originLabelFor = (horizontal: string, vertical: string): string => {
    switch (horizontal) {
      case 'left':
        return vertical === 'top' ? 'Top Left' : vertical === 'center' ? 'Left' : 'Bottom Left';
      case 'center':
        return vertical === 'top' ? 'Top Center' : vertical === 'center' ? 'Center' : 'Bottom Center';
      case 'right':
        return vertical === 'top' ? 'Top Right' : vertical === 'center' ? 'Right' : 'Bottom Right';
      default:
        return 'Custom';
    }
  };

  const ORIGIN_POSITIONS: Array<[TransformConfig['origin']['vertical'], TransformConfig['origin']['horizontal']]> = [
    ['top', 'center'], ['top', 'left'], ['top', 'right'],
    ['center', 'left'], ['center', 'center'], ['center', 'right'],
    ['bottom', 'left'], ['bottom', 'center'], ['bottom', 'right'],
  ];

  return (
    <div className="transform-tool">
      <div className="transform-tool__toolbar">
        <div className="transform-tool__toolbar-status">
          <strong>Transform Generator</strong>
          <span>{activePresetName ? `${activePresetName} active` : 'Custom transform'} · updates live</span>
        </div>
        <div className="transform-tool__toolbar-actions">
          <button type="button" className="tool-button tool-button--secondary" onClick={randomize}>
            <Dice5 size={16} aria-hidden="true" /> Randomize
          </button>
          <button type="button" className="tool-button tool-button--secondary" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
      </div>

      <div className="transform-tool__layout">
        <aside className="transform-tool__controls-column">
          <section className="tool-card">
            <div className="tool-card__header">
              <h2>Transform Mode</h2>
              <p>Choose between 2D and 3D transform operations.</p>
            </div>
            <div className="mode-selector">
              <button
                type="button"
                className={`mode-btn${config.mode === '2d' ? ' mode-btn--active' : ''}`}
                onClick={() => setMode('2d')}
                aria-pressed={config.mode === '2d'}
              >
                <Maximize2 size={14} aria-hidden="true" /> 2D
              </button>
              <button
                type="button"
                className={`mode-btn${config.mode === '3d' ? ' mode-btn--active' : ''}`}
                onClick={() => setMode('3d')}
                aria-pressed={config.mode === '3d'}
              >
                <Maximize2 size={14} aria-hidden="true" /> 3D
              </button>
            </div>
          </section>

          <section className="tool-card" aria-labelledby="transform-translate-title">
            <div className="tool-card__header">
              <h2 id="transform-translate-title">Translate</h2>
              <p>Move the element horizontally and vertically.</p>
            </div>
            {rangeRow(
              'translateX',
              config.translateX,
              -300,
              300,
              1,
              'px',
              updateTranslateX,
              'Translate X'
            )}
            {rangeRow(
              'translateY',
              config.translateY,
              -300,
              300,
              1,
              'px',
              updateTranslateY,
              'Translate Y'
            )}
            {mode3d && (
              <>
                <div className="field-group">
                  <label className="field-label">Translate Z</label>
                  {rangeRow(
                    'translateZ',
                    config.translateZ,
                    -300,
                    300,
                    1,
                    'px',
                    updateTranslateZ,
                    'Translate Z'
                  )}
                </div>
                <p className="transform-note">Translate Z moves the element along the depth axis.</p>
              </>
            )}
          </section>

          <section className="tool-card" aria-labelledby="transform-rotate-title">
            <div className="tool-card__header">
              <h2 id="transform-rotate-title">Rotate</h2>
              <p>Rotate the element around its axes.</p>
            </div>
            {rangeRow(
              'rotate',
              config.rotate,
              -360,
              360,
              1,
              'deg',
              updateRotate,
              'Rotate'
            )}
            {mode3d && (
              <>
                <div className="field-group">
                  <label className="field-label">Rotate X</label>
                  {rangeRow(
                    'rotateX',
                    config.rotateX,
                    -180,
                    180,
                    1,
                    'deg',
                    updateRotateX,
                    'Rotate X'
                  )}
                </div>
                <div className="field-group">
                  <label className="field-label">Rotate Y</label>
                  {rangeRow(
                    'rotateY',
                    config.rotateY,
                    -180,
                    180,
                    1,
                    'deg',
                    updateRotateY,
                    'Rotate Y'
                  )}
                </div>
                <div className="field-group">
                  <label className="field-label">Rotate Z</label>
                  {rangeRow(
                    'rotateZ',
                    config.rotateZ,
                    -360,
                    360,
                    1,
                    'deg',
                    updateRotateZ,
                    'Rotate Z'
                  )}
                </div>
                <p className="transform-note">2D rotation rotates around the center; 3D rotations tilt around the X/Y/Z axes.</p>
              </>
            )}
          </section>

          <section className="tool-card" aria-labelledby="transform-scale-title">
            <div className="tool-card__header">
              <h2 id="transform-scale-title">Scale</h2>
              <p>Resize the element. A scale of 1 is the original size.</p>
            </div>
            <label className="transform-tool__toggle">
              <span>
                <strong>Uniform scale</strong>
                <small>Keep X and Y scale synchronized</small>
              </span>
              <input
                type="checkbox"
                checked={config.uniformScale}
                onChange={(event) => setUniformScale(event.target.checked)}
                aria-label="Uniform scale"
              />
            </label>
            {config.uniformScale ? (
              <div className="field-group">
                <label className="field-label">Scale</label>
                {rangeRow(
                  'scale',
                  config.scale,
                  0,
                  3,
                  0.01,
                  '',
                  updateScale,
                  'Scale'
                )}
              </div>
            ) : (
              <>
                <div className="field-group">
                  <label className="field-label">Scale X</label>
                  {rangeRow(
                    'scaleX',
                    config.scaleX,
                    0,
                    3,
                    0.01,
                    '',
                    updateScaleX,
                    'Scale X'
                  )}
                </div>
                <div className="field-group">
                  <label className="field-label">Scale Y</label>
                  {rangeRow(
                    'scaleY',
                    config.scaleY,
                    0,
                    3,
                    0.01,
                    '',
                    updateScaleY,
                    'Scale Y'
                  )}
                </div>
                {mode3d && (
                  <div className="field-group">
                    <label className="field-label">Scale Z</label>
                    {rangeRow(
                      'scaleZ',
                      config.scaleZ,
                      0,
                      3,
                      0.01,
                      '',
                      updateScaleZ,
                      'Scale Z'
                    )}
                  </div>
                )}
              </>
            )}
            <p className="transform-note">Use values between 0 and 3. A scale of 1 represents the original size.</p>
          </section>

          <section className="tool-card" aria-labelledby="transform-skew-title">
            <div className="tool-card__header">
              <h2 id="transform-skew-title">Skew</h2>
              <p>Distort the element along the X and Y axes.</p>
            </div>
            {rangeRow(
              'skewX',
              config.skewX,
              -90,
              90,
              1,
              'deg',
              updateSkewX,
              'Skew X'
            )}
            {rangeRow(
              'skewY',
              config.skewY,
              -90,
              90,
              1,
              'deg',
              updateSkewY,
              'Skew Y'
            )}
          </section>

          <section className="tool-card" aria-labelledby="transform-origin-title">
            <div className="tool-card__header">
              <h2 id="transform-origin-title">Transform Origin</h2>
              <p>Set the pivot point for transformations.</p>
            </div>
            <div className="origin-selector" role="radiogroup" aria-label="Transform origin positions">
              {ORIGIN_POSITIONS.map(([v, h]) => {
                const active = config.origin.horizontal === h && config.origin.vertical === v && config.origin.horizontal !== 'custom' && config.origin.vertical !== 'custom';
                return originBtn(`${h}-${v}`, originLabelFor(h, v), () => setOriginPosition(h, v), active);
              })}
            </div>
            {mode3d && (
              <>
                <div className="field-group">
                  <label className="field-label">Origin Z</label>
                  <div className="range-row">
                    <input
                      type="range"
                      min="-300"
                      max="300"
                      step="1"
                      value={config.origin.z.replace('px', '')}
                      onChange={(event) => updateOrigin({ z: `${event.target.value}px` })}
                      aria-label="Transform origin Z"
                    />
                    <input
                      type="number"
                      min="-300"
                      max="300"
                      step="1"
                      value={config.origin.z.replace('px', '')}
                      onChange={(event) => updateOrigin({ z: `${event.target.value}px` })}
                      aria-label="Transform origin Z value"
                    />
                    <span>px</span>
                  </div>
                </div>
                <p className="transform-note">Origin Z sets the depth position of the transform origin.</p>
              </>
            )}
          </section>

          {mode3d && (
            <section className="tool-card" aria-labelledby="transform-perspective-title">
              <div className="tool-card__header">
                <h2 id="transform-perspective-title">Perspective</h2>
                <p>Controls the intensity of the 3D effect.</p>
              </div>
              {rangeRow(
                'perspective',
                config.perspective,
                100,
                3000,
                10,
                'px',
                updatePerspective,
                'Perspective'
              )}
              <div className="field-group">
                <label className="field-label">Perspective Origin X</label>
                <div className="range-row">
                  <input
                    type="text"
                    value={config.perspectiveOriginX}
                    onChange={(event) => updatePerspectiveOriginX(event.target.value)}
                    aria-label="Perspective origin X"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Perspective Origin Y</label>
                <div className="range-row">
                  <input
                    type="text"
                    value={config.perspectiveOriginY}
                    onChange={(event) => updatePerspectiveOriginY(event.target.value)}
                    aria-label="Perspective origin Y"
                  />
                  <span>%</span>
                </div>
              </div>
              <label className="transform-tool__toggle">
                <span>
                  <strong>Preserve 3D</strong>
                  <small>Keep child elements in 3D space</small>
                </span>
                <input
                  type="checkbox"
                  checked={config.preserve3d}
                  onChange={togglePreserve3d}
                  aria-label="Preserve 3D"
                />
              </label>
            </section>
          )}
        </aside>

        <div className="transform-tool__preview-column">
          <section className="tool-card tool-card--preview" aria-labelledby="transform-preview-title">
            <div className="tool-card__header tool-card__header--split">
              <h2 id="transform-preview-title">Live Preview</h2>
              <div className="preview-actions">
                <label className="preview-toggle">
                  <span>Show Guides</span>
                  <input
                    type="checkbox"
                    checked={config.showGuides}
                    onChange={(event) => setConfig((current) => ({ ...current, showGuides: event.target.checked }))}
                    aria-label="Show guides"
                  />
                </label>
              </div>
            </div>

            <div className="preview-scene" style={sceneStyle}>
              <div className="preview-element-container">
                <div
                  className={`preview-element ${hasTransform ? 'preview-element--transformed' : ''} ${config.showGuides ? 'preview-element--guides' : ''}`}
                  style={{ ...previewInnerStyle }}
                >
                  <div className="preview-center">
                    <span>Preview</span>
                    <span className="preview-info">{inlineTransform}</span>
                  </div>
                  <div className="preview-guides">
                    <div className="preview-guide preview-guide--horizontal" />
                    <div className="preview-guide preview-guide--vertical" />
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-controls">
              <button type="button" className="tool-button tool-button--secondary" onClick={reset}>
                <RotateCcw size={14} aria-hidden="true" /> Reset Element
              </button>
              <label className="preview-color">
                <span>Element Color</span>
                <input
                  type="color"
                  value={config.previewColor}
                  onChange={(event) => setConfig((current) => ({ ...current, previewColor: event.target.value }))}
                  aria-label="Preview element color"
                />
              </label>
              <label className="preview-color">
                <span>Background Color</span>
                <input
                  type="color"
                  value={config.previewBackgroundColor}
                  onChange={(event) => setConfig((current) => ({ ...current, previewBackgroundColor: event.target.value }))}
                  aria-label="Preview background color"
                />
              </label>
            </div>
          </section>

          <section className="tool-card" aria-labelledby="transform-css-title">
            <div className="tool-card__header">
              <h2 id="transform-css-title">Generated CSS</h2>
              <p>Copy or download the CSS for your transformation.</p>
            </div>
            <div className="code-block">
              <pre>{css}</pre>
            </div>
            <div className="tool-card__actions">
              <button type="button" className="tool-button tool-button--secondary" onClick={() => void copyText(css, 'CSS')}>
                <Copy size={15} aria-hidden="true" /> Copy CSS
              </button>
              <button type="button" className="tool-button tool-button--secondary" onClick={() => void copyText(inlineTransform, 'Transform Value')}>
                <Copy size={15} aria-hidden="true" /> Copy Transform Value
              </button>
              <button type="button" className="tool-button tool-button--primary" onClick={downloadCss}>
                <Download size={15} aria-hidden="true" /> Download CSS
              </button>
            </div>
          </section>
        </div>
      </div>

      <section className="transform-tool__help">
        <div className="tool-card">
          <div className="tool-card__header">
            <h2>Beginner Guide</h2>
          </div>
          <ul className="help-list">
            <li>
              <strong>What is a CSS transform?</strong> CSS transforms let you change an element's shape, position, and orientation without affecting the document flow. Transforms do not take up layout space.
            </li>
            <li>
              <strong>Translate</strong> moves the element from its current position using X/Y (and Z in 3D). It's like shifting the element without changing anything else around it.
            </li>
            <li>
              <strong>Rotate</strong> turns the element around its center point. Positive values rotate clockwise; negative values rotate counterclockwise.
            </li>
            <li>
              <strong>Scale</strong> resizes the element. A value of 1 is the original size. Values above 1 grow the element; values below 1 shrink it. A scale of 0 makes the element disappear.
            </li>
            <li>
              <strong>Skew</strong> slants the element along the X or Y axis. It creates a parallelogram effect by shifting edges at an angle.
            </li>
            <li>
              <strong>Transform Origin</strong> sets the pivot point. By default, transforms occur around the center (50% 50%). Changing the origin changes where the element rotates, scales, or skews from.
            </li>
            <li>
              <strong>Transform Order Matters</strong> Transforms are applied in the order they appear in the CSS. <code>translateX(50px) rotate(30deg)</code> moves then rotates, while <code>rotate(30deg) translateX(50px)</code> rotates then moves — producing different results.
            </li>
            <li>
              <strong>2D vs 3D</strong> 2D transforms work on a flat plane (X/Y). 3D transforms add depth (Z) and perspective, creating a sense of space. Perspective must be set on a parent container for 3D effects to appear.
            </li>
            <li>
              <strong>No Layout Impact</strong> Transforms are computed after layout. They don't push other elements around or change the document flow, making them ideal for animations and visual effects.
            </li>
          </ul>
        </div>
      </section>

      {feedback && (
        <p className={`transform-tool__feedback transform-tool__feedback--${feedback.kind}`} role="status">
          {feedback.text}
        </p>
      )}
    </div>
  );
}
