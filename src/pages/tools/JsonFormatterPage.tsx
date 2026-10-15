import Icon from '../../components/common/Icon';
import JsonFormatter from '../../components/tools/json-formatter/JsonFormatter';

export default function JsonFormatterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="braces" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">JSON Formatter &amp; Validator</h1>
          <p className="tool-view__desc">
            Format, validate, minify, and inspect JSON data directly in your browser.
          </p>
        </div>
      </div>

      <JsonFormatter />
    </div>
  );
}
