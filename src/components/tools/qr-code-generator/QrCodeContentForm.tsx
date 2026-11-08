import type { QrContentType, QrContentValues } from '../../../utils/qrCode';

interface QrCodeContentFormProps {
  type: QrContentType;
  values: QrContentValues;
  error: string;
  onTypeChange: (type: QrContentType) => void;
  onChange: (updates: Partial<QrContentValues>) => void;
}

const CONTENT_TYPES: { id: QrContentType; label: string }[] = [
  { id: 'url', label: 'Website' },
  { id: 'text', label: 'Text' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'sms', label: 'SMS' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'contact', label: 'Contact' },
];

function TextField({
  id,
  label,
  value,
  placeholder,
  onChange,
  multiline = false,
  type = 'text',
  required = false,
}: {
  id: keyof QrContentValues;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  required?: boolean;
}) {
  const sharedProps = {
    id,
    value,
    placeholder,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    required,
    'aria-required': required,
  };
  return (
    <div className="qr-tool__field">
      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      {multiline ? (
        <textarea {...sharedProps} rows={4} />
      ) : (
        <input {...sharedProps} type={type} />
      )}
    </div>
  );
}

export default function QrCodeContentForm({
  type,
  values,
  error,
  onTypeChange,
  onChange,
}: QrCodeContentFormProps) {
  return (
    <section className="qr-tool__card" aria-labelledby="qr-content-heading">
      <div className="qr-tool__section-heading">
        <div>
          <span className="qr-tool__eyebrow">Step 1</span>
          <h2 id="qr-content-heading">QR code content</h2>
        </div>
      </div>

      <div className="qr-tool__type-grid" role="group" aria-label="QR code content type">
        {CONTENT_TYPES.map((contentType) => (
          <button
            type="button"
            key={contentType.id}
            className={`qr-tool__type-button${type === contentType.id ? ' qr-tool__type-button--active' : ''}`}
            aria-pressed={type === contentType.id}
            onClick={() => onTypeChange(contentType.id)}
          >
            {contentType.label}
          </button>
        ))}
      </div>

      <div className="qr-tool__fields">
        {type === 'url' && (
          <TextField id="url" label="Website URL" value={values.url} placeholder="example.com or https://example.com" required onChange={(url) => onChange({ url })} />
        )}
        {type === 'text' && (
          <TextField id="text" label="Text" value={values.text} placeholder="Enter any text, including multiple lines" multiline onChange={(text) => onChange({ text })} />
        )}
        {type === 'email' && (
          <>
            <TextField id="email" label="Email address" value={values.email} placeholder="name@example.com" type="email" required onChange={(email) => onChange({ email })} />
            <TextField id="emailSubject" label="Subject (optional)" value={values.emailSubject} placeholder="A short subject" onChange={(emailSubject) => onChange({ emailSubject })} />
            <TextField id="emailMessage" label="Message (optional)" value={values.emailMessage} placeholder="Write a message" multiline onChange={(emailMessage) => onChange({ emailMessage })} />
          </>
        )}
        {type === 'phone' && (
          <TextField id="phone" label="Phone number" value={values.phone} placeholder="+1 555 123 4567" type="tel" required onChange={(phone) => onChange({ phone })} />
        )}
        {type === 'sms' && (
          <>
            <TextField id="smsPhone" label="Phone number" value={values.smsPhone} placeholder="+1 555 123 4567" type="tel" required onChange={(smsPhone) => onChange({ smsPhone })} />
            <TextField id="smsMessage" label="Message (optional)" value={values.smsMessage} placeholder="Write a text message" multiline onChange={(smsMessage) => onChange({ smsMessage })} />
          </>
        )}
        {type === 'wifi' && (
          <>
            <TextField id="wifiSsid" label="Network name (SSID)" value={values.wifiSsid} placeholder="Your Wi-Fi network" required onChange={(wifiSsid) => onChange({ wifiSsid })} />
            {values.wifiSecurity !== 'nopass' && (
              <TextField id="wifiPassword" label="Password" value={values.wifiPassword} placeholder="Network password" type="password" required onChange={(wifiPassword) => onChange({ wifiPassword })} />
            )}
            <div className="qr-tool__field">
              <label htmlFor="wifiSecurity">Security</label>
              <select id="wifiSecurity" value={values.wifiSecurity} onChange={(event) => onChange({ wifiSecurity: event.target.value as QrContentValues['wifiSecurity'] })}>
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No password</option>
              </select>
            </div>
            <label className="qr-tool__check" htmlFor="wifiHidden">
              <input id="wifiHidden" type="checkbox" checked={values.wifiHidden} onChange={(event) => onChange({ wifiHidden: event.target.checked })} />
              <span>Hidden network</span>
            </label>
          </>
        )}
        {type === 'contact' && (
          <>
            <TextField id="contactName" label="Full name" value={values.contactName} placeholder="Alex Morgan" required onChange={(contactName) => onChange({ contactName })} />
            <TextField id="contactPhone" label="Phone number" value={values.contactPhone} placeholder="+1 555 123 4567" type="tel" onChange={(contactPhone) => onChange({ contactPhone })} />
            <TextField id="contactEmail" label="Email address" value={values.contactEmail} placeholder="alex@example.com" type="email" onChange={(contactEmail) => onChange({ contactEmail })} />
            <TextField id="contactOrganization" label="Organization" value={values.contactOrganization} placeholder="Company or organization" onChange={(contactOrganization) => onChange({ contactOrganization })} />
            <TextField id="contactWebsite" label="Website" value={values.contactWebsite} placeholder="example.com" onChange={(contactWebsite) => onChange({ contactWebsite })} />
            <TextField id="contactAddress" label="Address (optional)" value={values.contactAddress} placeholder="Street, city, region" multiline onChange={(contactAddress) => onChange({ contactAddress })} />
          </>
        )}
      </div>

      {error && <p className="qr-tool__field-error" role="alert">{error}</p>}
      <p className="qr-tool__helper">Your content stays in this browser and is never sent to a server.</p>
    </section>
  );
}
