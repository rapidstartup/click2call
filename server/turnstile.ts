import { request as httpsRequest } from 'node:https';

interface TurnstileVerifyResult {
  action?: string;
  cdata?: string;
  hostname?: string;
  success?: boolean;
}

interface VerifyTurnstileInput {
  expectedAction: string;
  expectedCdata: string;
  expectedHostname: string;
  remoteIp?: string;
  secret: string;
  token: string;
}

export interface TurnstileVerification {
  reason?: string;
  success: boolean;
}

interface TurnstileHttpResponse {
  json: () => Promise<unknown>;
  ok: boolean;
}

type TurnstileFetch = (
  url: string,
  init: {
    body: URLSearchParams;
    headers: Record<string, string>;
    method: 'POST';
  },
) => Promise<TurnstileHttpResponse>;

function postTurnstileForm(
  url: string,
  init: Parameters<TurnstileFetch>[1],
): Promise<TurnstileHttpResponse> {
  const payload = init.body.toString();

  return new Promise((resolve, reject) => {
    const request = httpsRequest(url, {
      method: init.method,
      headers: {
        ...init.headers,
        'Content-Length': Buffer.byteLength(payload).toString(),
      },
    }, (response) => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        responseBody += chunk;
      });
      response.on('end', () => {
        resolve({
          ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300),
          json: async () => JSON.parse(responseBody) as unknown,
        });
      });
    });

    request.setTimeout(10_000, () => request.destroy(new Error('Turnstile verification timed out')));
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

export async function verifyTurnstileToken(
  input: VerifyTurnstileInput,
  fetchImpl: TurnstileFetch = postTurnstileForm,
): Promise<TurnstileVerification> {
  if (!input.secret || !input.token) return { success: false, reason: 'missing-input' };

  const body = new URLSearchParams({
    secret: input.secret,
    response: input.token,
  });
  if (input.remoteIp) body.set('remoteip', input.remoteIp);

  try {
    const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) return { success: false, reason: 'siteverify-unavailable' };

    const result = await response.json() as TurnstileVerifyResult;
    if (result.success !== true) return { success: false, reason: 'challenge-rejected' };
    if (result.hostname?.toLowerCase() !== input.expectedHostname.toLowerCase()) {
      return { success: false, reason: 'hostname-mismatch' };
    }
    if (result.action !== input.expectedAction) return { success: false, reason: 'action-mismatch' };
    if (result.cdata !== input.expectedCdata) return { success: false, reason: 'widget-mismatch' };
    return { success: true };
  } catch {
    return { success: false, reason: 'siteverify-unavailable' };
  }
}
