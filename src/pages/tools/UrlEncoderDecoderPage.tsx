import Icon from '../../components/common/Icon';
import UrlEncoderDecoder from '../../components/tools/url-encoder-decoder/UrlEncoderDecoder';

export default function UrlEncoderDecoderPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="link-2" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">URL Encoder &amp; Decoder</h1>
          <p className="tool-view__desc">
            Encode and decode URL components or full URLs directly in your browser while keeping the structure intact.
          </p>
        </div>
      </div>

      <UrlEncoderDecoder />
    </div>
  );
}
