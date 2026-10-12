import CurrencyConverter from '../../components/tools/currency-converter/CurrencyConverter';
import Icon from '../../components/common/Icon';

export default function CurrencyConverterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="arrow-left-right" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Currency Converter</h1>
          <p className="tool-view__desc">
            Convert currencies using live exchange rates.
          </p>
        </div>
      </div>

      <CurrencyConverter />
    </div>
  );
}