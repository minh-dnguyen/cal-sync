/**
 * Shared geographic reference data used by the register form and settings page.
 */

export interface GeoOption {
  value: string;
  label: string;
}

// ── Countries (ISO 3166-1 alpha-2) ────────────────────────────────────────────

export const COUNTRIES: GeoOption[] = [
  { value: "AF", label: "Afghanistan" },
  { value: "AL", label: "Albania" },
  { value: "DZ", label: "Algeria" },
  { value: "AR", label: "Argentina" },
  { value: "AM", label: "Armenia" },
  { value: "AU", label: "Australia" },
  { value: "AT", label: "Austria" },
  { value: "AZ", label: "Azerbaijan" },
  { value: "BH", label: "Bahrain" },
  { value: "BD", label: "Bangladesh" },
  { value: "BY", label: "Belarus" },
  { value: "BE", label: "Belgium" },
  { value: "BO", label: "Bolivia" },
  { value: "BA", label: "Bosnia and Herzegovina" },
  { value: "BR", label: "Brazil" },
  { value: "BG", label: "Bulgaria" },
  { value: "CA", label: "Canada" },
  { value: "CL", label: "Chile" },
  { value: "CN", label: "China" },
  { value: "CO", label: "Colombia" },
  { value: "HR", label: "Croatia" },
  { value: "CZ", label: "Czech Republic" },
  { value: "DK", label: "Denmark" },
  { value: "EG", label: "Egypt" },
  { value: "EE", label: "Estonia" },
  { value: "ET", label: "Ethiopia" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "GE", label: "Georgia" },
  { value: "DE", label: "Germany" },
  { value: "GH", label: "Ghana" },
  { value: "GR", label: "Greece" },
  { value: "HK", label: "Hong Kong" },
  { value: "HU", label: "Hungary" },
  { value: "IN", label: "India" },
  { value: "ID", label: "Indonesia" },
  { value: "IR", label: "Iran" },
  { value: "IQ", label: "Iraq" },
  { value: "IE", label: "Ireland" },
  { value: "IL", label: "Israel" },
  { value: "IT", label: "Italy" },
  { value: "JP", label: "Japan" },
  { value: "JO", label: "Jordan" },
  { value: "KZ", label: "Kazakhstan" },
  { value: "KE", label: "Kenya" },
  { value: "KW", label: "Kuwait" },
  { value: "KG", label: "Kyrgyzstan" },
  { value: "LV", label: "Latvia" },
  { value: "LB", label: "Lebanon" },
  { value: "LT", label: "Lithuania" },
  { value: "LU", label: "Luxembourg" },
  { value: "MY", label: "Malaysia" },
  { value: "MX", label: "Mexico" },
  { value: "MD", label: "Moldova" },
  { value: "MA", label: "Morocco" },
  { value: "NL", label: "Netherlands" },
  { value: "NZ", label: "New Zealand" },
  { value: "NG", label: "Nigeria" },
  { value: "NO", label: "Norway" },
  { value: "PK", label: "Pakistan" },
  { value: "PS", label: "Palestine" },
  { value: "PE", label: "Peru" },
  { value: "PH", label: "Philippines" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "QA", label: "Qatar" },
  { value: "RO", label: "Romania" },
  { value: "RU", label: "Russia" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "RS", label: "Serbia" },
  { value: "SG", label: "Singapore" },
  { value: "SK", label: "Slovakia" },
  { value: "SI", label: "Slovenia" },
  { value: "ZA", label: "South Africa" },
  { value: "KR", label: "South Korea" },
  { value: "ES", label: "Spain" },
  { value: "LK", label: "Sri Lanka" },
  { value: "SE", label: "Sweden" },
  { value: "CH", label: "Switzerland" },
  { value: "TW", label: "Taiwan" },
  { value: "TJ", label: "Tajikistan" },
  { value: "TH", label: "Thailand" },
  { value: "TN", label: "Tunisia" },
  { value: "TR", label: "Turkey" },
  { value: "TM", label: "Turkmenistan" },
  { value: "UA", label: "Ukraine" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "UY", label: "Uruguay" },
  { value: "UZ", label: "Uzbekistan" },
  { value: "VE", label: "Venezuela" },
  { value: "VN", label: "Vietnam" },
  { value: "YE", label: "Yemen" },
];

// ── Timezones (IANA) ──────────────────────────────────────────────────────────

/** Returns the current UTC offset string for a timezone, e.g. "UTC+7" or "UTC-5". */
export function getUTCOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC";
  } catch {
    return "UTC";
  }
}

