import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMaxDurationSeconds,
  reserveCall,
  startVapiWebCall,
} from './vapiProxy';

const userId = '11111111-1111-4111-8111-111111111111';
const widgetId = '22222222-2222-4222-8222-222222222222';

function createRpc(
  handler: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: Record<string, string> | null }>,
) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const client = {
    calls,
    async rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      return handler(fn, args);
    },
  };
  return client;
}

function baseInput(client: ReturnType<typeof createRpc>, requestVapiWebCall: (apiKey: string, body: Record<string, unknown>) => Promise<{ body: string; statusCode: number; contentType?: string }>) {
  return {
    apiKey: 'server-vapi-key',
    assistantId: 'assistant-1',
    client,
    maxDurationSeconds: 1800,
    requestVapiWebCall,
    userId,
    vapiWebhookRecipient: 'https://click2call.ai/api/vapi-webhook',
    widgetId,
  };
}

test('atomic cap reservation: concurrent double-start allows exactly one call', async () => {
  let activeReservations = 0;
  let reservationCount = 0;
  const client = createRpc(async (fn) => {
    if (fn === 'reserve_call') {
      if (activeReservations > 0) {
        return { data: [{ allowed: false, error_code: 'cap_reached' }], error: null };
      }
      activeReservations += 1;
      reservationCount += 1;
      return { data: [{ allowed: true, error_code: null }], error: null };
    }
    if (fn === 'finalize_call_reservation') {
      activeReservations -= 1;
      return { data: { id: 'call-1' }, error: null };
    }
    if (fn === 'release_call_reservation') {
      activeReservations -= 1;
      return { data: { id: 'call-1' }, error: null };
    }
    return { data: null, error: null };
  });

  const bodies: Record<string, unknown>[] = [];
  const vapi = async (_apiKey: string, body: Record<string, unknown>) => {
    bodies.push(body);
    return { statusCode: 200, body: JSON.stringify({ id: `vapi-call-${reservationCount}` }), contentType: 'application/json' };
  };

  const [first, second] = await Promise.all([
    startVapiWebCall(baseInput(client, vapi)),
    startVapiWebCall(baseInput(client, vapi)),
  ]);

  const kinds = [first.kind, second.kind].sort();
  assert.deepEqual(kinds, ['cap-reached', 'started']);
  assert.equal(bodies.length, 1);
  assert.equal(activeReservations, 0);
});

test('the Vapi request carries webhook recipient, owner metadata, and duration bound', async () => {
  const client = createRpc(async (fn) => {
    if (fn === 'reserve_call') return { data: [{ allowed: true, error_code: null }], error: null };
    if (fn === 'finalize_call_reservation') return { data: { id: 'call-1' }, error: null };
    if (fn === 'release_call_reservation') return { data: { id: 'call-1' }, error: null };
    return { data: null, error: null };
  });

  let captured: Record<string, unknown> | null = null;
  const vapi = async (_apiKey: string, body: Record<string, unknown>) => {
    captured = body;
    return { statusCode: 200, body: JSON.stringify({ id: 'vapi-call-1' }), contentType: 'application/json' };
  };

  const result = await startVapiWebCall(baseInput(client, vapi));
  assert.equal(result.kind, 'started');
  assert.equal(captured?.webhookRecipient, 'https://click2call.ai/api/vapi-webhook');
  assert.equal(captured?.maxDurationSeconds, 1800);
  assert.deepEqual(captured?.metadata, { user_id: userId, widget_id: widgetId });
  const finalize = client.calls.find((entry) => entry.fn === 'finalize_call_reservation');
  assert.equal(finalize?.args.p_vapi_call_id, 'vapi-call-1');
});

test('startVapiWebCall releases the reservation when the provider fails', async () => {
  let activeReservations = 0;
  const client = createRpc(async (fn) => {
    if (fn === 'reserve_call') {
      activeReservations += 1;
      return { data: [{ allowed: true, error_code: null }], error: null };
    }
    if (fn === 'release_call_reservation') {
      activeReservations -= 1;
      return { data: { id: 'call-1' }, error: null };
    }
    if (fn === 'finalize_call_reservation') return { data: { id: 'call-1' }, error: null };
    return { data: null, error: null };
  });

  const vapi = async () => { throw new Error('vapi unreachable'); };
  const result = await startVapiWebCall(baseInput(client, vapi));

  assert.equal(result.kind, 'provider-error');
  assert.equal(client.calls.filter((entry) => entry.fn === 'release_call_reservation').length, 1);
  assert.equal(activeReservations, 0);
});

test('reserveCall surfaces cap-reached from the RPC result', async () => {
  const client = createRpc(async () => ({
    data: [{ allowed: false, error_code: 'cap_reached' }],
    error: null,
  }));

  const result = await reserveCall(client, {
    maxDurationSeconds: 1800,
    reservationId: 'reservation-1',
    userId,
    widgetId,
  });

  assert.equal(result.allowed, false);
  const denied = result as Extract<typeof result, { allowed: false }>;
  assert.equal(denied.capReached, true);
});

test('maxDurationSeconds reads the widget setting and clamps to the physical bounds', () => {
  assert.equal(getMaxDurationSeconds({ max_duration_seconds: 60 }), 60);
  assert.equal(getMaxDurationSeconds({ max_duration_seconds: 999999 }), 43200);
  assert.equal(getMaxDurationSeconds({ max_duration_seconds: -5 }), 10);
  assert.equal(getMaxDurationSeconds({}), 1800);
  assert.equal(getMaxDurationSeconds(null), 1800);
});
