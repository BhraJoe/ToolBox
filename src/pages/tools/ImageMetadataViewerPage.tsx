import Icon from '../../components/common/Icon';
import ImageMetadataViewer from '../../components/tools/image-metadata-viewer/ImageMetadataViewer';

export default function ImageMetadataViewerPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="file-image" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Image Metadata Viewer</h1>
          <p className="tool-view__desc">
            Inspect image properties and metadata. Works entirely in your browser — images never leave your device.
          </p>
        </div>
      </div>

      <ImageMetadataViewer />
    </div>
  );
}
