import { useMemo, useState } from 'react';
import { Copy, Download, Dice5, Plus, RotateCcw, Trash2 } from 'lucide-react';

type DisplayMode = 'flex' | 'inline-flex';
type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
type JustifyContent = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
type AlignItems = 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline';
type AlignContent = 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
type AlignSelf = 'auto' | 'flex-start' | 'center' | 'flex-end' | 'baseline' | 'stretch';
type BasisUnit = 'auto' | 'px' | '%';

type ContainerConfig = {
  display: DisplayMode;
  direction: FlexDirection;
  wrap: FlexWrap;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
  alignContent: AlignContent;
  gap: number;
  rowGap: number | null;
  columnGap: number | null;
  width: number;
  height: number;
};

type FlexItem = {
  id: number;
  label: string;
  order: number;
  flexGrow: number;
  flexShrink: number;
  basisMode: BasisUnit;
  basisValue: number;
  alignSelf: AlignSelf;
  color: string;
};

type Feedback = {
  kind: 'success' | 'error';
  text: string;
};

type PresetDefinition = {
  id: string;
  name: string;
  config: Partial<ContainerConfig>;
  itemCount: number;
};

const DIRECTION_OPTIONS: Array<{ value: FlexDirection; label: string; hint: string }> = [
  { value: 'row', label: 'Row', hint: 'Left to right' },
  { value: 'row-reverse', label: 'Row Reverse', hint: 'Right to left' },
  { value: 'column', label: 'Column', hint: 'Top to bottom' },
  { value: 'column-reverse', label: 'Column Reverse', hint: 'Bottom to top' },
];

