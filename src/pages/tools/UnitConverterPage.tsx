import UnitConverter from '../../components/tools/unit-converter/UnitConverter';
import Icon from '../../components/common/Icon';

export default function UnitConverterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="ruler" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Unit Converter</h1>
          <p className="tool-view__desc">
            Convert between units of measurement including length, weight, temperature, area, volume, speed, time, and data.
          </p>
        </div>
      </div>

      <UnitConverter />
    </div>
  );
}