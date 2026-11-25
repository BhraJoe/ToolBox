import Icon from '../../components/common/Icon';
import ImageBackgroundRemover from '../../components/tools/image-background-remover/ImageBackgroundRemover';

export default function ImageBackgroundRemoverPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Background Remover</h1>
          <p className="tool-view__desc">
            Remove image backgrounds automatically and refine the result locally in your browser.
          </p>
        </div>
      </div>
      <ImageBackgroundRemover />
    </div>
  );
}
