const RECORDINGS_BUCKET = 'call-recordings';
const DEFAULT_RETENTION_DAYS = 7;

interface RecordValue {
  [key: string]: unknown;
}

export interface PendingRecording {
  callId: string;
  vapiCallId: string;
  userId: string;
  widgetId: string;
  recordingSourceUrl: string;
  startedAt: string;
}

export interface SupabaseErrorLike {
  message?: string;
}

export interface SupabaseQueryResult {
  data: unknown;
  error: SupabaseErrorLike | null;
}

export interface SupabaseFilterQueryLike extends PromiseLike<SupabaseQueryResult> {
  eq(column: string, value: unknown): SupabaseFilterQueryLike;
  not(column: string, operator: string, value: unknown): SupabaseFilterQueryLike;
  order(column: string, options?: { ascending?: boolean }): SupabaseFilterQueryLike;
  limit(count: number): SupabaseFilterQueryLike;
}

export interface SupabaseUpdateQueryLike extends PromiseLike<SupabaseQueryResult> {
  eq(column: string, value: unknown): SupabaseUpdateQueryLike;
}

export interface SupabaseTableLike {
  select(columns?: string): SupabaseFilterQueryLike;
  update(values: Record<string, unknown>): SupabaseUpdateQueryLike;
}

export interface SupabaseStorageBucketLike {
  upload(
    path: string,
    body: Uint8Array,
    options: { contentType?: string },
  ): Promise<{ error: SupabaseErrorLike | null }>;
  remove(paths: string[]): Promise<{ error: SupabaseErrorLike | null }>;
}

export interface SupabaseStorageLike {
  from(bucket: string): SupabaseStorageBucketLike;
}

export interface SupabaseClientLike {
  from(table: string): SupabaseTableLike;
  storage: SupabaseStorageLike;
}

export interface RecordingFetchResponse {
  ok: boolean;
  headers: {
    get(name: string): string | null;
  };
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type RecordingFetch = (
  url: string,
  init?: { signal?: unknown },
) => Promise<RecordingFetchResponse>;

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RecordValue;
}

function firstString(...values: unknown[]): string | null {
  const value = values.find((candidate): candidate is string => (
    typeof candidate === 'string' && candidate.trim().length > 0
  ));
  return value?.trim() || null;
}

function errorMessage(error: SupabaseErrorLike | null, fallback: string): string {
  return firstString(error?.message) || fallback;
}

function sanitizeSegment(value: string): string {
  const sanitized = value.trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'unknown';
}

function extensionFor(sourceUrl: string): string {
  try {
    const pathname = new URL(sourceUrl).pathname.toLowerCase();
    const extension = pathname.match(/\.(mp3|wav|m4a|webm)$/)?.[1];
    return extension ? `.${extension}` : '.mp3';
  } catch {
    return '.mp3';
  }
}

