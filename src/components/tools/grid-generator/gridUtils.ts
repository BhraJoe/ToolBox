export type GridJustifyItems = 'auto' | 'start' | 'center' | 'end' | 'stretch';
export type GridAlignItems = 'auto' | 'start' | 'center' | 'end' | 'stretch';

export interface GridContainerConfig {
  templateColumns: string;
  templateRows: string;
  gap: number;
  justifyItems: GridJustifyItems;
  alignItems: GridAlignItems;
  width: number;
  height: number;
}

export interface GridItem {
  id: number;
  label: string;
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
  justifySelf: GridJustifyItems;
  alignSelf: GridAlignItems;
  color: string;
}

export interface PresetDefinition {
  id: string;
  name: string;
  config: Partial<GridContainerConfig>;
  items: Partial<GridItem>[];
}

export const DEFAULT_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb7185'];

export const GRID_TEMPLATE_OPTIONS = [
  { value: '1fr', label: '1 column', hint: 'Single column' },
  { value: '1fr 1fr', label: '2 columns', hint: 'Two equal columns' },
  { value: 'repeat(3, 1fr)', label: '3 columns', hint: 'Three equal columns' },
  { value: 'repeat(4, 1fr)', label: '4 columns', hint: 'Four equal columns' },
  { value: '1fr 2fr 1fr', label: '1:2:1 columns', hint: 'Center column twice as wide' },
  { value: 'minmax(100px, 1fr)', label: 'Minmax columns', hint: 'Minimum width, flexible growth' },
] as const;

export const GRID_CONTAINER_PRESETS: Record<string, Partial<GridContainerConfig>> = {
  'holy-grail': {
    templateColumns: '1fr 1fr 1fr',
    templateRows: 'auto auto auto',
    gap: 16,
    justifyItems: 'stretch',
    alignItems: 'stretch',
    width: 720,
    height: 260,
  },
  'simple-grid': {
    templateColumns: 'repeat(2, 1fr)',
    templateRows: 'repeat(2, auto)',
    gap: 16,
    justifyItems: 'stretch',
    alignItems: 'stretch',
    width: 720,
    height: 260,
  },
  'card-grid': {
    templateColumns: 'repeat(3, 1fr)',
    templateRows: 'auto auto',
    gap: 20,
    justifyItems: 'stretch',
    alignItems: 'stretch',
    width: 720,
    height: 300,
  },
};

export const GRID_PRESET_DEFINITIONS: PresetDefinition[] = [
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

export function randomGridItemColor(): string {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
}

export function buildDownloadableGridCss(config: {
  templateColumns: string;
  templateRows: string;
  gap: number;
  justifyItems: GridJustifyItems;
  alignItems: GridAlignItems;
  width: number;
  height: number;
}): string {
  return `.grid-container {\n  display: grid;\n  grid-template-columns: ${config.templateColumns};\n  grid-template-rows: ${config.templateRows};\n  gap: ${config.gap}px;\n  justify-items: ${config.justifyItems};\n  align-items: ${config.alignItems};\n  width: ${config.width}px;\n  height: ${config.height}px;\n}\n`;
}
