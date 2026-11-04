import Icon from '../../components/common/Icon';
import MarkdownEditor from '../../components/tools/markdown-editor/MarkdownEditor';

export default function MarkdownEditorPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="file-code" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Markdown Editor &amp; Preview</h1>
          <p className="tool-view__desc">
            Write, edit, format, and preview Markdown documents in real time. Create README files,
            technical documentation, and notes with ease.
          </p>
        </div>
      </div>

      <MarkdownEditor />
    </div>
  );
}
