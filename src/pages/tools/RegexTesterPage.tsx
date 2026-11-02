import Icon from '../../components/common/Icon';
import RegexTester from '../../components/tools/regex-tester/RegexTester';

export default function RegexTesterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="search" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Regex Tester</h1>
          <p className="tool-view__desc">
            Create, test, debug, and understand regular expressions with live match highlighting and capture group inspection.
          </p>
        </div>
      </div>

      <RegexTester />
    </div>
  );
}
