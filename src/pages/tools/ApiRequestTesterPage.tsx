import Icon from '../../components/common/Icon';
import ApiRequestTester from '../../components/tools/api-request-tester/ApiRequestTester';

export default function ApiRequestTesterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="network" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">API Request Tester</h1>
          <p className="tool-view__desc">
            Send HTTP requests and inspect API responses directly from your browser.
          </p>
        </div>
      </div>

      <ApiRequestTester />
    </div>
  );
}