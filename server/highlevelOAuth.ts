import { provisionUserByEmail } from './accountProvisioning';
import type { AccountProvisioningStore } from './accountProvisioning';
import type { ProvisionFetchLike } from './vapiProvision';

const LC_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const LC_LOCATIONS_URL = 'https://services.leadconnectorhq.com/locations/';
// Every LeadConnector REST call beyond the token endpoint 401s with
// "version header was not found" without this — confirmed against a real
// install on 2026-08-09, not documented anywhere we could find beforehand.
const LC_API_VERSION = '2021-07-28';

interface RecordValue {
  [key: string]: unknown;
}

interface SupabaseErrorLike {
  message?: string;
}

interface SupabaseClientLike {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
}

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RecordValue;
}

function firstString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function requestJson(
  fetchImpl: ProvisionFetchLike,
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
): Promise<RecordValue | null> {
  const response = await fetchImpl(url, init);
  if (!response.ok) return null;
  return asRecord(await response.json());
}

export interface HighlevelOAuthEnv {
  LC_CLIENT_ID?: string;
  LC_CLIENT_SECRET?: string;
}

export interface HighlevelTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO timestamp. */
  expiresAt: string;
  scope: string;
  locationId: string;
  companyId: string | null;
}

/**
 * Authorization codes expire very fast (well under a minute, observed
 * against real installs) — callers must exchange immediately on receipt,
 * never queue or defer this.
 */
export async function exchangeCodeForTokens(input: {
  fetchImpl: ProvisionFetchLike;
  env: HighlevelOAuthEnv;
  code: string;
  redirectUri: string;
}): Promise<HighlevelTokens | null> {
  const clientId = input.env.LC_CLIENT_ID?.trim();
  const clientSecret = input.env.LC_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
  }).toString();

  const payload = await requestJson(input.fetchImpl, LC_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!payload) return null;

  const accessToken = firstString(payload.access_token);
  const refreshToken = firstString(payload.refresh_token);
  const locationId = firstString(payload.locationId);
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : null;
  if (!accessToken || !refreshToken || !locationId || expiresIn === null) return null;

  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    scope: firstString(payload.scope) || '',
    locationId,
    companyId: firstString(payload.companyId),
  };
}

export async function refreshAccessToken(input: {
  fetchImpl: ProvisionFetchLike;
  env: HighlevelOAuthEnv;
  refreshToken: string;
}): Promise<HighlevelTokens | null> {
  const clientId = input.env.LC_CLIENT_ID?.trim();
  const clientSecret = input.env.LC_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
  }).toString();

  const payload = await requestJson(input.fetchImpl, LC_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!payload) return null;

  const accessToken = firstString(payload.access_token);
  const refreshToken = firstString(payload.refresh_token);
  const locationId = firstString(payload.locationId);
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : null;
  if (!accessToken || !refreshToken || !locationId || expiresIn === null) return null;

  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    scope: firstString(payload.scope) || '',
    locationId,
    companyId: firstString(payload.companyId),
  };
}

export interface HighlevelLocation {
  email: string | null;
  businessName: string | null;
  website: string | null;
}

/**
 * One call resolves everything install-provisioning needs (email, business
 * name, website) — there is no separate identity/"who installed this" call.
 * A GET /users/{userId} lookup using the token response's userId was tried
 * against a real install and returned 400 "user id is invalid"; don't build
 * against that endpoint.
 */
export async function fetchLocation(input: {
  fetchImpl: ProvisionFetchLike;
  accessToken: string;
  locationId: string;
}): Promise<HighlevelLocation | null> {
  const payload = await requestJson(input.fetchImpl, LC_LOCATIONS_URL + input.locationId, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + input.accessToken,
      Version: LC_API_VERSION,
      Accept: 'application/json',
    },
  });
  const location = asRecord(payload?.location);
  if (!location) return null;

  return {
    email: firstString(location.email),
    businessName: firstString(location.name),
    website: firstString(location.website),
  };
}

export interface HighlevelOAuthStore {
  upsertConnection(input: {
    userId: string;
    locationId: string;
    companyId: string | null;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    scope: string;
  }): Promise<boolean>;
}

export function createHighlevelOAuthStore(client: unknown): HighlevelOAuthStore {
  const supabase = client as SupabaseClientLike;

  return {
    async upsertConnection(input) {
      const { error } = await supabase.rpc('upsert_highlevel_connection', {
        p_user_id: input.userId,
        p_location_id: input.locationId,
        p_company_id: input.companyId,
        p_access_token: input.accessToken,
        p_refresh_token: input.refreshToken,
        p_expires_at: input.expiresAt,
        p_scope: input.scope,
      });
      return !error;
    },
  };
}

export interface CompleteHighlevelInstallInput {
  fetchImpl: ProvisionFetchLike;
  env: HighlevelOAuthEnv;
  code: string;
  redirectUri: string;
  accountStore: AccountProvisioningStore;
  connectionStore: HighlevelOAuthStore;
}

export interface CompleteHighlevelInstallResult {
  userId: string;
  isNewUser: boolean;
  email: string;
  businessName: string | null;
  website: string | null;
  locationId: string;
}

/**
 * Orchestrates a full install: exchange the code, resolve the location's
 * identity, resolve-or-create the click2call account, persist the
 * connection. Deliberately does not create a widget — that needs a pooled
 * VAPI credential this module doesn't have yet (see the plan's Track A
 * step 5); until that lands, a HighLevel-originated account simply lands
 * on the normal onboarding wizard instead of a pre-built widget.
 */
export async function completeHighlevelInstall(
  input: CompleteHighlevelInstallInput,
): Promise<CompleteHighlevelInstallResult | { error: string }> {
  const tokens = await exchangeCodeForTokens({
    fetchImpl: input.fetchImpl,
    env: input.env,
    code: input.code,
    redirectUri: input.redirectUri,
  });
  if (!tokens) return { error: 'Token exchange failed' };

  const location = await fetchLocation({
    fetchImpl: input.fetchImpl,
    accessToken: tokens.accessToken,
    locationId: tokens.locationId,
  });
  if (!location?.email) return { error: 'Could not resolve an email for this HighLevel location' };

  const provisioned = await provisionUserByEmail(input.accountStore, location.email);
  if (!provisioned) return { error: 'Account provisioning failed' };

  const connected = await input.connectionStore.upsertConnection({
    userId: provisioned.userId,
    locationId: tokens.locationId,
    companyId: tokens.companyId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    scope: tokens.scope,
  });
  if (!connected) return { error: 'Failed to persist HighLevel connection' };

  return {
    userId: provisioned.userId,
    isNewUser: provisioned.isNewUser,
    email: location.email,
    businessName: location.businessName,
    website: location.website,
    locationId: tokens.locationId,
  };
}
