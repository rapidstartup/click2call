import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';

import {
  processVapiWebhook,
  verifyVapiSignature,
} from './vapiWebhook';
import type { VapiCallUpsert, VapiWebhookStore } from './vapiWebhook';

const userId = '11111111-1111-4111-8111-111111111111';
const widgetId = '22222222-2222-4222-8222-222222222222';
const widgetSecret = 'widget-vapi-secret';

function signedEvent(
  event: Record<string, unknown>,
  secret: string = widgetSecret,
): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return { rawBody, signature: `t=${timestamp},v1=${digest}` };
}

function baseEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    message: {
      type: 'call.started',
      call: {
        id: 'vapi-call-1',
        metadata: { user_id: userId, widget_id: widgetId },
      },
    },
    ...overrides,
  };
}

function createStore(initial: Map<string, VapiCallUpsert> = new Map()): VapiWebhookStore & { rows: Map<string, VapiCallUpsert>; upserted: VapiCallUpsert[] } {
  const upserted: VapiCallUpsert[] = [];
  return {
    rows: initial,
    upserted,
    async getWidget() {
      return { apiKey: widgetSecret, id: widgetId, userId };
    },
    async upsertCall(call) {
      const existing = initial.get(call.vapi_call_id);
      const terminal = existing && ['completed', 'failed', 'aborted', 'capped'].includes(existing.status);
      const regressing = call.status === 'started' || call.status === 'connected';
      if (existing && terminal && regressing) return existing;
      const merged = existing ? { ...existing, ...call } : call;
      initial.set(call.vapi_call_id, merged);
      upserted.push(call);
      return merged;
    },
  };
}

test('verifyVapiSignature accepts the correct signature and rejects wrong secrets and tampered bodies', () => {
  const event = baseEvent();
  const { rawBody, signature } = signedEvent(event);
  assert.equal(verifyVapiSignature(rawBody, signature, widgetSecret), true);
  assert.equal(verifyVapiSignature(rawBody, signature, 'wrong-secret'), false);
  assert.equal(verifyVapiSignature(rawBody, undefined, widgetSecret), false);
  assert.equal(verifyVapiSignature(rawBody + 'tampered', signature, widgetSecret), false);
  assert.equal(verifyVapiSignature('', signature, widgetSecret), false);
});

test('processVapiWebhook stores a started event with owner metadata', async () => {
  const store = createStore();
  const { rawBody, signature } = signedEvent(baseEvent());

  const result = await processVapiWebhook({ rawBody, signature, store });

  assert.equal(result.kind, 'stored');
  assert.equal(store.upserted.length, 1);
  assert.equal(store.upserted[0].vapi_call_id, 'vapi-call-1');
  assert.equal(store.upserted[0].status, 'started');
  assert.equal(store.upserted[0].user_id, userId);
  assert.equal(store.upserted[0].widget_id, widgetId);
});

test('an ended event maps duration, cost, recording, and outcome', async () => {
  const store = createStore();
  const event = baseEvent({
    message: {
      type: 'call.ended',
      call: {
        id: 'vapi-call-1',
        metadata: { user_id: userId, widget_id: widgetId },
        durationSeconds: 42,
        cost: 0.05,
        artifact: { recordingUrl: 'https://media.vapi.ai/recording.mp3' },
      },
      analysis: { structuredData: { outcome: 'qualified' } },
    },
  });
  const { rawBody, signature } = signedEvent(event);

  const result = await processVapiWebhook({ rawBody, signature, store });

  assert.equal(result.kind, 'stored');
  const stored = store.rows.get('vapi-call-1');
  assert.equal(stored?.status, 'completed');
  assert.equal(stored?.duration_s, 42);
  assert.equal(stored?.cost_usd, 0.05);
  assert.equal(stored?.recording_source_url, 'https://media.vapi.ai/recording.mp3');
  assert.equal(stored?.recording_status, 'pending');
  assert.equal(stored?.outcome, 'qualified');
});

test('CRITICAL: duplicate delivery for the same vapi_call_id is a no-op, not a regression', async () => {
  const store = createStore();
  const completed = baseEvent({
    message: {
      type: 'call.ended',
      call: {
        id: 'vapi-call-1',
        metadata: { user_id: userId, widget_id: widgetId },
        durationSeconds: 60,
        cost: 0.07,
      },
    },
  });
  const { rawBody: endedBody, signature: endedSig } = signedEvent(completed);
  await processVapiWebhook({ rawBody: endedBody, signature: endedSig, store });

  const staleStarted = baseEvent({
    message: {
      type: 'call.started',
      call: { id: 'vapi-call-1', metadata: { user_id: userId, widget_id: widgetId } },
    },
  });
  const { rawBody: startedBody, signature: startedSig } = signedEvent(staleStarted);
  const result = await processVapiWebhook({ rawBody: startedBody, signature: startedSig, store });

  assert.equal(result.kind, 'stored');
  const stored = store.rows.get('vapi-call-1');
  assert.equal(stored?.status, 'completed');
  assert.equal(stored?.duration_s, 60);
});

test('an invalid signature is rejected with no row written', async () => {
  const store = createStore();
  const event = baseEvent();
  const { rawBody } = signedEvent(event, 'attacker-secret');
  const signature = rawBody.startsWith('{') ? 't=1,v1=deadbeef' : 't=1,v1=deadbeef';

  const result = await processVapiWebhook({ rawBody, signature, store });

  assert.equal(result.kind, 'unauthorized');
  assert.equal(store.upserted.length, 0);
});

test('malformed payloads and events missing owner metadata are invalid', async () => {
  const store = createStore();
  assert.equal((await processVapiWebhook({ rawBody: 'not-json', signature: 't=1,v1=x', store })).kind, 'invalid');

  const noMetadata = baseEvent({
    message: { type: 'call.started', call: { id: 'vapi-call-2' } },
  });
  const { rawBody, signature } = signedEvent(noMetadata);
  assert.equal((await processVapiWebhook({ rawBody, signature, store })).kind, 'invalid');
  assert.equal(store.upserted.length, 0);
});

test('a duration-limit ended reason maps to the capped status', async () => {
  const store = createStore();
  const event = baseEvent({
    message: {
      type: 'call.ended',
      call: {
        id: 'vapi-call-1',
        metadata: { user_id: userId, widget_id: widgetId },
        endedReason: 'maximum-duration-reached',
        durationSeconds: 1800,
      },
    },
  });
  const { rawBody, signature } = signedEvent(event);

  const result = await processVapiWebhook({ rawBody, signature, store });

  assert.equal(result.kind, 'stored');
  assert.equal(store.rows.get('vapi-call-1')?.status, 'capped');
});