const WRAP_OPTIONS: FlexWrap[] = ['nowrap', 'wrap', 'wrap-reverse'];
const JUSTIFY_OPTIONS: JustifyContent[] = ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'];
const ITEM_ALIGN_OPTIONS: AlignSelf[] = ['auto', 'flex-start', 'center', 'flex-end', 'baseline', 'stretch'];
const ALIGN_ITEMS_OPTIONS: AlignItems[] = ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'];
const ALIGN_CONTENT_OPTIONS: AlignContent[] = ['stretch', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'];
const DISPLAY_OPTIONS: DisplayMode[] = ['flex', 'inline-flex'];

const DEFAULT_CONFIG: ContainerConfig = {
  display: 'flex',
  direction: 'row',
  wrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  alignContent: 'stretch',
  gap: 16,
  rowGap: null,
  columnGap: null,
  width: 720,
  height: 260,
};

const DEFAULT_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb7185'];

const PRESET_DEFINITIONS: PresetDefinition[] = [
  {
    id: 'centered-content',
    name: 'Centered Content',
    config: {
      display: 'flex',
      direction: 'row',
      wrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      alignContent: 'center',
      gap: 20,
      width: 720,
      height: 260,
    },
    itemCount: 4,
  },
  {
    id: 'space-between',
    name: 'Space Between',
    config: {
      display: 'flex',
      direction: 'row',
      wrap: 'nowrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      alignContent: 'stretch',
      gap: 16,
      width: 720,
      height: 160,
    },
    itemCount: 4,
  },
  {
    id: 'space-around',
    name: 'Space Around',
    config: {
      display: 'flex',
      direction: 'row',
      wrap: 'nowrap',
      justifyContent: 'space-around',
      alignItems: 'center',
      alignContent: 'stretch',
      gap: 16,
      width: 720,
      height: 160,
    },
    itemCount: 4,
  },
  {
    id: 'space-evenly',
    name: 'Space Evenly',
    config: {
      display: 'flex',
      direction: 'row',
      wrap: 'nowrap',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      alignContent: 'stretch',
      gap: 16,
      width: 720,
      height: 160,
    },
    itemCount: 4,
  },
  {
    id: 'horizontal-navigation',
    name: 'Horizontal Navigation',
    config: {
      display: 'flex',
      direction: 'row',
      wrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'center',
      alignContent: 'stretch',
      gap: 12,
      width: 720,
      height: 100,
    },
    itemCount: 5,
  },
  {
    id: 'vertical-stack',
    name: 'Vertical Stack',
    config: {
      display: 'flex',
      direction: 'column',
      wrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      alignContent: 'stretch',
      gap: 18,
      width: 240,
      height: 280,
    },
    itemCount: 4,
  },
  {
    id: 'responsive-grid-like',
    name: 'Responsive Grid-Like Layout',
    config: {
      display: 'flex',
      direction: 'row',
      wrap: 'wrap',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      alignContent: 'space-between',
      gap: 16,
      width: 720,
      height: 260,
    },
    itemCount: 6,
  },
  {
    id: 'reverse-layout',
    name: 'Reverse Layout',
    config: {
      display: 'flex',
      direction: 'row-reverse',
      wrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      alignContent: 'stretch',
      gap: 16,
      width: 720,
      height: 260,
    },
    itemCount: 4,
  },
];

function createItem(index: number, color: string, overrides: Partial<FlexItem> = {}): FlexItem {
  return {
    id: index + 1,
    label: `${index + 1}`,
    order: 0,
    flexGrow: 1,
    flexShrink: 1,
    basisMode: 'auto',
    basisValue: 120,
    alignSelf: 'auto',
    color,
    ...overrides,
  };
}

function buildDefaultItems(count: number): FlexItem[] {
  return Array.from({ length: count }, (_, index) => createItem(index, DEFAULT_COLORS[index % DEFAULT_COLORS.length], {
    flexGrow: index === 1 ? 2 : 1,
    flexShrink: 1,
    basisMode: index % 2 === 0 ? 'auto' : 'px',
    basisValue: index === 0 ? 120 : 150,
  }));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatBasis(item: FlexItem): string {
  if (item.basisMode === 'auto') return 'auto';
  return `${item.basisValue}${item.basisMode}`;
}

function comparePresetWithConfig(preset: PresetDefinition, config: ContainerConfig): boolean {
  return Object.entries(preset.config).every(([key, value]) => {
    const castKey = key as keyof ContainerConfig;
    if (key === 'rowGap' || key === 'columnGap') {
      return (config[castKey] ?? null) === (value ?? null);
    }
    return config[castKey] === value;
  });
}

export default function FlexboxGenerator() {
  const [config, setConfig] = useState<ContainerConfig>(DEFAULT_CONFIG);
  const [items, setItems] = useState<FlexItem[]>(() => buildDefaultItems(4));
  const [selectedItemId, setSelectedItemId] = useState<number>(1);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0];

  const containerCss = useMemo(() => {
    const lines = [
      '.flex-container {',
      `  display: ${config.display};`,
      `  flex-direction: ${config.direction};`,
      `  flex-wrap: ${config.wrap};`,
      `  justify-content: ${config.justifyContent};`,
      `  align-items: ${config.alignItems};`,
      `  align-content: ${config.alignContent};`,
      `  gap: ${config.gap}px;`,
    ];

    if (config.rowGap !== null) lines.push(`  row-gap: ${config.rowGap}px;`);
    if (config.columnGap !== null) lines.push(`  column-gap: ${config.columnGap}px;`);

    lines.push(`  width: ${config.width}px;`, `  height: ${config.height}px;`, '}');
    return lines.join('\n');
  }, [config]);

  const itemCss = useMemo(() => {
    if (!selectedItem) return '.flex-item {\n  order: 0;\n}';

    const lines = [
      '.flex-item {',
      `  order: ${selectedItem.order};`,
      `  flex-grow: ${selectedItem.flexGrow};`,
      `  flex-shrink: ${selectedItem.flexShrink};`,
      `  flex-basis: ${formatBasis(selectedItem)};`,
      `  align-self: ${selectedItem.alignSelf};`,
      '}',
    ];

    return lines.join('\n');
  }, [selectedItem]);

  const completeCss = useMemo(() => `${containerCss}\n\n${itemCss}`, [containerCss, itemCss]);

  const activePreset = useMemo(
    () => PRESET_DEFINITIONS.find((preset) => comparePresetWithConfig(preset, config)) ?? null,
    [config]
  );

  const showFeedback = (kind: Feedback['kind'], text: string) => {
    setFeedback({ kind, text });
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const updateConfig = (updates: Partial<ContainerConfig>) => {
    setConfig((current) => ({ ...current, ...updates }));
  };

  const updateItem = (itemId: number, updates: Partial<FlexItem>) => {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    setItems((current) => {
      const nextId = current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1;
      const color = DEFAULT_COLORS[(current.length + 1) % DEFAULT_COLORS.length];
      const item = createItem(current.length, color, {
        id: nextId,
        label: `${nextId}`,
        flexGrow: 1,
        flexShrink: 1,
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
    showFeedback('success', 'Flex item removed.');
  };

  const reset = () => {
    setConfig(DEFAULT_CONFIG);
    setItems(buildDefaultItems(4));
    setSelectedItemId(1);
    showFeedback('success', 'Flexbox layout reset.');
  };

  const randomize = () => {
    const itemCount = Math.floor(Math.random() * 4) + 3;
    const nextItems = Array.from({ length: itemCount }, (_, index) => {
      const sway = index % 2 === 0 ? 1 : 2;
      return createItem(index, DEFAULT_COLORS[index % DEFAULT_COLORS.length], {
        id: index + 1,
        label: `${index + 1}`,
        order: Math.floor(Math.random() * 6) - 3,
        flexGrow: Math.floor(Math.random() * 3) + 1,
        flexShrink: Math.floor(Math.random() * 2),
        basisMode: index % 3 === 0 ? 'px' : index % 3 === 1 ? '%' : 'auto',
        basisValue: index % 3 === 0 ? 90 + index * 20 : 20 + index * 15,
        alignSelf: ITEM_ALIGN_OPTIONS[Math.floor(Math.random() * ITEM_ALIGN_OPTIONS.length)],
        color: DEFAULT_COLORS[(index + sway) % DEFAULT_COLORS.length],
      });
    });

    const sampleConfig: ContainerConfig = {
      display: 'flex',
      direction: DIRECTION_OPTIONS[Math.floor(Math.random() * DIRECTION_OPTIONS.length)].value,
      wrap: WRAP_OPTIONS[Math.floor(Math.random() * WRAP_OPTIONS.length)],
      justifyContent: JUSTIFY_OPTIONS[Math.floor(Math.random() * JUSTIFY_OPTIONS.length)],
      alignItems: ALIGN_ITEMS_OPTIONS[Math.floor(Math.random() * ALIGN_ITEMS_OPTIONS.length)],
      alignContent: ALIGN_CONTENT_OPTIONS[Math.floor(Math.random() * ALIGN_CONTENT_OPTIONS.length)],
      gap: 12 + Math.floor(Math.random() * 28),
      rowGap: Math.random() > 0.5 ? 8 + Math.floor(Math.random() * 16) : null,
      columnGap: Math.random() > 0.5 ? 8 + Math.floor(Math.random() * 16) : null,
      width: 640 + Math.floor(Math.random() * 200),
      height: 180 + Math.floor(Math.random() * 140),
    };

    setConfig(sampleConfig);
    setItems(nextItems);
    setSelectedItemId(nextItems[0].id);
    showFeedback('success', 'A fresh flex layout was generated.');
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
    anchor.download = 'flexbox-generator.css';
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
    setItems(buildDefaultItems(preset.itemCount));
    setSelectedItemId(1);
    showFeedback('success', `${preset.name} preset applied.`);
  };

  const previewStyle = {
    display: config.display,
    flexDirection: config.direction,
    flexWrap: config.wrap,
    justifyContent: config.justifyContent,
    alignItems: config.alignItems,
    alignContent: config.alignContent,
    gap: `${config.gap}px`,
    rowGap: config.rowGap !== null ? `${config.rowGap}px` : undefined,
    columnGap: config.columnGap !== null ? `${config.columnGap}px` : undefined,
    width: `${config.width}px`,
    height: `${config.height}px`,
  } as const;

  return (
    <div className="flexbox-generator">
      <div className="flexbox-generator__toolbar">
        <div className="flexbox-generator__status">
          <strong>Flexbox layout</strong>
          <span>{activePreset ? `${activePreset.name} active` : 'Custom layout'}</span>
        </div>
        <div className="flexbox-generator__toolbar-actions">
          <button type="button" className="tool-button tool-button--secondary" onClick={randomize}>
            <Dice5 size={16} aria-hidden="true" /> Randomize
          </button>
          <button type="button" className="tool-button tool-button--secondary" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
      </div>

      <div className="flexbox-generator__content">
        <aside className="flexbox-generator__sidebar">
          <section className="tool-card" aria-labelledby="flex-container-controls-title">
            <div className="tool-card__header">
              <h2 id="flex-container-controls-title">Container controls</h2>
            </div>

            <div className="field-group">
              <label className="field-label">Display</label>
              <div className="segmented-group" role="radiogroup" aria-label="Display type">
                {DISPLAY_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={config.display === value}
                    className={`segmented-control${config.display === value ? ' segmented-control--active' : ''}`}
                    onClick={() => updateConfig({ display: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Flex direction</label>
              <div className="direction-grid" aria-label="Flex direction options">
                {DIRECTION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`direction-option${config.direction === option.value ? ' direction-option--active' : ''}`}
                    onClick={() => updateConfig({ direction: option.value })}
                    aria-pressed={config.direction === option.value}
                  >
                    <span className={`direction-preview direction-preview--${option.value.replace(/-/g, '')}`} aria-hidden="true" />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.hint}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Flex wrap</label>
              <div className="segmented-group" role="radiogroup" aria-label="Wrap setting">
                {WRAP_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={config.wrap === value}
                    className={`segmented-control${config.wrap === value ? ' segmented-control--active' : ''}`}
                    onClick={() => updateConfig({ wrap: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Justify content</label>
              <div className="justification-grid">
                {JUSTIFY_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`mini-layout-option${config.justifyContent === value ? ' mini-layout-option--active' : ''}`}
                    onClick={() => updateConfig({ justifyContent: value })}
                    aria-pressed={config.justifyContent === value}
                    title={value}
                  >
                    <span className={`mini-layout mini-layout--${value.replace(/-/g, '')}`} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <small>{value}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Align items</label>
              <div className="align-grid">
                {ALIGN_ITEMS_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`mini-layout-option${config.alignItems === value ? ' mini-layout-option--active' : ''}`}
                    onClick={() => updateConfig({ alignItems: value })}
                    aria-pressed={config.alignItems === value}
                    title={value}
                  >
                    <span className={`mini-axis mini-axis--${value.replace(/-/g, '')}`} aria-hidden="true" />
                    <small>{value}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Align content</label>
              <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Align content setting">
                {ALIGN_CONTENT_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={config.alignContent === value}
                    className={`segmented-control${config.alignContent === value ? ' segmented-control--active' : ''}`}
                    onClick={() => updateConfig({ alignContent: value })}
                  >
                    {value}
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
              <label className="field-label">Row gap / column gap</label>
              <div className="dual-inputs">
                <label>
                  <span>Row</span>
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={config.rowGap ?? ''}
                    onChange={(event) => updateConfig({ rowGap: event.target.value === '' ? null : clampNumber(Number(event.target.value), 0, 80) })}
                    placeholder="auto"
                  />
                </label>
                <label>
                  <span>Column</span>
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={config.columnGap ?? ''}
                    onChange={(event) => updateConfig({ columnGap: event.target.value === '' ? null : clampNumber(Number(event.target.value), 0, 80) })}
                    placeholder="auto"
                  />
                </label>
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

          <section className="tool-card" aria-labelledby="flex-item-controls-title">
            <div className="tool-card__header tool-card__header--split">
              <h2 id="flex-item-controls-title">Item controls</h2>
              <button type="button" className="tool-button tool-button--secondary tool-button--icon" onClick={addItem} aria-label="Add flex item">
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>

            {selectedItem && (
              <>
                <div className="field-group">
                  <label className="field-label">Selected item</label>
                  <div className="item-picker" aria-label="Flex item selector">
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
                  <label className="field-label">Order</label>
                  <input
                    type="number"
                    className="number-input"
                    value={selectedItem.order}
                    onChange={(event) => updateItem(selectedItem.id, { order: Number(event.target.value) })}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Grow / shrink</label>
                  <div className="dual-inputs dual-inputs--compact">
                    <label>
                      <span>Grow</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={selectedItem.flexGrow}
                        onChange={(event) => updateItem(selectedItem.id, { flexGrow: clampNumber(Number(event.target.value) || 0, 0, 10) })}
                      />
                    </label>
                    <label>
                      <span>Shrink</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={selectedItem.flexShrink}
                        onChange={(event) => updateItem(selectedItem.id, { flexShrink: clampNumber(Number(event.target.value) || 0, 0, 10) })}
                      />
                    </label>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Flex basis</label>
                  <div className="basis-row">
                    <select
                      value={selectedItem.basisMode}
                      onChange={(event) => updateItem(selectedItem.id, { basisMode: event.target.value as BasisUnit })}
                    >
                      <option value="auto">Auto</option>
                      <option value="px">Pixels</option>
                      <option value="%">Percent</option>
                    </select>
                    {selectedItem.basisMode !== 'auto' && (
                      <input
                        type="number"
                        min="0"
                        max={selectedItem.basisMode === '%' ? 100 : 400}
                        value={selectedItem.basisValue}
                        onChange={(event) => updateItem(selectedItem.id, { basisValue: clampNumber(Number(event.target.value) || 0, 0, selectedItem.basisMode === '%' ? 100 : 400) })}
                      />
                    )}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Align self</label>
                  <div className="segmented-group segmented-group--stacked" role="radiogroup" aria-label="Align self option">
                    {ITEM_ALIGN_OPTIONS.map((value) => (
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

        <div className="flexbox-generator__preview-column">
          <section className="tool-card tool-card--preview" aria-labelledby="flex-preview-title">
            <div className="tool-card__header tool-card__header--split">
              <h2 id="flex-preview-title">Live preview</h2>
              {activePreset && <span className="preset-badge">{activePreset.name}</span>}
            </div>

            <div className="flexbox-generator__preview-wrap">
              <div className="flexbox-generator__preview-scroller">
                <div className="flexbox-generator__preview" style={previewStyle} aria-label="Flex preview container">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`flexbox-generator__item${selectedItemId === item.id ? ' flexbox-generator__item--selected' : ''}`}
                      style={{
                        order: item.order,
                        flexGrow: item.flexGrow,
                        flexShrink: item.flexShrink,
                        flexBasis: item.basisMode === 'auto' ? 'auto' : `${item.basisValue}${item.basisMode}`,
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

          <section className="tool-card" aria-labelledby="flex-css-title">
            <div className="tool-card__header">
              <h2 id="flex-css-title">Generated CSS</h2>
            </div>

            <div className="code-block">
              <pre>{containerCss}</pre>
            </div>

            <div className="code-block code-block--secondary">
              <pre>{itemCss}</pre>
            </div>

            <div className="tool-card__actions">
              <button type="button" className="tool-button tool-button--secondary" onClick={() => copyText(containerCss, 'Container CSS')}>
                <Copy size={15} aria-hidden="true" /> Copy Container CSS
              </button>
              <button type="button" className="tool-button tool-button--secondary" onClick={() => copyText(itemCss, 'Item CSS')}>
                <Copy size={15} aria-hidden="true" /> Copy Item CSS
              </button>
              <button type="button" className="tool-button tool-button--primary" onClick={() => copyText(completeCss, 'Complete CSS')}>
                <Copy size={15} aria-hidden="true" /> Copy Complete CSS
              </button>
              <button type="button" className="tool-button tool-button--secondary" onClick={downloadCss}>
                <Download size={15} aria-hidden="true" /> Download CSS
              </button>
            </div>
          </section>

          <section className="tool-card" aria-labelledby="flex-presets-title">
            <div className="tool-card__header">
              <h2 id="flex-presets-title">Presets</h2>
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
                    {Array.from({ length: preset.itemCount }, (_, index) => (
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

      <section className="flexbox-generator__help" aria-labelledby="flex-help-title">
        <div className="tool-card">
          <div className="tool-card__header">
            <h2 id="flex-help-title">Beginner guide</h2>
          </div>
          <ul className="help-list">
            <li><strong>What is Flexbox?</strong> A layout system that arranges items inside a container and lets them align, wrap, and distribute space efficiently.</li>
            <li><strong>Container vs item.</strong> The parent element is the flex container; each child is a flex item. The container decides spacing, alignment, and wrapping.</li>
            <li><strong>justify-content vs align-items.</strong> <code>justify-content</code> works along the main axis; <code>align-items</code> works across the cross axis.</li>
            <li><strong>flex-direction.</strong> Changes the main axis from row to column or reverse order, affecting how items flow.</li>
            <li><strong>flex-wrap.</strong> Lets content break onto additional rows or columns instead of shrinking or overflowing.</li>
            <li><strong>flex-grow, flex-shrink, flex-basis.</strong> Control how items expand, compress, and start their size when space changes.</li>
            <li><strong>align-self and order.</strong> Use these to override a single item’s position or reorder it without changing everyone else.</li>
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
