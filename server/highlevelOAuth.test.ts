import assert from 'node:assert/strict';
import test from 'node:test';

import {
  completeHighlevelInstall,
  createHighlevelOAuthStore,
  exchangeCodeForTokens,
  fetchLocation,
  refreshAccessToken,
} from './highlevelOAuth';
import type { AccountProvisioningStore } from './accountProvisioning';
import type { ProvisionFetchLike } from './vapiProvision';

const env = { LC_CLIENT_ID: 'client-id', LC_CLIENT_SECRET: 'client-secret' };

function fakeFetch(responses: Record<string, { ok: boolean; status?: number; json: unknown }>): ProvisionFetchLike {
  return async (url) => {
    const key = Object.keys(responses).find((candidate) => url.startsWith(candidate));
    const response = key ? responses[key] : { ok: false, status: 404, json: {} };
    return {
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 400),
      json: async () => response.json,
    };
  };
}

const realTokenShape = {
  access_token: 'access-token-value',
  token_type: 'Bearer',
  expires_in: 86399,
  refresh_token: 'refresh-token-value',
  scope: 'contacts.write locations.readonly',
  refreshTokenId: 'refresh-id-1',
  userType: 'Location',
  companyId: 'company-1',
  locationId: 'location-1',
  isBulkInstallation: false,
  userId: 'user-1',
};

test('exchangeCodeForTokens parses the real (camelCase-mixed) LeadConnector response shape', async () => {
  const fetchImpl = fakeFetch({
    'https://services.leadconnectorhq.com/oauth/token': { ok: true, json: realTokenShape },
  });

  const tokens = await exchangeCodeForTokens({
    fetchImpl,
    env,
    code: 'auth-code',
    redirectUri: 'https://click2call.ai/api/lc/oauth',
  });

  assert.equal(tokens?.accessToken, 'access-token-value');
  assert.equal(tokens?.refreshToken, 'refresh-token-value');
  assert.equal(tokens?.locationId, 'location-1');
  assert.equal(tokens?.companyId, 'company-1');
  assert.equal(tokens?.scope, 'contacts.write locations.readonly');
  // expiresAt should be ~86399s from now
  const expiresAt = new Date(tokens!.expiresAt).getTime();
  const expected = Date.now() + 86399 * 1000;
  assert.ok(Math.abs(expiresAt - expected) < 5000);
});

test('exchangeCodeForTokens returns null without configured client credentials', async () => {
  const fetchImpl = fakeFetch({});
  const tokens = await exchangeCodeForTokens({
    fetchImpl,
    env: {},
    code: 'auth-code',
    redirectUri: 'https://click2call.ai/api/lc/oauth',
  });
  assert.equal(tokens, null);
});

test('exchangeCodeForTokens returns null on an expired/invalid code', async () => {
  const fetchImpl = fakeFetch({
    'https://services.leadconnectorhq.com/oauth/token': {
      ok: false,
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Invalid grant: authorization code has expired' },
    },
  });
  const tokens = await exchangeCodeForTokens({
    fetchImpl,
    env,
    code: 'expired-code',
    redirectUri: 'https://click2call.ai/api/lc/oauth',
  });
  assert.equal(tokens, null);
});

test('refreshAccessToken parses a refreshed token response', async () => {
  const fetchImpl = fakeFetch({
    'https://services.leadconnectorhq.com/oauth/token': { ok: true, json: realTokenShape },
  });
  const tokens = await refreshAccessToken({ fetchImpl, env, refreshToken: 'old-refresh-token' });
  assert.equal(tokens?.accessToken, 'access-token-value');
});

test('fetchLocation resolves email/businessName/website from the real Location response shape', async () => {
  const fetchImpl = fakeFetch({
    'https://services.leadconnectorhq.com/locations/location-1': {
      ok: true,
      json: {
        location: {
          id: 'location-1',
          name: 'Funnel Fix It',
          website: 'funnelfixit.com',
          email: 'help@funnelfixit.com',
          business: { email: 'help@funnelfixit.com' },
        },
      },
    },
  });

  const location = await fetchLocation({ fetchImpl, accessToken: 'access-token-value', locationId: 'location-1' });
  assert.deepEqual(location, {
    email: 'help@funnelfixit.com',
    businessName: 'Funnel Fix It',
    website: 'funnelfixit.com',
  });
});

