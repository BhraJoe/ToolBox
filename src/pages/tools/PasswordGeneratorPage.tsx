import PasswordGenerator from '../../components/tools/password-generator/PasswordGenerator';
import Icon from '../../components/common/Icon';

export default function PasswordGeneratorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="key" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Password Generator</h1>
          <p className="tool-view__desc">
            Create strong and secure random passwords.
          </p>
        </div>
      </div>

      <PasswordGenerator />
    </div>
  );
}
