import { createHmac, timingSafeEqual } from 'node:crypto';

export type CallStatus = 'started' | 'connected' | 'completed' | 'failed' | 'aborted' | 'capped';
export type CallOutcome = 'lead_captured' | 'booked' | 'qualified' | 'unqualified' | 'no_contact';

interface RecordValue {
  [key: string]: unknown;
}

export interface VapiWebhookWidget {
  apiKey: string;
  id: string;
  userId: string;
}

export interface VapiCallUpsert {
  cost_usd?: number;
  duration_s?: number;
  outcome?: CallOutcome;
  recording_source_url?: string;
  recording_status?: 'pending';
  started_at?: string;
  status: CallStatus;
  transcript_ref?: string;
  user_id: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_source?: string;
  vapi_call_id: string;
  widget_id: string;
}

export interface VapiWebhookStore {
  getWidget(widgetId: string): Promise<VapiWebhookWidget | null>;
  upsertCall(call: VapiCallUpsert): Promise<unknown>;
}

interface SupabaseQuery {
  eq(column: string, value: unknown): SupabaseQuery;
  maybeSingle<T = unknown>(): Promise<{ data: T | null; error: { message?: string } | null }>;
  select(columns?: string): SupabaseQuery;
}

interface SupabaseClientLike {
  from(table: string): SupabaseQuery;
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message?: string } | null }>;
}

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RecordValue;
}

function getPath(value: unknown, path: string[]): unknown {
  let current: unknown = value;
  for (const segment of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[segment];
  }
  return current;
}

function firstString(...values: unknown[]): string | null {
  const value = values.find((candidate): candidate is string => (
    typeof candidate === 'string' && candidate.trim().length > 0
  ));
  return value?.trim() || null;
}

function firstNumber(...values: unknown[]): number | null {
  const value = values.find((candidate): candidate is number => (
    typeof candidate === 'number' && Number.isFinite(candidate)
  ));
  return value ?? null;
}

function normalizeToken(value: string | null): string {
  return (value || '').trim().toLowerCase().replace(/_/g, '-');
}

function metadataFor(raw: RecordValue, message: RecordValue, call: RecordValue): RecordValue {
  const candidates = [
    asRecord(call.metadata),
    asRecord(message.metadata),
    asRecord(raw.metadata),
    asRecord(getPath(call, ['assistantOverrides', 'metadata'])),
  ];
  return candidates.find((candidate) => Boolean(candidate?.user_id || candidate?.widget_id))
    || candidates.find((candidate) => candidate !== null)
    || {};
}

function eventStatus(
  eventName: string | null,
  statusValue: string | null,
  endedReason: string | null,
): CallStatus | null {
  const event = normalizeToken(eventName);
  const status = normalizeToken(statusValue);
  const reason = normalizeToken(endedReason);
  const combined = [event, status, reason].filter(Boolean).join(' ');

  if (/(^|[- .])(cap|capped|maximum-duration|duration-limit|limit-reached)([- .]|$)/.test(combined)
    || combined.includes('max-duration')
    || combined.includes('duration-reached')) {
    return 'capped';
  }
  if (event.includes('aborted') || event.includes('abort')
    || status === 'aborted' || reason.includes('aborted')
    || reason.includes('cancelled') || reason.includes('canceled')) {
    return 'aborted';
  }
  if (event.includes('failed') || event.includes('failure') || event.includes('error')
    || status === 'failed' || status === 'failure'
    || reason.includes('error') || reason.includes('failed')) {
    return 'failed';
  }
  if (event.includes('ended') || event.includes('completed') || event === 'end-of-call-report'
    || status === 'ended' || status === 'completed') {
    return 'completed';
  }
  if (event.includes('connected') || status === 'connected'
    || status === 'in-progress' || status === 'ongoing' || status === 'active') {
    return 'connected';
  }
  if (event.includes('started') || status === 'started' || status === 'ringing') {
    return 'started';
  }
  return null;
}

function callOutcome(raw: RecordValue, message: RecordValue, call: RecordValue): CallOutcome | null {
  const candidates = [
    raw.outcome,
    message.outcome,
    call.outcome,
    getPath(raw, ['analysis', 'structuredData', 'outcome']),
    getPath(message, ['analysis', 'structuredData', 'outcome']),
    getPath(call, ['analysis', 'structuredData', 'outcome']),
    getPath(call, ['structuredData', 'outcome']),
  ];
  const outcome = firstString(...candidates)?.toLowerCase() as CallOutcome | undefined;
  return outcome && [
    'lead_captured',
    'booked',
    'qualified',
    'unqualified',
    'no_contact',
  ].includes(outcome) ? outcome : null;
}

function isoTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function durationSeconds(raw: RecordValue, message: RecordValue, call: RecordValue): number | null {
  const direct = firstNumber(
    raw.duration_s,
    raw.durationSeconds,
    message.duration_s,
    message.durationSeconds,
    call.duration_s,
    call.durationSeconds,
    call.duration,
  );
  if (direct !== null) return Math.max(0, Math.round(direct));

  const started = isoTime(firstString(
    raw.startedAt,
    message.startedAt,
    call.startedAt,
  ));
  const ended = isoTime(firstString(
    raw.endedAt,
    message.endedAt,
    call.endedAt,
  ));
  if (!started || !ended) return null;
  return Math.max(0, Math.round((Date.parse(ended) - Date.parse(started)) / 1000));
}

function costUsd(raw: RecordValue, message: RecordValue, call: RecordValue): number | null {
  const direct = firstNumber(
    raw.cost_usd,
    raw.costUsd,
    raw.cost,
    message.cost_usd,
    message.costUsd,
    message.cost,
    call.cost_usd,
    call.costUsd,
    call.cost,
  );
  return direct === null ? null : Math.max(0, direct);
}

