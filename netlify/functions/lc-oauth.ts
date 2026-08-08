import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import { createAccountProvisioningStore } from '../../server/accountProvisioning';
import { completeHighlevelInstall, createHighlevelOAuthStore } from '../../server/highlevelOAuth';
import { appBaseUrl } from '../../server/vapiProvision';
import type { ProvisionFetchLike } from '../../server/vapiProvision';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

function redirectTo(location: string) {
  return { statusCode: 302, headers: { ...headers, Location: location } };
}

// HighLevel drives this redirect entirely from their Marketplace UI — there's
// no click2call-initiated request beforehand to carry a CSRF state token, so
// this is a server-to-server OAuth callback (trusting the code exchange
// itself, like stripe-webhook.ts trusts a signature) rather than a
// user-session-protected endpoint.
export const handler: Handler = async (event) => {
  const baseUrl = appBaseUrl(process.env);
  const errorRedirect = (reason: string) =>
    redirectTo(`${baseUrl}/signup?from=highlevel&error=${encodeURIComponent(reason)}`);

  const code = event.queryStringParameters?.code?.trim();
  if (!code) return errorRedirect('missing_code');

  const fetchImpl = globalThis.fetch as unknown as ProvisionFetchLike;
  const result = await completeHighlevelInstall({
    fetchImpl,
    env: process.env,
    code,
    redirectUri: `${baseUrl}/api/lc/oauth`,
    accountStore: createAccountProvisioningStore(supabase),
    connectionStore: createHighlevelOAuthStore(supabase),
  });

  if ('error' in result) {
    console.error('HighLevel install failed:', result.error);
    return errorRedirect('install_failed');
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: result.email,
  });
  if (error || !data.properties?.action_link) {
    console.error('HighLevel install: failed to mint a session', error?.message);
    return errorRedirect('session_failed');
  }

  return redirectTo(data.properties.action_link);
};
