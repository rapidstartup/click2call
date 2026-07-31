export function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function normalizeAllowedOrigins(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeOrigin).filter((origin): origin is string => Boolean(origin)))];
}

export function getAllowedOrigins(settings: unknown): string[] {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return [];
  return normalizeAllowedOrigins((settings as Record<string, unknown>).allowed_origins);
}

export function isOriginAllowed(origin: unknown, settings: unknown): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(normalizedOrigin && getAllowedOrigins(settings).includes(normalizedOrigin));
}
