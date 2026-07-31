import { createHmac, timingSafeEqual } from 'crypto';

interface WidgetCallTokenPayload {
  exp: number;
  origin: string;
  widgetId: string;
  version: 1;
}

const DEFAULT_TTL_SECONDS = 5 * 60;

function sign(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export function createWidgetCallToken(
  widgetId: string,
  origin: string,
  secret: string,
  nowMs = Date.now(),
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  if (!widgetId || !origin || !secret) throw new Error('Widget call token configuration is incomplete');

  const payload: WidgetCallTokenPayload = {
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
    origin,
    widgetId,
    version: 1,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyWidgetCallToken(
  token: unknown,
  secret: string,
  nowMs = Date.now(),
): WidgetCallTokenPayload | null {
  if (typeof token !== 'string' || !secret) return null;
  const [encodedPayload, suppliedSignature, extraPart] = token.split('.');
  if (!encodedPayload || !suppliedSignature || extraPart) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<WidgetCallTokenPayload>;
    if (
      payload.version !== 1
      || typeof payload.widgetId !== 'string'
      || !payload.widgetId
      || typeof payload.origin !== 'string'
      || !payload.origin
      || typeof payload.exp !== 'number'
      || payload.exp <= Math.floor(nowMs / 1000)
    ) {
      return null;
    }
    return payload as WidgetCallTokenPayload;
  } catch {
    return null;
  }
}
