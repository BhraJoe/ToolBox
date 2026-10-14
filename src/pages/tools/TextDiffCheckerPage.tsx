import Icon from '../../components/common/Icon';
import TextDiffChecker from '../../components/tools/text-diff-checker/TextDiffChecker';

export default function TextDiffCheckerPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="file-diff" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Text Diff Checker</h1>
          <p className="tool-view__desc">
            Compare two versions of text and quickly spot what was added, removed, or changed.
          </p>
        </div>
      </div>

      <TextDiffChecker />
    </div>
  );
}
