export interface VisitorGeoInfo {
  countryCode: string;
  countryName: string;
}

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  'Asia/Dhaka': 'BD',
  'Asia/Dacca': 'BD',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Karachi': 'PK',
  'Asia/Kathmandu': 'NP',
  'Asia/Colombo': 'LK',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Muscat': 'OM',
  'Asia/Bahrain': 'BH',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Jakarta': 'ID',
  'Asia/Bangkok': 'TH',
  'Asia/Manila': 'PH',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Amsterdam': 'NL',
  'Europe/Stockholm': 'SE',
  'Europe/Zurich': 'CH',
  'Europe/Warsaw': 'PL',
  'Europe/Istanbul': 'TR',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Sao_Paulo': 'BR',
  'America/Mexico_City': 'MX',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ',
  'Africa/Cairo': 'EG',
  'Africa/Lagos': 'NG',
  'Africa/Johannesburg': 'ZA',
};

const FALLBACK_COUNTRY_NAMES: Record<string, string> = {
  BD: 'Bangladesh',
  IN: 'India',
  PK: 'Pakistan',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  MY: 'Malaysia',
  SG: 'Singapore',
  QA: 'Qatar',
  KW: 'Kuwait',
  OM: 'Oman',
  ID: 'Indonesia',
  JP: 'Japan',
  KR: 'South Korea',
  BR: 'Brazil',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  TR: 'Turkey',
  UN: 'International',
};

export function countryCodeToName(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  if (!clean || clean === 'XX' || clean === 'UN') return 'International';
  try {
    const DisplayNamesCtor = Intl.DisplayNames;
    if (DisplayNamesCtor) {
      const display = new DisplayNamesCtor(['en'], { type: 'region' });
      const resolved = display.of(clean);
      if (resolved && resolved !== clean) {
        return resolved.slice(0, 60);
      }
    }
  } catch {
    // Fallback to static dictionary below
  }
  return FALLBACK_COUNTRY_NAMES[clean] ?? clean;
}

export function countryCodeToFlag(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z]/g, '');
  if (clean.length !== 2 || clean === 'UN' || clean === 'XX') return '🌐';
  const base = 0x1f1e6 - 65;
  return String.fromCodePoint(base + clean.charCodeAt(0), base + clean.charCodeAt(1));
}

function detectFromBrowserLocale(): VisitorGeoInfo {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_COUNTRY[tz]) {
      const code = TIMEZONE_TO_COUNTRY[tz];
      return { countryCode: code, countryName: countryCodeToName(code) };
    }
  } catch {
    // Ignore Intl errors
  }

  try {
    const langs =
      typeof navigator !== 'undefined'
        ? [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
        : [];
    for (const lang of langs) {
      const match = /[-_]([A-Z]{2})\b/i.exec(lang);
      if (match?.[1]) {
        const code = match[1].toUpperCase();
        return { countryCode: code, countryName: countryCodeToName(code) };
      }
    }
  } catch {
    // Ignore navigator errors
  }

  return { countryCode: 'UN', countryName: 'International' };
}

let inFlightGeo: Promise<VisitorGeoInfo> | null = null;

export async function detectVisitorCountry(): Promise<VisitorGeoInfo> {
  if (typeof window === 'undefined') {
    return { countryCode: 'UN', countryName: 'International' };
  }

  try {
    const cachedRaw = window.sessionStorage.getItem('shanto_visitor_geo_v1');
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as VisitorGeoInfo;
      if (parsed?.countryCode && parsed?.countryName) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage failures
  }

  if (inFlightGeo) return inFlightGeo;

  inFlightGeo = (async () => {
    const fallback = detectFromBrowserLocale();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return fallback;
    }

    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 2400);
      const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
        signal: controller.signal,
        cache: 'no-store',
      });
      window.clearTimeout(timer);
      if (res.ok) {
        const body = await res.text();
        const match = /^loc=([A-Z]{2})$/m.exec(body);
        if (match?.[1] && match[1] !== 'XX') {
          const code = match[1].toUpperCase();
          const result: VisitorGeoInfo = {
            countryCode: code,
            countryName: countryCodeToName(code),
          };
          try {
            window.sessionStorage.setItem('shanto_visitor_geo_v1', JSON.stringify(result));
          } catch {
            // ignore
          }
          return result;
        }
      }
    } catch {
      // Network or CORS fallback silently uses browser timezone/locale
    }

    try {
      window.sessionStorage.setItem('shanto_visitor_geo_v1', JSON.stringify(fallback));
    } catch {
      // ignore
    }
    return fallback;
  })();

  try {
    return await inFlightGeo;
  } finally {
    inFlightGeo = null;
  }
}
