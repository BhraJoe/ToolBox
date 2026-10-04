import type { HistoryItem } from './types';
import { History, Trash2 } from 'lucide-react';

interface CalculatorHistoryProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onSelectHistoryItem: (result: string) => void;
}

export default function CalculatorHistory({
  history,
  onClearHistory,
  onSelectHistoryItem,
}: CalculatorHistoryProps) {
  return (
    <div className="calculator-history" aria-label="Calculation History">
      <div className="calculator-history__header">
        <div className="calculator-history__title">
          <History size={16} />
          <span>History</span>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            className="calculator-history__clear-btn"
            onClick={onClearHistory}
            aria-label="Clear history"
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div className="calculator-history__list">
        {history.length === 0 ? (
          <div className="calculator-history__empty">
            No calculations yet. Perform a calculation to see history.
          </div>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              type="button"
              className="calculator-history__item"
              onClick={() => onSelectHistoryItem(item.result)}
              title="Click to use this result"
            >
              <span className="calculator-history__expression">
                {item.expression} =
              </span>
              <span className="calculator-history__result">{item.result}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