function parseEvent(raw: RecordValue): {
  call: VapiCallUpsert | null;
  widgetId: string | null;
} {
  const message = asRecord(raw.message) || raw;
  const call = asRecord(message.call) || asRecord(raw.call) || asRecord(getPath(raw, ['data', 'call'])) || {};
  const metadata = metadataFor(raw, message, call);
  const vapiCallId = firstString(
    call.id,
    message.callId,
    raw.callId,
    raw.vapi_call_id,
    raw.id,
  );
  const widgetId = firstString(metadata.widget_id, metadata.widgetId);
  const userId = firstString(metadata.user_id, metadata.userId);
  const eventName = firstString(message.type, raw.type, message.event, raw.event, raw.event_name);
  const statusValue = firstString(message.status, raw.status, call.status);
  const endedReason = firstString(
    message.endedReason,
    message.ended_reason,
    raw.endedReason,
    raw.ended_reason,
    call.endedReason,
    call.ended_reason,
  );
  const status = eventStatus(eventName, statusValue, endedReason);

  if (!vapiCallId || !userId || !widgetId || !status) {
    return { call: null, widgetId };
  }

  const changes: VapiCallUpsert = {
    status,
    user_id: userId,
    vapi_call_id: vapiCallId,
    widget_id: widgetId,
  };
  const duration = durationSeconds(raw, message, call);
  if (duration !== null) changes.duration_s = duration;
  const cost = costUsd(raw, message, call);
  if (cost !== null) changes.cost_usd = cost;
  const outcome = callOutcome(raw, message, call);
  if (outcome) changes.outcome = outcome;

  const recordingUrl = firstString(
    raw.recording_url,
    raw.recordingUrl,
    message.recording_url,
    message.recordingUrl,
    call.recording_url,
    call.recordingUrl,
    getPath(raw, ['artifact', 'recordingUrl']),
    getPath(call, ['artifact', 'recordingUrl']),
  );
  if (recordingUrl) {
    changes.recording_source_url = recordingUrl;
    changes.recording_status = 'pending';
  }

  const transcriptRef = firstString(
    raw.transcript_ref,
    raw.transcriptRef,
    message.transcript_ref,
    message.transcriptRef,
    call.transcript_ref,
    call.transcriptRef,
    call.transcriptUrl,
    getPath(raw, ['artifact', 'transcriptUrl']),
    getPath(call, ['artifact', 'transcriptUrl']),
  );
  if (transcriptRef) changes.transcript_ref = transcriptRef;

  const startedAt = isoTime(firstString(
    raw.startedAt,
    message.startedAt,
    call.startedAt,
  ));
  if (startedAt) changes.started_at = startedAt;

  const utmSource = firstString(metadata.utm_source, metadata.utmSource);
  const utmMedium = firstString(metadata.utm_medium, metadata.utmMedium);
  const utmCampaign = firstString(metadata.utm_campaign, metadata.utmCampaign);
  if (utmSource) changes.utm_source = utmSource;
  if (utmMedium) changes.utm_medium = utmMedium;
  if (utmCampaign) changes.utm_campaign = utmCampaign;

  return { call: changes, widgetId };
}

export function verifyVapiSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  let timestamp = '';
  const suppliedSignatures: string[] = [];
  for (const part of signature.split(',')) {
    const [key, value] = part.trim().split('=');
    if (key === 't' && value) timestamp = value;
    if (key === 'v1' && value) suppliedSignatures.push(value);
  }
  if (!timestamp || suppliedSignatures.length === 0) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  return suppliedSignatures.some((suppliedSignature) => {
    const suppliedBuffer = Buffer.from(suppliedSignature, 'utf8');
    return suppliedBuffer.length === expectedBuffer.length
      && timingSafeEqual(suppliedBuffer, expectedBuffer);
  });
}

export type VapiWebhookResult =
  | { kind: 'stored'; status: CallStatus; vapiCallId: string }
  | { kind: 'ignored' }
  | { kind: 'invalid' }
  | { kind: 'unauthorized' };

export async function processVapiWebhook(input: {
  rawBody: string;
  signature: string | undefined;
  store: VapiWebhookStore;
}): Promise<VapiWebhookResult> {
  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    return { kind: 'invalid' };
  }

  const raw = asRecord(payload);
  if (!raw) return { kind: 'invalid' };

  const parsed = parseEvent(raw);
  const call = parsed.call;
  if (!call || !parsed.widgetId) return { kind: 'invalid' };

  const widget = await input.store.getWidget(parsed.widgetId);
  if (!widget || !verifyVapiSignature(input.rawBody, input.signature, widget.apiKey)) {
    return { kind: 'unauthorized' };
  }
  if (call.user_id !== widget.userId || call.widget_id !== widget.id) {
    return { kind: 'unauthorized' };
  }

  await input.store.upsertCall(call);
  return { kind: 'stored', status: call.status, vapiCallId: call.vapi_call_id };
}

export function createVapiWebhookStore(client: SupabaseClientLike): VapiWebhookStore {
  return {
    async getWidget(widgetId) {
      const { data, error } = await client
        .from('widgets')
        .select('id, user_id, settings')
        .eq('id', widgetId)
        .maybeSingle<RecordValue>();
      if (error || !data) return null;

      const settings = asRecord(data.settings);
      const apiKey = firstString(settings?.vapi_api_key);
      const userId = firstString(data.user_id);
      const id = firstString(data.id);
      if (!apiKey || !userId || !id) return null;
      return { apiKey, id, userId };
    },

    async upsertCall(call) {
      const { data, error } = await client.rpc('upsert_call_from_vapi', {
        p_call: call,
      });
      if (error) throw new Error(error.message || 'Call upsert failed');
      return data;
    },
  };
}
