export type Operator = '+' | '-' | '*' | '/' | '%';

export type ButtonType = 'digit' | 'operator' | 'action' | 'equals';

export interface CalculatorState {
  currentValue: string;
  previousValue: string | null;
  operator: Operator | null;
  expression: string;
  isNewNumber: boolean;
  error: string | null;
}

export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}
