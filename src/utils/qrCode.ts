import * as QRCode from 'qrcode';

export type QrContentType = 'url' | 'text' | 'email' | 'phone' | 'sms' | 'wifi' | 'contact';
export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrContentValues {
  url: string;
  text: string;
  email: string;
  emailSubject: string;
  emailMessage: string;
  phone: string;
  smsPhone: string;
  smsMessage: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: 'WPA' | 'WEP' | 'nopass';
  wifiHidden: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactOrganization: string;
  contactWebsite: string;
  contactAddress: string;
}

export interface QrCustomization {
  foregroundColor: string;
  backgroundColor: string;
  transparentBackground: boolean;
  size: number;
  errorCorrectionLevel: QrErrorCorrectionLevel;
  includeMargin: boolean;
}

export const DEFAULT_QR_VALUES: QrContentValues = {
  url: '',
  text: '',
  email: '',
  emailSubject: '',
  emailMessage: '',
  phone: '',
  smsPhone: '',
  smsMessage: '',
  wifiSsid: '',
  wifiPassword: '',
  wifiSecurity: 'WPA',
  wifiHidden: false,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  contactOrganization: '',
  contactWebsite: '',
  contactAddress: '',
};

export const DEFAULT_QR_CUSTOMIZATION: QrCustomization = {
  foregroundColor: '#111827',
  backgroundColor: '#FFFFFF',
  transparentBackground: false,
  size: 256,
  errorCorrectionLevel: 'M',
  includeMargin: true,
};

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function normalizeWebAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/\s/.test(trimmed)) throw new Error('Enter a valid website address without spaces.');

  const schemeMatch = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  const colonIndex = trimmed.indexOf(':');
  const hasPort = colonIndex > 0 && /^\d+(?:\/|[?#]|$)/.test(trimmed.slice(colonIndex + 1));
  const hasScheme = schemeMatch && !hasPort;
  const address = hasScheme ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(address);
  } catch {
    throw new Error('Enter a valid website address, such as example.com.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Website addresses must use http:// or https://.');
  }
  if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost' && !parsed.hostname.startsWith('['))) {
    throw new Error('Enter a valid website address, such as example.com.');
  }
  return parsed.href;
}

function validateEmail(value: string, label = 'email address'): string {
  const email = value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return email;
}

function normalizePhone(value: string, label: string): string {
  const trimmed = value.trim();
  const phone = trimmed.replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(phone) || (phone.match(/\d/g) ?? []).length < 3) {
    throw new Error(`Enter a valid ${label} with at least three digits.`);
  }
  return phone;
}

function escapeWifiValue(value: string): string {
  return value
    .replace(/([\\;,:"])/g, '\\$1')
    .replace(/\r\n|\r|\n/g, '\\n');
}

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildQrPayload(type: QrContentType, values: QrContentValues): string {
  switch (type) {
    case 'url':
      return normalizeWebAddress(values.url);
    case 'text':
      return values.text;
    case 'email': {
      if ([values.email, values.emailSubject, values.emailMessage].every(isBlank)) return '';
      const email = validateEmail(values.email);
      const query = [
        values.emailSubject ? `subject=${encodeURIComponent(values.emailSubject)}` : '',
        values.emailMessage ? `body=${encodeURIComponent(values.emailMessage)}` : '',
      ].filter(Boolean);
      return `mailto:${email}${query.length ? `?${query.join('&')}` : ''}`;
    }
    case 'phone':
      return isBlank(values.phone) ? '' : `tel:${normalizePhone(values.phone, 'phone number')}`;
    case 'sms': {
      if (isBlank(values.smsPhone) && isBlank(values.smsMessage)) return '';
      const phone = normalizePhone(values.smsPhone, 'phone number');
      return `sms:${phone}${values.smsMessage ? `?body=${encodeURIComponent(values.smsMessage)}` : ''}`;
    }
    case 'wifi': {
      if (isBlank(values.wifiSsid) && (values.wifiSecurity === 'nopass' || isBlank(values.wifiPassword))) {
        return '';
      }
      if (isBlank(values.wifiSsid)) throw new Error('Enter the Wi-Fi network name (SSID).');
      if (values.wifiSecurity !== 'nopass' && isBlank(values.wifiPassword)) {
        throw new Error('Enter a Wi-Fi password or choose No password.');
      }
      const password = values.wifiSecurity === 'nopass' ? '' : `P:${escapeWifiValue(values.wifiPassword)};`;
      return `WIFI:T:${values.wifiSecurity};S:${escapeWifiValue(values.wifiSsid)};${password}H:${values.wifiHidden ? 'true' : 'false'};;`;
    }
    case 'contact': {
      const contactValues = [
        values.contactName,
        values.contactPhone,
        values.contactEmail,
        values.contactOrganization,
        values.contactWebsite,
        values.contactAddress,
      ];
      if (contactValues.every(isBlank)) return '';
      if (isBlank(values.contactName)) throw new Error('Enter the contact’s full name.');

      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${escapeVCardValue(values.contactName.trim())}`,
      ];
      const nameParts = values.contactName.trim().split(/\s+/);
      const familyName = nameParts.pop() ?? '';
      lines.push(`N:${escapeVCardValue(familyName)};${escapeVCardValue(nameParts.join(' '))};;;`);
      if (!isBlank(values.contactPhone)) {
        lines.push(`TEL;TYPE=CELL:${escapeVCardValue(normalizePhone(values.contactPhone, 'contact phone number'))}`);
      }
      if (!isBlank(values.contactEmail)) {
        lines.push(`EMAIL:${escapeVCardValue(validateEmail(values.contactEmail))}`);
      }
      if (!isBlank(values.contactOrganization)) {
        lines.push(`ORG:${escapeVCardValue(values.contactOrganization)}`);
      }
      if (!isBlank(values.contactWebsite)) {
        lines.push(`URL:${escapeVCardValue(normalizeWebAddress(values.contactWebsite))}`);
      }
      if (!isBlank(values.contactAddress)) {
        lines.push(`ADR;TYPE=HOME:;;${escapeVCardValue(values.contactAddress)};;;;`);
      }
      lines.push('END:VCARD');
      return lines.join('\r\n');
    }
  }
}

function getQrOptions(customization: QrCustomization) {
  if (!isValidHexColor(customization.foregroundColor) || !isValidHexColor(customization.backgroundColor)) {
    throw new Error('Enter valid six-digit hexadecimal colors.');
  }
  return {
    errorCorrectionLevel: customization.errorCorrectionLevel,
    margin: customization.includeMargin ? 4 : 0,
    width: customization.size,
    color: {
      dark: customization.foregroundColor,
      light: customization.transparentBackground ? '#00000000' : customization.backgroundColor,
    },
  };
}

export function generateQrPng(payload: string, customization: QrCustomization): Promise<string> {
  return QRCode.toDataURL(payload, { ...getQrOptions(customization), type: 'image/png' });
}

export function generateQrSvg(payload: string, customization: QrCustomization): Promise<string> {
  return QRCode.toString(payload, { ...getQrOptions(customization), type: 'svg' });
}

export function isValidHexColor(value: string): boolean {
  return /^#[\da-f]{6}$/i.test(value);
}

function relativeLuminance(color: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getQrContrastRatio(foreground: string, background: string): number {
  if (!isValidHexColor(foreground) || !isValidHexColor(background)) return 0;
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}
