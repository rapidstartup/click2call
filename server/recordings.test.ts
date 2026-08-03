import assert from 'node:assert/strict';
import test from 'node:test';

import {
  copyRecording,
  listPendingRecordings,
  runRecordingRetention,
  storagePathFor,
} from './recordings';
import type {
  PendingRecording,
  RecordingFetch,
  SupabaseClientLike,
  SupabaseFilterQueryLike,
  SupabaseUpdateQueryLike,
  SupabaseTableLike,
  SupabaseQueryResult,
  SupabaseStorageBucketLike,
  SupabaseStorageLike,
} from './recordings';

interface QueryTrace {
  table: string;
  selected?: string;
  filters: Array<{ column: string; operator: string; value: unknown }>;
  ordered?: { column: string; ascending?: boolean };
  limit?: number;
  update?: Record<string, unknown>;
}

class FakeQuery implements SupabaseFilterQueryLike, SupabaseUpdateQueryLike {
  private readonly result: SupabaseQueryResult;
  private readonly trace: QueryTrace;

  constructor(
    result: SupabaseQueryResult,
    trace: QueryTrace,
  ) {
    this.result = result;
    this.trace = trace;
  }

  select(columns?: string): SupabaseFilterQueryLike {
    this.trace.selected = columns;
    return this;
  }

  eq(column: string, value: unknown): FakeQuery {
    this.trace.filters.push({ column, operator: 'eq', value });
    return this;
  }

