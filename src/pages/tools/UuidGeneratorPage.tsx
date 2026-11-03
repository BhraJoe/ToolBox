import Icon from '../../components/common/Icon';
import UuidGenerator from '../../components/tools/uuid-generator/UuidGenerator';

export default function UuidGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="fingerprint" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">UUID Generator</h1>
          <p className="tool-view__desc">
            Generate unique identifiers for applications, databases, APIs, and development projects.
          </p>
        </div>
      </div>

      <UuidGenerator />
    </div>
  );
}
