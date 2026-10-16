import Icon from '../../components/common/Icon';
import Base64EncoderDecoder from '../../components/tools/base64-encoder-decoder/Base64EncoderDecoder';

export default function Base64EncoderDecoderPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="binary" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">Base64 Encoder &amp; Decoder</h1>
          <p className="tool-view__desc">
            Encode text to Base64 or decode Base64 into readable text, right in your browser.
          </p>
        </div>
      </div>

      <Base64EncoderDecoder />
    </div>
  );
}