test('fetchLocation returns null when the API call fails (e.g. missing Version header)', async () => {
  const fetchImpl = fakeFetch({
    'https://services.leadconnectorhq.com/locations/location-1': {
      ok: false,
      status: 401,
      json: { statusCode: 401, message: 'version header was not found.' },
    },
  });
  const location = await fetchLocation({ fetchImpl, accessToken: 'access-token-value', locationId: 'location-1' });
  assert.equal(location, null);
});

function fakeSupabaseRpcClient(shouldError = false) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    async rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      return shouldError ? { data: null, error: { message: 'boom' } } : { data: {}, error: null };
    },
  };
}

test('createHighlevelOAuthStore.upsertConnection calls the upsert RPC with the right args', async () => {
  const client = fakeSupabaseRpcClient();
  const store = createHighlevelOAuthStore(client);

  const ok = await store.upsertConnection({
    userId: 'user-1',
    locationId: 'location-1',
    companyId: 'company-1',
    accessToken: 'access-token-value',
    refreshToken: 'refresh-token-value',
    expiresAt: '2026-08-10T00:00:00.000Z',
    scope: 'contacts.write',
  });

  assert.equal(ok, true);
  assert.equal(client.calls[0].fn, 'upsert_highlevel_connection');
  assert.equal(client.calls[0].args.p_user_id, 'user-1');
  assert.equal(client.calls[0].args.p_location_id, 'location-1');
});

test('createHighlevelOAuthStore.upsertConnection returns false on RPC error', async () => {
  const client = fakeSupabaseRpcClient(true);
  const store = createHighlevelOAuthStore(client);
  const ok = await store.upsertConnection({
    userId: 'user-1',
    locationId: 'location-1',
    companyId: null,
    accessToken: 'a',
    refreshToken: 'b',
    expiresAt: '2026-08-10T00:00:00.000Z',
    scope: '',
  });
  assert.equal(ok, false);
});

function fakeAccountStore(existingUserId: string | null): AccountProvisioningStore {
  return {
    async findUserIdByEmail() {
      return existingUserId;
    },
    async createUser(email) {
      return existingUserId ?? `new-user-for-${email}`;
    },
  };
}

test('completeHighlevelInstall wires exchange -> location -> account -> connection end to end', async () => {
  const fetchImpl = fakeFetch({
    'https://services.leadconnectorhq.com/oauth/token': { ok: true, json: realTokenShape },
    'https://services.leadconnectorhq.com/locations/location-1': {
      ok: true,
      json: {
        location: { name: 'Funnel Fix It', website: 'funnelfixit.com', email: 'help@funnelfixit.com' },
      },
    },
  });
  const connectionStore = createHighlevelOAuthStore(fakeSupabaseRpcClient());
  const accountStore = fakeAccountStore(null);

  const result = await completeHighlevelInstall({
    fetchImpl,
    env,
    code: 'auth-code',
    redirectUri: 'https://click2call.ai/api/lc/oauth',
    accountStore,
    connectionStore,
  });

  assert.deepEqual(result, {
    userId: 'new-user-for-help@funnelfixit.com',
    isNewUser: true,
    email: 'help@funnelfixit.com',
    businessName: 'Funnel Fix It',
    website: 'funnelfixit.com',
    locationId: 'location-1',
  });
});

test('completeHighlevelInstall surfaces a token-exchange failure without touching account provisioning', async () => {
  const fetchImpl = fakeFetch({
    'https://services.leadconnectorhq.com/oauth/token': {
      ok: false,
      status: 400,
      json: { error: 'invalid_grant' },
    },
  });
  let accountLookups = 0;
  const accountStore: AccountProvisioningStore = {
    async findUserIdByEmail() {
      accountLookups += 1;
      return null;
    },
    async createUser() {
      return null;
    },
  };
  const connectionStore = createHighlevelOAuthStore(fakeSupabaseRpcClient());

  const result = await completeHighlevelInstall({
    fetchImpl,
    env,
    code: 'expired-code',
    redirectUri: 'https://click2call.ai/api/lc/oauth',
    accountStore,
    connectionStore,
  });

  assert.deepEqual(result, { error: 'Token exchange failed' });
  assert.equal(accountLookups, 0);
});
