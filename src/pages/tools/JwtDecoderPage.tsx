import Icon from '../../components/common/Icon';
import JwtDecoder from '../../components/tools/jwt-decoder/JwtDecoder';

export default function JwtDecoderPage() {
  return (
    <div className="tool-view">
      <div className="tool-view__header">
        <div className="tool-view__icon-wrap">
          <Icon name="key-round" size={28} />
        </div>
        <div>
          <h1 className="tool-view__title">JWT Decoder</h1>
          <p className="tool-view__desc">
            Decode and inspect JSON Web Tokens. View headers, payloads, claims, and expiration information directly in your browser.
          </p>
        </div>
      </div>

      <JwtDecoder />
    </div>
  );
}