/** Human-readable label: "Asia/Ho Chi Minh — UTC+7" */
export function tzLabel(tz: string): string {
  const city = tz.replace(/_/g, " ");
  return `${city} — ${getUTCOffset(tz)}`;
}

// Major IANA timezone identifiers (covers all populated UTC offsets)
const TZ_NAMES: string[] = [
  // UTC-12 to UTC-10
  "Etc/GMT+12", "Pacific/Pago_Pago", "Pacific/Honolulu",
  // UTC-9 to UTC-7
  "America/Anchorage", "America/Los_Angeles", "America/Denver", "America/Phoenix",
  // UTC-6
  "America/Chicago", "America/Mexico_City", "America/Guatemala", "America/Tegucigalpa",
  "America/Managua", "America/Costa_Rica", "America/El_Salvador",
  // UTC-5
  "America/New_York", "America/Toronto", "America/Bogota", "America/Lima",
  "America/Panama", "America/Havana", "America/Port-au-Prince",
  // UTC-4
  "America/Halifax", "America/Caracas", "America/La_Paz", "America/Santiago",
  "America/Manaus", "America/Barbados",
  // UTC-3
  "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "America/Montevideo",
  "America/Fortaleza", "America/Cayenne", "Atlantic/Stanley",
  // UTC-2 to UTC-1
  "America/Noronha", "Atlantic/Azores", "Atlantic/Cape_Verde",
  // UTC+0
  "UTC", "Europe/London", "Europe/Dublin", "Europe/Lisbon",
  "Africa/Abidjan", "Africa/Accra", "Africa/Dakar",
  // UTC+1
  "Europe/Paris", "Europe/Berlin", "Europe/Rome", "Europe/Madrid",
  "Europe/Amsterdam", "Europe/Brussels", "Europe/Vienna", "Europe/Warsaw",
  "Europe/Prague", "Europe/Budapest", "Europe/Stockholm", "Europe/Oslo",
  "Europe/Copenhagen", "Europe/Zurich", "Africa/Lagos", "Africa/Algiers",
  "Africa/Tunis", "Africa/Casablanca",
  // UTC+2
  "Europe/Athens", "Europe/Helsinki", "Europe/Bucharest", "Europe/Kiev",
  "Europe/Sofia", "Europe/Tallinn", "Europe/Riga", "Europe/Vilnius",
  "Africa/Cairo", "Africa/Johannesburg", "Africa/Harare", "Africa/Nairobi",
  "Asia/Jerusalem", "Asia/Amman", "Asia/Beirut", "Asia/Damascus",
  // UTC+3
  "Europe/Moscow", "Europe/Istanbul", "Asia/Riyadh", "Asia/Kuwait",
  "Asia/Baghdad", "Asia/Qatar", "Africa/Addis_Ababa",
  // UTC+3:30
  "Asia/Tehran",
  // UTC+4
  "Asia/Dubai", "Asia/Baku", "Asia/Tbilisi", "Asia/Yerevan",
  "Indian/Mauritius", "Indian/Reunion",
  // UTC+4:30
  "Asia/Kabul",
  // UTC+5
  "Asia/Karachi", "Asia/Tashkent", "Asia/Yekaterinburg", "Asia/Ashgabat",
  // UTC+5:30
  "Asia/Kolkata", "Asia/Colombo",
  // UTC+5:45
  "Asia/Kathmandu",
  // UTC+6
  "Asia/Dhaka", "Asia/Almaty", "Asia/Bishkek",
  // UTC+6:30
  "Asia/Yangon",
  // UTC+7
  "Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Jakarta", "Asia/Phnom_Penh",
  "Asia/Vientiane", "Asia/Novosibirsk",
  // UTC+8
  "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Taipei", "Asia/Singapore",
  "Asia/Kuala_Lumpur", "Asia/Manila", "Asia/Irkutsk", "Australia/Perth",
  // UTC+9
  "Asia/Tokyo", "Asia/Seoul", "Asia/Yakutsk",
  // UTC+9:30
  "Australia/Darwin", "Australia/Adelaide",
  // UTC+10
  "Australia/Sydney", "Australia/Brisbane", "Australia/Hobart",
  "Pacific/Port_Moresby", "Asia/Vladivostok",
  // UTC+11 to UTC+12
  "Pacific/Noumea", "Pacific/Auckland", "Pacific/Fiji",
  "Pacific/Tongatapu", "Pacific/Apia",
];

export const TIMEZONES: GeoOption[] = TZ_NAMES.map((tz) => ({
  value: tz,
  label: tzLabel(tz),
}));
