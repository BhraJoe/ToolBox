import TextCaseConverter from '../../components/tools/text-case-converter/TextCaseConverter';
import Icon from '../../components/common/Icon';

export default function TextCaseConverterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="case-sensitive" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Text Case Converter</h1>
          <p className="tool-view__desc">
            Change the capitalization and naming format of your text.
          </p>
        </div>
      </div>

      <TextCaseConverter />
    </div>
  );
}