export async function listPendingRecordings(
  client: SupabaseClientLike,
  limit = 20,
): Promise<PendingRecording[]> {
  const { data, error } = await client
    .from('calls')
    .select('id, vapi_call_id, user_id, widget_id, recording_source_url, started_at')
    .eq('recording_status', 'pending')
    .not('recording_source_url', 'is', null)
    .order('started_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(errorMessage(error, 'Pending recording lookup failed'));
  if (!Array.isArray(data)) return [];

  return data.flatMap((value): PendingRecording[] => {
    const row = asRecord(value);
    if (!row) return [];
    const callId = firstString(row.id);
    const vapiCallId = firstString(row.vapi_call_id);
    const userId = firstString(row.user_id);
    const widgetId = firstString(row.widget_id);
    const recordingSourceUrl = firstString(row.recording_source_url);
    const startedAt = firstString(row.started_at);
    if (!callId || !vapiCallId || !userId || !widgetId || !recordingSourceUrl || !startedAt) return [];
    return [{ callId, vapiCallId, userId, widgetId, recordingSourceUrl, startedAt }];
  });
}

export function storagePathFor(recording: PendingRecording): string {
  return [
    sanitizeSegment(recording.userId),
    sanitizeSegment(recording.widgetId),
    `${sanitizeSegment(recording.vapiCallId)}${extensionFor(recording.recordingSourceUrl)}`,
  ].join('/');
}

async function updateCall(
  client: SupabaseClientLike,
  callId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from('calls').update(values).eq('id', callId);
  if (error) throw new Error(errorMessage(error, 'Call update failed'));
}

async function markRecordingFailed(client: SupabaseClientLike, callId: string): Promise<void> {
  try {
    await updateCall(client, callId, {
      recording_status: 'failed',
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      'Recording failure status update failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

export async function copyRecording(input: {
  supabase: SupabaseClientLike;
  recording: PendingRecording;
  fetchImpl?: RecordingFetch;
}): Promise<{ ok: true; path: string } | { ok: false }> {
  const path = storagePathFor(input.recording);
  const fetcher = input.fetchImpl || (globalThis.fetch as unknown as RecordingFetch);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    if (typeof fetcher !== 'function') throw new Error('Fetch is unavailable');
    const response = await fetcher(input.recording.recordingSourceUrl, { signal: controller.signal });
    if (!response.ok) throw new Error('Recording fetch failed');

    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = firstString(response.headers.get('content-type')) || 'audio/mpeg';
    const { error: uploadError } = await input.supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(path, bytes, { contentType });
    if (uploadError) throw new Error(errorMessage(uploadError, 'Recording upload failed'));

    await updateCall(input.supabase, input.recording.callId, {
      recording_storage_path: path,
      recording_url: null,
      recording_status: 'copied',
      updated_at: new Date().toISOString(),
    });
    return { ok: true, path };
  } catch (error) {
    console.error(
      'Recording copy failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    await markRecordingFailed(input.supabase, input.recording.callId);
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

export interface RecordingPlan {
  id: string;
  recording_retention_days?: number | null;
}

export function planRetentionDays(
  planId: string | null | undefined,
  plans: readonly RecordingPlan[],
): number {
  const plan = plans.find((candidate) => candidate.id === planId);
  const days = plan?.recording_retention_days;
  return typeof days === 'number' && Number.isFinite(days) && days >= 0
    ? Math.floor(days)
    : DEFAULT_RETENTION_DAYS;
}

async function readRows(
  client: SupabaseClientLike,
  table: string,
  columns: string,
): Promise<unknown[]> {
  const { data, error } = await client.from(table).select(columns);
  if (error) throw new Error(errorMessage(error, `${table} lookup failed`));
  return Array.isArray(data) ? data : [];
}

function recordingPlans(rows: readonly unknown[]): RecordingPlan[] {
  return rows.flatMap((value): RecordingPlan[] => {
    const row = asRecord(value);
    const id = firstString(row?.id);
    if (!id) return [];
    const days = row?.recording_retention_days;
    return [{
      id,
      recording_retention_days: typeof days === 'number' ? days : null,
    }];
  });
}

function userPlanIds(rows: readonly unknown[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const value of rows) {
    const row = asRecord(value);
    const userId = firstString(row?.user_id);
    const planId = firstString(row?.plan_id);
    if (userId && planId) result.set(userId, planId);
  }
  return result;
}

interface RetentionCall {
  callId: string;
  userId: string;
  startedAt: string;
  storagePath: string;
}

function retentionCalls(rows: readonly unknown[]): RetentionCall[] {
  return rows.flatMap((value): RetentionCall[] => {
    const row = asRecord(value);
    const callId = firstString(row?.id);
    const userId = firstString(row?.user_id);
    const startedAt = firstString(row?.started_at);
    const storagePath = firstString(row?.recording_storage_path);
    if (!callId || !userId || !startedAt || !storagePath) return [];
    return [{ callId, userId, startedAt, storagePath }];
  });
}

export async function runRecordingRetention(input: {
  supabase: SupabaseClientLike;
  now?: Date;
}): Promise<{ scanned: number; removed: number }> {
  const plans = recordingPlans(await readRows(
    input.supabase,
    'plans',
    'id, recording_retention_days',
  ));
  const planIds = userPlanIds(await readRows(input.supabase, 'user_plans', 'user_id, plan_id'));
  const { data, error } = await input.supabase
    .from('calls')
    .select('id, user_id, started_at, recording_storage_path')
    .eq('recording_status', 'copied')
    .not('recording_storage_path', 'is', null);
  if (error) throw new Error(errorMessage(error, 'Recording retention lookup failed'));

  const rows = Array.isArray(data) ? data : [];
  const calls = retentionCalls(rows);
  const current = input.now || new Date();
  const currentMs = current.getTime();
  if (!Number.isFinite(currentMs)) throw new Error('Invalid retention time');

  let removed = 0;
  for (const call of calls) {
    const startedMs = Date.parse(call.startedAt);
    if (!Number.isFinite(startedMs)) continue;
    const days = planRetentionDays(planIds.get(call.userId), plans);
    if (startedMs + days * 24 * 60 * 60 * 1000 >= currentMs) continue;

    try {
      const { error: removeError } = await input.supabase.storage
        .from(RECORDINGS_BUCKET)
        .remove([call.storagePath]);
      if (removeError) throw new Error(errorMessage(removeError, 'Recording removal failed'));

      await updateCall(input.supabase, call.callId, {
        recording_status: 'expired',
        recording_storage_path: null,
        recording_url: null,
        updated_at: current.toISOString(),
      });
      removed += 1;
    } catch (error) {
      console.error(
        'Recording retention item failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  return { scanned: rows.length, removed };
}
