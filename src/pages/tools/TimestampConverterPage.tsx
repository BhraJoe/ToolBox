import Icon from '../../components/common/Icon';
import TimestampConverter from '../../components/tools/timestamp-converter/TimestampConverter';

export default function TimestampConverterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="clock" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Timestamp Converter</h1>
          <p className="tool-view__desc">
            Convert Unix timestamps and dates with seconds, milliseconds, and timezone support.
          </p>
        </div>
      </div>

      <TimestampConverter />
    </div>
  );
}
