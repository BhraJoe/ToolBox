import WordCounter from '../../components/tools/word-counter/WordCounter';
import Icon from '../../components/common/Icon';

export default function WordCounterPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="file-text" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Word Counter</h1>
          <p className="tool-view__desc">
            Analyze your text and explore detailed statistics about its length, structure, and readability.
          </p>
        </div>
      </div>

      <WordCounter />
    </div>
  );
}
