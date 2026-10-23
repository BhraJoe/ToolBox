import { useMemo, useState } from 'react';
import { Copy, Download, Dice5, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { GRID_TEMPLATE_OPTIONS, randomGridItemColor, DEFAULT_COLORS, type GridContainerConfig, type GridItem, type GridJustifyItems, type GridAlignItems } from './gridUtils';

type Feedback = {
  kind: 'success' | 'error';
  text: string;
};

type PresetDefinition = {
  id: string;
  name: string;
  config: Partial<GridContainerConfig>;
  items: Partial<GridItem>[];
};

const DEFAULT_CONFIG: GridContainerConfig = {
  templateColumns: 'repeat(3, 1fr)',
  templateRows: 'auto auto auto',
  gap: 16,
  justifyItems: 'stretch',
  alignItems: 'stretch',
  width: 720,
  height: 260,
};

const PRESET_DEFINITIONS: PresetDefinition[] = [
  {
    id: 'holy-grail',
    name: 'Holy Grail',
    config: {
      templateColumns: '1fr 1fr 1fr',
      templateRows: 'auto auto auto',
      gap: 16,
      justifyItems: 'stretch',
      alignItems: 'stretch',
      width: 720,
      height: 260,
    },
    items: [
      { row: 1, column: 1, rowSpan: 1, columnSpan: 1 },
      { row: 1, column: 2, rowSpan: 1, columnSpan: 1 },
      { row: 1, column: 3, rowSpan: 1, columnSpan: 1 },
      { row: 2, column: 1, rowSpan: 1, columnSpan: 1 },
      { row: 2, column: 2, rowSpan: 1, columnSpan: 1 },
      { row: 2, column: 3, rowSpan: 1, columnSpan: 1 },
      { row: 3, column: 1, rowSpan: 1, columnSpan: 1 },
      { row: 3, column: 2, rowSpan: 1, columnSpan: 1 },
      { row: 3, column: 3, rowSpan: 1, columnSpan: 1 },
    ],
  },
  {
    id: 'simple-grid',
    name: 'Simple Grid',
    config: {
      templateColumns: 'repeat(2, 1fr)',
      templateRows: 'repeat(2, auto)',
      gap: 16,
      justifyItems: 'stretch',
      alignItems: 'stretch',
      width: 720,
      height: 260,
    },
    items: [
      { row: 1, column: 1, rowSpan: 1, columnSpan: 1 },
      { row: 1, column: 2, rowSpan: 1, columnSpan: 1 },
      { row: 2, column: 1, rowSpan: 1, columnSpan: 1 },
      { row: 2, column: 2, rowSpan: 1, columnSpan: 1 },
    ],
  },
  {
    id: 'card-grid',
    name: 'Card Grid',
    config: {
      templateColumns: 'repeat(3, 1fr)',
      templateRows: 'auto auto',
      gap: 20,
      justifyItems: 'stretch',
      alignItems: 'stretch',
      width: 720,
      height: 300,
    },
    items: [
      { row: 1, column: 1, rowSpan: 1, columnSpan: 2 },
      { row: 1, column: 3, rowSpan: 1, columnSpan: 1 },
      { row: 2, column: 1, rowSpan: 1, columnSpan: 1 },
      { row: 2, column: 2, rowSpan: 1, columnSpan: 1 },
      { row: 2, column: 3, rowSpan: 1, columnSpan: 1 },
    ],
  },
];

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createItem(index: number, color: string, overrides: Partial<GridItem> = {}): GridItem {
  return {
    id: index + 1,
    label: `${index + 1}`,
    row: 1,
    column: 1,
    rowSpan: 1,
    columnSpan: 1,
    justifySelf: 'stretch',
    alignSelf: 'stretch',
    color,
    ...overrides,
  };
}

function buildDefaultItems(count: number): GridItem[] {
  return Array.from({ length: count }, (_, index) => createItem(index, DEFAULT_COLORS[index % DEFAULT_COLORS.length]));
}

function comparePresetWithConfig(preset: PresetDefinition, config: GridContainerConfig): boolean {
  return Object.entries(preset.config).every(([key, value]) => {
    const castKey = key as keyof GridContainerConfig;
    if (key === 'templateRows') {
      const configRows = config.templateRows?.split(/\s+/).filter(Boolean) ?? [];
      const presetRows = (preset.config as any).templateRows?.split(/\s+/).filter(Boolean) ?? [];
      return configRows.join(' ') === presetRows.join(' ');
    }
    return config[castKey] === value;
  });
}

export default function GridGenerator() {
  const [config, setConfig] = useState<GridContainerConfig>(DEFAULT_CONFIG);
  const [items, setItems] = useState<GridItem[]>(() => buildDefaultItems(4));
  const [selectedItemId, setSelectedItemId] = useState<number>(1);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0];

  const containerCss = useMemo(() => {
    const lines = [
      '.grid-container {',
      `  display: grid;`,
      `  grid-template-columns: ${config.templateColumns};`,
      `  grid-template-rows: ${config.templateRows};`,
      `  gap: ${config.gap}px;`,
      `  justify-items: ${config.justifyItems};`,
      `  align-items: ${config.alignItems};`,
      `  width: ${config.width}px;`,
      `  height: ${config.height}px;`,
      '}',
    ];

    return lines.join('\n');
  }, [config]);

  const itemCss = useMemo(() => {
    if (!selectedItem) return '.grid-item {\n  grid-row: auto;\n  grid-column: auto;\n}';

    const lines = [
      '.grid-item {',
      `  grid-row: ${selectedItem.row};`,
      `  grid-column: ${selectedItem.column};`,
      `  grid-row-end: span ${selectedItem.rowSpan};`,
      `  grid-column-end: span ${selectedItem.columnSpan};`,
      `  justify-self: ${selectedItem.justifySelf};`,
      `  align-self: ${selectedItem.alignSelf};`,
      '}',
    ];

    return lines.join('\n');
  }, [selectedItem]);

  const completeCss = useMemo(() => `${containerCss}\n\n${itemCss}`, [containerCss, itemCss]);

  const activePreset = useMemo(
    () => PRESET_DEFINITIONS.find((preset) => comparePresetWithConfig(preset, config)) ?? null,
    [config],
  );

  const showFeedback = (kind: Feedback['kind'], text: string) => {
    setFeedback({ kind, text });
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const updateConfig = (updates: Partial<GridContainerConfig>) => {
    setConfig((current) => ({ ...current, ...updates }));
  };

  const updateItem = (itemId: number, updates: Partial<GridItem>) => {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    setItems((current) => {
      const nextId = current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1;
      const color = DEFAULT_COLORS[(current.length + 1) % DEFAULT_COLORS.length];
      const item = createItem(current.length, color, {
        id: nextId,
        label: `${nextId}`,
      });
      setSelectedItemId(nextId);
      return [...current, item];
    });
  };

  const removeItem = (itemId: number) => {
    if (items.length <= 1) {
      showFeedback('error', 'At least one item is required in the preview.');
      return;
    }

    const nextItems = items.filter((item) => item.id !== itemId);
    setItems(nextItems);
    if (selectedItemId === itemId) {
      setSelectedItemId(nextItems[0].id);
    }
    showFeedback('success', 'Grid item removed.');
  };

  const reset = () => {
    setConfig(DEFAULT_CONFIG);
    setItems(buildDefaultItems(4));
    setSelectedItemId(1);
    showFeedback('success', 'Grid layout reset.');
  };

  const randomize = () => {
    const itemCount = Math.floor(Math.random() * 4) + 3;
    const nextItems = Array.from({ length: itemCount }, (_, index) => {
      const color = randomGridItemColor();
      return createItem(index, color, {
        row: 1 + Math.floor(Math.random() * 3),
        column: 1 + Math.floor(Math.random() * 3),
        rowSpan: Math.random() > 0.5 ? 2 : 1,
        columnSpan: Math.random() > 0.5 ? 2 : 1,
      });
    });

    const sampleConfig: GridContainerConfig = {
      templateColumns: ['1fr', '1fr 1fr', 'repeat(3, 1fr)', 'repeat(2, 1fr)', 'minmax(100px, 1fr)'][Math.floor(Math.random() * 5)],
      templateRows: Math.random() > 0.5 ? 'auto auto auto' : 'auto',
      gap: 12 + Math.floor(Math.random() * 28),
      justifyItems: ['stretch', 'start', 'center', 'end'][Math.floor(Math.random() * 4)] as GridJustifyItems,
      alignItems: ['stretch', 'start', 'center', 'end'][Math.floor(Math.random() * 4)] as GridAlignItems,
      width: 640 + Math.floor(Math.random() * 200),
      height: 180 + Math.floor(Math.random() * 140),
    };

    setConfig(sampleConfig);
    setItems(nextItems);
    setSelectedItemId(nextItems[0].id);
    showFeedback('success', 'A fresh grid layout was generated.');
  };

  const copyText = async (value: string, label: string) => {
    if (typeof navigator.clipboard?.writeText !== 'function') {
      showFeedback('error', 'Clipboard access is unavailable in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showFeedback('success', `${label} copied to the clipboard.`);
    } catch {
      showFeedback('error', `Unable to copy ${label.toLowerCase()}.`);
    }
  };

  const downloadCss = () => {
    const blob = new Blob([completeCss], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'grid-generator.css';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showFeedback('success', 'CSS downloaded.');
  };

  const applyPreset = (preset: PresetDefinition) => {
    setConfig((current) => ({
      ...current,
      ...preset.config,
    }));
    setItems(
      preset.items.length > 0
        ? preset.items.map((item, index) => createItem(index, DEFAULT_COLORS[index % DEFAULT_COLORS.length], item as Partial<GridItem>))
        : buildDefaultItems(preset.items.length || 4),
    );
    setSelectedItemId(1);
    showFeedback('success', `${preset.name} preset applied.`);
  };

  const previewStyle = {
    display: 'grid',
    gridTemplateColumns: config.templateColumns,
    gridTemplateRows: config.templateRows,
    gap: `${config.gap}px`,
    justifyItems: config.justifyItems,
    alignItems: config.alignItems,
    width: `${config.width}px`,
    height: `${config.height}px`,
  } as const;

  return (
    <div className="grid-generator">
      <div className="grid-generator__toolbar">
        <div className="grid-generator__status">
          <strong>Grid layout</strong>
          <span>{activePreset ? `${activePreset.name} active` : 'Custom layout'}</span>
        </div>
        <div className="grid-generator__toolbar-actions">
          <button type="button" className="tool-button tool-button--secondary" onClick={randomize}>
            <Dice5 size={16} aria-hidden="true" /> Randomize
          </button>
          <button type="button" className="tool-button tool-button--secondary" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
      </div>

      <div className="grid-generator__content">
        <aside className="grid-generator__sidebar">
          <section className="tool-card" aria-labelledby="grid-container-controls-title">
            <div className="tool-card__header">
              <h2 id="grid-container-controls-title">Container controls</h2>
            </div>

            <div className="field-group">
              <label className="field-label">Grid template columns</label>
              <div className="segmented-group" role="radiogroup" aria-label="Grid template columns">
                {GRID_TEMPLATE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={config.templateColumns === option.value}
                    className={`segmented-control${config.templateColumns === option.value ? ' segmented-control--active' : ''}`}
                    onClick={() => updateConfig({ templateColumns: option.value })}
                    title={option.hint}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {config.templateColumns.startsWith('repeat(') || config.templateColumns.includes('minmax') ? (
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={Number(config.templateColumns.match(/repeat\((\d+)/)?.[1] ?? 3)}
                  onChange={(event) => {
                    const count = clampNumber(Number(event.target.value) || 3, 1, 12);
                    updateConfig({ templateColumns: `repeat(${count}, 1fr)` });
                  }}
                  aria-label="Repeat count"
                />
              ) : null}
            </div>

            <div className="field-group">
              <label className="field-label">Grid template rows</label>
              <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Grid template rows">
                {GRID_TEMPLATE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={config.templateRows === option.value}
                    className={`segmented-control${config.templateRows === option.value ? ' segmented-control--active' : ''}`}
                    onClick={() => updateConfig({ templateRows: option.value })}
                    title={option.hint}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Gap</label>
              <div className="range-row">
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={config.gap}
                  onChange={(event) => updateConfig({ gap: Number(event.target.value) })}
                  aria-label="Gap size"
                />
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={config.gap}
                  onChange={(event) => updateConfig({ gap: clampNumber(Number(event.target.value) || 0, 0, 80) })}
                  aria-label="Gap size value"
                />
                <span>px</span>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Container size</label>
              <div className="dual-inputs">
                <label>
                  <span>Width</span>
                  <input
                    type="number"
                    min="120"
                    max="1200"
                    value={config.width}
                    onChange={(event) => updateConfig({ width: clampNumber(Number(event.target.value) || 120, 120, 1200) })}
                  />
                </label>
                <label>
                  <span>Height</span>
                  <input
                    type="number"
                    min="80"
                    max="800"
                    value={config.height}
                    onChange={(event) => updateConfig({ height: clampNumber(Number(event.target.value) || 80, 80, 800) })}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="tool-card" aria-labelledby="grid-item-controls-title">
            <div className="tool-card__header tool-card__header--split">
              <h2 id="grid-item-controls-title">Item controls</h2>
              <button type="button" className="tool-button tool-button--secondary tool-button--icon" onClick={addItem} aria-label="Add grid item">
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>

            {selectedItem && (
              <>
                <div className="field-group">
                  <label className="field-label">Selected item</label>
                  <div className="item-picker" aria-label="Grid item selector">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`item-picker__chip${selectedItemId === item.id ? ' item-picker__chip--active' : ''}`}
                      >
                        <button
                          type="button"
                          className="item-picker__main"
                          onClick={() => setSelectedItemId(item.id)}
                          aria-pressed={selectedItemId === item.id}
                        >
                          <span className="item-picker__swatch" style={{ background: item.color }} aria-hidden="true" />
                          {item.label}
                        </button>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="item-picker__remove"
                            onClick={() => removeItem(item.id)}
                            aria-label={`Remove item ${item.label}`}
                          >
                            <Trash2 size={12} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Label</label>
                  <input
                    type="text"
                    className="text-input"
                    value={selectedItem.label}
                    onChange={(event) => updateItem(selectedItem.id, { label: event.target.value.slice(0, 3) || '1' })}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Grid row</label>
                  <div className="dual-inputs dual-inputs--compact">
                    <label>
                      <span>Row</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={selectedItem.row}
                        onChange={(event) => updateItem(selectedItem.id, { row: clampNumber(Number(event.target.value) || 1, 1, 12) })}
                      />
                    </label>
                    <label>
                      <span>Row span</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={selectedItem.rowSpan}
                        onChange={(event) => updateItem(selectedItem.id, { rowSpan: clampNumber(Number(event.target.value) || 1, 1, 12) })}
                      />
                    </label>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Grid column</label>
                  <div className="dual-inputs dual-inputs--compact">
                    <label>
                      <span>Column</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={selectedItem.column}
                        onChange={(event) => updateItem(selectedItem.id, { column: clampNumber(Number(event.target.value) || 1, 1, 12) })}
                      />
                    </label>
                    <label>
                      <span>Column span</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={selectedItem.columnSpan}
                        onChange={(event) => updateItem(selectedItem.id, { columnSpan: clampNumber(Number(event.target.value) || 1, 1, 12) })}
                      />
                    </label>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Justify self</label>
                  <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Justify self option">
                    {(['auto', 'start', 'center', 'end', 'stretch'] as GridJustifyItems[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selectedItem.justifySelf === value}
                        className={`segmented-control${selectedItem.justifySelf === value ? ' segmented-control--active' : ''}`}
                        onClick={() => updateItem(selectedItem.id, { justifySelf: value })}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Align self</label>
                  <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Align self option">
                    {(['auto', 'start', 'center', 'end', 'stretch'] as GridAlignItems[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selectedItem.alignSelf === value}
                        className={`segmented-control${selectedItem.alignSelf === value ? ' segmented-control--active' : ''}`}
                        onClick={() => updateItem(selectedItem.id, { alignSelf: value })}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </aside>

        <div className="grid-generator__preview-column">
          <section className="tool-card tool-card--preview" aria-labelledby="grid-preview-title">
            <div className="tool-card__header tool-card__header--split">
              <h2 id="grid-preview-title">Live preview</h2>
              {activePreset && <span className="preset-badge">{activePreset.name}</span>}
            </div>

            <div className="grid-generator__preview-wrap">
              <div className="grid-generator__preview-scroller">
                <div className="grid-generator__preview" style={previewStyle} aria-label="Grid preview container">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`grid-generator__item${selectedItemId === item.id ? ' grid-generator__item--selected' : ''}`}
                      style={{
                        gridRow: `${item.row} / span ${item.rowSpan}`,
                        gridColumn: `${item.column} / span ${item.columnSpan}`,
                        justifySelf: item.justifySelf,
                        alignSelf: item.alignSelf,
                        background: item.color,
                      }}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="tool-card" aria-labelledby="grid-css-title">
            <div className="tool-card__header">
              <h2 id="grid-css-title">Generated CSS</h2>
            </div>

            <div className="code-block">
              <pre>{containerCss}</pre>
            </div>

            <div className="code-block code-block--secondary">
              <pre>{itemCss}</pre>
            </div>

            <div className="tool-card__actions">
              <button type="button" className="tool-button tool-button--secondary" onClick={() => void copyText(containerCss, 'Container CSS')}>
                <Copy size={15} aria-hidden="true" /> Copy Container CSS
              </button>
              <button type="button" className="tool-button tool-button--secondary" onClick={() => void copyText(itemCss, 'Item CSS')}>
                <Copy size={15} aria-hidden="true" /> Copy Item CSS
              </button>
              <button type="button" className="tool-button tool-button--primary" onClick={() => void copyText(completeCss, 'Complete CSS')}>
                <Copy size={15} aria-hidden="true" /> Copy Complete CSS
              </button>
              <button type="button" className="tool-button tool-button--secondary" onClick={downloadCss}>
                <Download size={15} aria-hidden="true" /> Download CSS
              </button>
            </div>
          </section>

          <section className="tool-card" aria-labelledby="grid-presets-title">
            <div className="tool-card__header">
              <h2 id="grid-presets-title">Presets</h2>
            </div>

            <div className="preset-grid">
              {PRESET_DEFINITIONS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-tile${activePreset?.id === preset.id ? ' preset-tile--active' : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  <span className="preset-tile__swatches" aria-hidden="true">
                    {Array.from({ length: preset.items.length }, (_, index) => (
                      <span key={`${preset.id}-${index}`} style={{ background: DEFAULT_COLORS[index % DEFAULT_COLORS.length] }} />
                    ))}
                  </span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="grid-generator__help" aria-labelledby="grid-help-title">
        <div className="tool-card">
          <div className="tool-card__header">
            <h2 id="grid-help-title">Beginner guide</h2>
          </div>
          <ul className="help-list">
            <li><strong>What is CSS Grid?</strong> A two-dimensional layout system that controls rows and columns simultaneously.</li>
            <li><strong>grid-template-columns vs grid-template-rows.</strong> Columns define horizontal tracks, rows define vertical tracks.</li>
            <li><strong>repeat().</strong> The shorthand <code>repeat(3, 1fr)</code> creates three equal-width tracks.</li>
            <li><strong>Grid areas.</strong> Items are placed with <code>grid-row</code> and <code>grid-column</code> (both accept <code>start / span N</code> syntax).</li>
            <li><strong>Gap.</strong> The <code>gap</code> property sets consistent spacing between all tracks.</li>
            <li><strong>Justify / align self.</strong> Control how individual items align within their grid area.</li>
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