import React, { useState } from 'react';
import { Input, Select, Space } from 'antd';

export type CountryDial = {
  iso: string;
  name: string;
  dial: string;
};

/** Common calling codes — US (+1) first as the default. */
export const COUNTRY_DIALS: CountryDial[] = [
  { iso: 'US', name: 'United States', dial: '1' },
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'AU', name: 'Australia', dial: '61' },
  { iso: 'NZ', name: 'New Zealand', dial: '64' },
  { iso: 'IE', name: 'Ireland', dial: '353' },
  { iso: 'DE', name: 'Germany', dial: '49' },
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'ES', name: 'Spain', dial: '34' },
  { iso: 'IT', name: 'Italy', dial: '39' },
  { iso: 'NL', name: 'Netherlands', dial: '31' },
  { iso: 'BE', name: 'Belgium', dial: '32' },
  { iso: 'CH', name: 'Switzerland', dial: '41' },
  { iso: 'AT', name: 'Austria', dial: '43' },
  { iso: 'SE', name: 'Sweden', dial: '46' },
  { iso: 'NO', name: 'Norway', dial: '47' },
  { iso: 'DK', name: 'Denmark', dial: '45' },
  { iso: 'FI', name: 'Finland', dial: '358' },
  { iso: 'PT', name: 'Portugal', dial: '351' },
  { iso: 'PL', name: 'Poland', dial: '48' },
  { iso: 'MX', name: 'Mexico', dial: '52' },
  { iso: 'BR', name: 'Brazil', dial: '55' },
  { iso: 'AR', name: 'Argentina', dial: '54' },
  { iso: 'IN', name: 'India', dial: '91' },
  { iso: 'SG', name: 'Singapore', dial: '65' },
  { iso: 'HK', name: 'Hong Kong', dial: '852' },
  { iso: 'JP', name: 'Japan', dial: '81' },
  { iso: 'KR', name: 'South Korea', dial: '82' },
  { iso: 'PH', name: 'Philippines', dial: '63' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971' },
  { iso: 'ZA', name: 'South Africa', dial: '27' },
];

const DEFAULT_ISO = 'US';
const COUNTRY_SELECT_WIDTH = 118;

/** PNG flags — emoji flags render as letter pairs on Windows. */
function flagUrl(iso: string): string {
  return `https://flagcdn.com/w40/${iso.toLowerCase()}.png`;
}

const FlagImg: React.FC<{ iso: string; className?: string }> = ({ iso, className = '' }) => (
  <img
    src={flagUrl(iso)}
    alt=""
    width={20}
    height={14}
    loading="lazy"
    decoding="async"
    className={`inline-block shrink-0 rounded-[2px] object-cover ${className}`}
    style={{ width: 20, height: 14 }}
  />
);

/** Digits only — strips spaces, dashes, parens, letters, etc. */
export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** E.164: + then 7–15 digits total (country + national). */
export const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export function isValidE164(value: string | undefined): boolean {
  return !!value && E164_PATTERN.test(value);
}

function findCountryForE164(e164: string): CountryDial {
  const digits = e164.replace(/^\+/, '');
  const sorted = [...COUNTRY_DIALS].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find((c) => digits.startsWith(c.dial)) ?? COUNTRY_DIALS[0];
}

function nationalFromE164(e164: string, dial: string): string {
  const digits = e164.replace(/^\+/, '');
  return digits.startsWith(dial) ? digits.slice(dial.length) : digits;
}

function toE164(dial: string, national: string): string {
  const digits = digitsOnly(national);
  return digits ? `+${dial}${digits}` : '';
}

export type PhoneDestinationInputProps = {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Country dial (flag image + code) + national number.
 * Emits a full E.164 string via onChange. National field accepts digits only.
 */
const PhoneDestinationInput: React.FC<PhoneDestinationInputProps> = ({
  id,
  value,
  onChange,
  disabled,
  placeholder = '4155550123',
}) => {
  const initial = value && value.startsWith('+') ? findCountryForE164(value) : null;
  const [iso, setIso] = useState<string>(initial?.iso ?? DEFAULT_ISO);
  const [national, setNational] = useState<string>(
    initial && value ? nationalFromE164(value, initial.dial) : ''
  );
  const [lastExternal, setLastExternal] = useState(value);

  if (value !== lastExternal) {
    setLastExternal(value);
    if (value && value.startsWith('+')) {
      const matched = findCountryForE164(value);
      setIso(matched.iso);
      setNational(nationalFromE164(value, matched.dial));
    } else if (!value) {
      setNational('');
      setIso(DEFAULT_ISO);
    }
  }

  const country = COUNTRY_DIALS.find((c) => c.iso === iso) ?? COUNTRY_DIALS[0];

  const emit = (nextIso: string, nextNational: string) => {
    const nextCountry = COUNTRY_DIALS.find((c) => c.iso === nextIso) ?? COUNTRY_DIALS[0];
    onChange?.(toE164(nextCountry.dial, nextNational));
  };

  return (
    <Space.Compact className="w-full">
      <Select
        value={iso}
        disabled={disabled}
        onChange={(nextIso: string) => {
          setIso(nextIso);
          emit(nextIso, national);
        }}
        showSearch
        optionFilterProp="search"
        style={{ width: COUNTRY_SELECT_WIDTH }}
        dropdownStyle={{ minWidth: 280 }}
        popupMatchSelectWidth={false}
        aria-label="Country calling code"
        labelRender={() => (
          <span className="inline-flex items-center gap-1.5 leading-none">
            <FlagImg iso={country.iso} />
            <span className="font-mono text-sm text-ink">+{country.dial}</span>
          </span>
        )}
        options={COUNTRY_DIALS.map((c) => ({
          value: c.iso,
          // Plain string fallback if labelRender isn't used
          label: `${c.name} (+${c.dial})`,
          search: `${c.name} ${c.iso} +${c.dial}`,
        }))}
        optionRender={(option) => {
          const c = COUNTRY_DIALS.find((row) => row.iso === option.value);
          if (!c) return <>{option.label}</>;
          return (
            <span className="flex items-center gap-2 py-0.5">
              <FlagImg iso={c.iso} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted">+{c.dial}</span>
            </span>
          );
        }}
      />
      <Input
        id={id}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={national}
        aria-label="Phone number"
        className="font-mono"
        style={{ width: `calc(100% - ${COUNTRY_SELECT_WIDTH}px)` }}
        onChange={(event) => {
          const next = digitsOnly(event.target.value);
          setNational(next);
          emit(iso, next);
        }}
        onPaste={(event) => {
          event.preventDefault();
          const pasted = digitsOnly(event.clipboardData.getData('text'));
          if (pasted.startsWith(country.dial) && pasted.length > country.dial.length + 6) {
            const peeled = pasted.slice(country.dial.length);
            setNational(peeled);
            emit(iso, peeled);
            return;
          }
          setNational(pasted);
          emit(iso, pasted);
        }}
        onKeyDown={(event) => {
          if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
            return;
          }
          if (!/[0-9]/.test(event.key)) {
            event.preventDefault();
          }
        }}
      />
    </Space.Compact>
  );
};

export default PhoneDestinationInput;