  not(column: string, operator: string, value: unknown): SupabaseFilterQueryLike {
    this.trace.filters.push({ column, operator, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): SupabaseFilterQueryLike {
    this.trace.ordered = { column, ...options };
    return this;
  }

  limit(count: number): SupabaseFilterQueryLike {
    this.trace.limit = count;
    return this;
  }

  update(values: Record<string, unknown>): SupabaseUpdateQueryLike {
    this.trace.update = values;
    return this;
  }

  then<TResult1 = SupabaseQueryResult, TResult2 = never>(
    onfulfilled?: ((value: SupabaseQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

interface UploadCall {
  bucket: string;
  path: string;
  body: Uint8Array;
  contentType?: string;
}

interface FakeClientResult {
  client: SupabaseClientLike;
  traces: QueryTrace[];
  uploads: UploadCall[];
  removals: Array<{ bucket: string; paths: string[] }>;
}

function createFakeClient(results: Record<string, SupabaseQueryResult[]>): FakeClientResult {
  const traces: QueryTrace[] = [];
  const uploads: UploadCall[] = [];
  const removals: Array<{ bucket: string; paths: string[] }> = [];

  const storage: SupabaseStorageLike = {
    from(bucket: string): SupabaseStorageBucketLike {
      return {
        async upload(path, body, options) {
          uploads.push({ bucket, path, body, contentType: options.contentType });
          return { error: null };
        },
        async remove(paths) {
          removals.push({ bucket, paths });
          return { error: null };
        },
      };
    },
  };

  const client: SupabaseClientLike = {
    storage,
    from(table: string): SupabaseTableLike {
      const trace: QueryTrace = { table, filters: [] };
      traces.push(trace);
      const result = results[table]?.shift() || { data: [], error: null };
      return new FakeQuery(result, trace);
    },
  };

  return { client, traces, uploads, removals };
}

function pendingRecording(sourceUrl = 'https://media.vapi.ai/recording.mp3'): PendingRecording {
  return {
    callId: 'call-1',
    vapiCallId: 'vapi-call-1',
    userId: 'user-1',
    widgetId: 'widget-1',
    recordingSourceUrl: sourceUrl,
    startedAt: '2026-08-01T00:00:00.000Z',
  };
}

function successfulFetch(contentType: string): RecordingFetch {
  return async () => ({
    ok: true,
    headers: { get: () => contentType },
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  });
}

function callUpdate(traces: readonly QueryTrace[]): Record<string, unknown> {
  const update = traces.find((trace) => trace.update)?.update;
  assert.ok(update);
  return update;
}

test('storagePathFor builds safe paths and preserves supported audio extensions', () => {
  const recording = pendingRecording();
  assert.equal(storagePathFor(recording), 'user-1/widget-1/vapi-call-1.mp3');
  assert.equal(storagePathFor({ ...recording, recordingSourceUrl: 'https://media.vapi.ai/audio.wav' }), 'user-1/widget-1/vapi-call-1.wav');
  assert.equal(storagePathFor({ ...recording, recordingSourceUrl: 'https://media.vapi.ai/audio.m4a' }), 'user-1/widget-1/vapi-call-1.m4a');
});

test('copyRecording uploads bytes and marks the call copied', async () => {
  const fake = createFakeClient({ calls: [{ data: null, error: null }] });
  const result = await copyRecording({
    supabase: fake.client,
    recording: pendingRecording('https://media.vapi.ai/audio.wav'),
    fetchImpl: successfulFetch('audio/wav'),
  });

  assert.deepEqual(result, { ok: true, path: 'user-1/widget-1/vapi-call-1.wav' });
  assert.equal(fake.uploads.length, 1);
  assert.deepEqual(fake.uploads[0], {
    bucket: 'call-recordings',
    path: 'user-1/widget-1/vapi-call-1.wav',
    body: new Uint8Array([1, 2, 3]),
    contentType: 'audio/wav',
  });
  const update = callUpdate(fake.traces);
  assert.equal(update.recording_status, 'copied');
  assert.equal(update.recording_storage_path, 'user-1/widget-1/vapi-call-1.wav');
  assert.equal(update.recording_url, null);
});

test('copyRecording marks a fetch rejection failed without uploading', async () => {
  const fake = createFakeClient({ calls: [{ data: null, error: null }] });
  const fetchImpl: RecordingFetch = async () => {
    throw new Error('network unavailable');
  };

  const result = await copyRecording({ supabase: fake.client, recording: pendingRecording(), fetchImpl });

  assert.deepEqual(result, { ok: false });
  assert.equal(fake.uploads.length, 0);
  assert.equal(callUpdate(fake.traces).recording_status, 'failed');
});

test('copyRecording marks a non-success response failed without uploading', async () => {
  const fake = createFakeClient({ calls: [{ data: null, error: null }] });
  const fetchImpl: RecordingFetch = async () => ({
    ok: false,
    headers: { get: () => null },
    arrayBuffer: async () => new ArrayBuffer(0),
  });

  const result = await copyRecording({ supabase: fake.client, recording: pendingRecording(), fetchImpl });

  assert.deepEqual(result, { ok: false });
  assert.equal(fake.uploads.length, 0);
  assert.equal(callUpdate(fake.traces).recording_status, 'failed');
});

test('listPendingRecordings skips malformed service-role rows', async () => {
  const fake = createFakeClient({
    calls: [{
      data: [
        {
          id: 'call-1',
          vapi_call_id: 'vapi-call-1',
          user_id: 'user-1',
          widget_id: 'widget-1',
          recording_source_url: 'https://media.vapi.ai/audio.mp3',
          started_at: '2026-08-01T00:00:00.000Z',
        },
        null,
        { id: 'missing-required-fields' },
        ['not-a-row'],
      ],
      error: null,
    }],
  });

  const recordings = await listPendingRecordings(fake.client);

  assert.deepEqual(recordings, [pendingRecording('https://media.vapi.ai/audio.mp3')]);
  assert.deepEqual(fake.traces[0].filters, [
    { column: 'recording_status', operator: 'eq', value: 'pending' },
    { column: 'recording_source_url', operator: 'is', value: null },
  ]);
  assert.deepEqual(fake.traces[0].ordered, { column: 'started_at', ascending: true });
  assert.equal(fake.traces[0].limit, 20);
});

test('runRecordingRetention removes expired recordings and uses seven days without a plan', async () => {
  const now = new Date('2026-08-20T00:00:00.000Z');
  const fake = createFakeClient({
    plans: [{
      data: [{ id: 'pro', recording_retention_days: 15 }],
      error: null,
    }],
    user_plans: [{
      data: [{ user_id: 'user-pro', plan_id: 'pro' }],
      error: null,
    }],
    calls: [
      {
        data: [
          {
            id: 'old-pro-call',
            user_id: 'user-pro',
            started_at: '2026-08-03T00:00:00.000Z',
            recording_storage_path: 'user-pro/widget-1/old-pro.mp3',
          },
          {
            id: 'recent-pro-call',
            user_id: 'user-pro',
            started_at: '2026-08-19T00:00:00.000Z',
            recording_storage_path: 'user-pro/widget-1/recent-pro.mp3',
          },
          {
            id: 'old-free-call',
            user_id: 'user-without-plan',
            started_at: '2026-08-11T00:00:00.000Z',
            recording_storage_path: 'user-without-plan/widget-1/old-free.m4a',
          },
        ],
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null },
    ],
  });

  const result = await runRecordingRetention({ supabase: fake.client, now });

  assert.deepEqual(result, { scanned: 3, removed: 2 });
  assert.deepEqual(fake.removals, [
    { bucket: 'call-recordings', paths: ['user-pro/widget-1/old-pro.mp3'] },
    { bucket: 'call-recordings', paths: ['user-without-plan/widget-1/old-free.m4a'] },
  ]);
  const updates = fake.traces
    .filter((trace) => trace.table === 'calls' && trace.update)
    .map((trace) => trace.update);
  assert.equal(updates.length, 2);
  for (const update of updates) {
    assert.equal(update?.recording_status, 'expired');
    assert.equal(update?.recording_storage_path, null);
    assert.equal(update?.recording_url, null);
  }
});
