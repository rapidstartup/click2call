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

export async function verifyTurnstileToken(
  input: VerifyTurnstileInput,
  fetchImpl: typeof fetch = fetch,
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
