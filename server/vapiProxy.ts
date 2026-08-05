import { randomUUID } from 'node:crypto';

export interface VapiProxyResponse {
  body: string;
  contentType?: string;
  statusCode: number;
}

export interface RpcError {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}

export interface MeteringRpcClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: RpcError | null }>;
}

interface RecordValue {
  [key: string]: unknown;
}

export type VapiWebCallResult =
  | { kind: 'started'; response: VapiProxyResponse }
  | { kind: 'cap-reached' }
  | { kind: 'metering-error' }
  | { kind: 'provider-error' };

export interface StartVapiWebCallInput {
  apiKey: string;
  assistantId: string;
  client: MeteringRpcClient;
  maxDurationSeconds: number;
  requestVapiWebCall: (apiKey: string, body: Record<string, unknown>) => Promise<VapiProxyResponse>;
  userId: string;
  vapiWebhookRecipient: string;
  widgetId: string;
  roomDeleteOnUserLeaveEnabled?: boolean;
  reservationId?: string;
}

const DEFAULT_MAX_DURATION_SECONDS = 1800;
const MIN_MAX_DURATION_SECONDS = 10;
const MAX_MAX_DURATION_SECONDS = 43200;

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RecordValue;
}

function hasData(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(asRecord(value));
}

function rpcErrorText(error: RpcError | null): string {
  return error?.message || error?.details || error?.code || 'Supabase RPC failed';
}

function isCapReached(error: RpcError | null, data: unknown): boolean {
  const row = Array.isArray(data) ? data[0] : data;
  const record = asRecord(row);
  const errorCode = typeof record?.error_code === 'string' ? record.error_code : '';
  const errorText = rpcErrorText(error).toLowerCase();
  return errorCode === 'cap_reached'
    || error?.code === 'CAP_REACHED'
    || errorText.includes('cap_reached')
    || errorText.includes('cap reached');
}

function numericSetting(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function getMaxDurationSeconds(settings: unknown): number {
  const setting = asRecord(settings)?.max_duration_seconds;
  const requested = numericSetting(setting);
  if (requested === null) return DEFAULT_MAX_DURATION_SECONDS;
  return Math.max(
    MIN_MAX_DURATION_SECONDS,
    Math.min(MAX_MAX_DURATION_SECONDS, Math.floor(requested)),
  );
}

export function getVapiWebhookRecipient(env: Record<string, string | undefined> = process.env): string {
  const configured = env.VAPI_WEBHOOK_URL?.trim();
  if (configured) return configured;

  const baseUrl = env.PUBLIC_APP_URL?.trim() || env.URL?.trim() || 'https://click2call.ai';
  return new URL('/api/vapi-webhook', baseUrl).toString();
}

export function extractVapiCallId(payload: unknown): string | null {
  const record = asRecord(payload);
  const call = asRecord(record?.call);
  const nestedCall = asRecord(record?.data)?.call;
  const nestedCallRecord = asRecord(nestedCall);
  const candidates = [
    record?.id,
    call?.id,
    nestedCallRecord?.id,
    record?.vapi_call_id,
    record?.callId,
  ];
  const id = candidates.find((candidate): candidate is string => (
    typeof candidate === 'string' && candidate.trim().length > 0
  ));
  return id?.trim() || null;
}

export async function reserveCall(
  client: MeteringRpcClient,
  input: {
    maxDurationSeconds: number;
    planId?: string | null;
    reservationId: string;
    userId: string;
    widgetId: string;
  },
): Promise<{ allowed: true } | { allowed: false; capReached: boolean; error?: string }> {
  try {
    const { data, error } = await client.rpc('reserve_call', {
      p_user_id: input.userId,
      p_widget_id: input.widgetId,
      p_reservation_id: input.reservationId,
      p_plan_id: input.planId ?? null,
      p_max_duration_seconds: input.maxDurationSeconds,
    });

    if (isCapReached(error, data)) {
      return { allowed: false, capReached: true };
    }
    if (error) {
      return { allowed: false, capReached: false, error: rpcErrorText(error) };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const record = asRecord(row);
    if (record?.allowed === true) return { allowed: true };

    return {
      allowed: false,
      capReached: false,
      error: typeof record?.error_code === 'string' ? record.error_code : 'Call reservation failed',
    };
  } catch (error) {
    return {
      allowed: false,
      capReached: false,
      error: error instanceof Error ? error.message : 'Call reservation failed',
    };
  }
}

async function finalizeCallReservation(
  client: MeteringRpcClient,
  reservationId: string,
  vapiCallId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('finalize_call_reservation', {
    p_reservation_id: reservationId,
    p_vapi_call_id: vapiCallId,
  });
  return !error && hasData(data);
}

async function releaseCallReservation(
  client: MeteringRpcClient,
  reservationId: string,
): Promise<void> {
  try {
    await client.rpc('release_call_reservation', {
      p_reservation_id: reservationId,
      p_status: 'failed',
    });
  } catch {
    // The provider failure is already handled. A later retention/reconciliation
    // pass can safely identify this failed reservation and it is non-billable.
  }
}

export async function startVapiWebCall(input: StartVapiWebCallInput): Promise<VapiWebCallResult> {
  const reservationId = input.reservationId || randomUUID();
  const reservation = await reserveCall(input.client, {
    maxDurationSeconds: input.maxDurationSeconds,
    reservationId,
    userId: input.userId,
    widgetId: input.widgetId,
  });

  if (reservation.allowed === false) {
    return reservation.capReached ? { kind: 'cap-reached' } : { kind: 'metering-error' };
  }

  const requestBody: Record<string, unknown> = {
    assistantId: input.assistantId,
    webhookRecipient: input.vapiWebhookRecipient,
    metadata: {
      user_id: input.userId,
      widget_id: input.widgetId,
    },
    maxDurationSeconds: input.maxDurationSeconds,
  };
  if (typeof input.roomDeleteOnUserLeaveEnabled === 'boolean') {
    requestBody.roomDeleteOnUserLeaveEnabled = input.roomDeleteOnUserLeaveEnabled;
  }

  let vapiResponse: VapiProxyResponse;
  try {
    vapiResponse = await input.requestVapiWebCall(input.apiKey, requestBody);
  } catch {
    await releaseCallReservation(input.client, reservationId);
    return { kind: 'provider-error' };
  }

  if (vapiResponse.statusCode < 200 || vapiResponse.statusCode >= 300) {
    await releaseCallReservation(input.client, reservationId);
    return { kind: 'provider-error' };
  }

  let responsePayload: unknown;
  try {
    responsePayload = JSON.parse(vapiResponse.body);
  } catch {
    await releaseCallReservation(input.client, reservationId);
    return { kind: 'provider-error' };
  }

  const vapiCallId = extractVapiCallId(responsePayload);
  if (!vapiCallId) {
    await releaseCallReservation(input.client, reservationId);
    return { kind: 'provider-error' };
  }

  try {
    if (!await finalizeCallReservation(input.client, reservationId, vapiCallId)) {
      await releaseCallReservation(input.client, reservationId);
      return { kind: 'provider-error' };
    }
  } catch {
    await releaseCallReservation(input.client, reservationId);
    return { kind: 'provider-error' };
  }

  return { kind: 'started', response: vapiResponse };
}
