import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyTurnstileToken } from './turnstile';

const baseInput = {
  expectedAction: 'turnstile-spin-v2',
  expectedCdata: '11111111111141118111111111111111',
  expectedHostname: 'click2call.ai',
  remoteIp: '203.0.113.10',
  secret: 'test-secret',
  token: 'test-token',
};

function response(payload: unknown, ok = true): Promise<Response> {
  return Promise.resolve({ ok, json: async () => payload } as Response);
}

test('Turnstile verification requires matching hostname, action, and widget cData', async () => {
  const fetchImpl = async () => response({
    success: true,
    hostname: 'click2call.ai',
    action: 'turnstile-spin-v2',
    cdata: baseInput.expectedCdata,
  });
  assert.deepEqual(await verifyTurnstileToken(baseInput, fetchImpl), { success: true });

  const wrongHostname = async () => response({
    success: true,
    hostname: 'attacker.example',
    action: 'turnstile-spin-v2',
    cdata: baseInput.expectedCdata,
  });
  assert.deepEqual(await verifyTurnstileToken(baseInput, wrongHostname), {
    success: false,
    reason: 'hostname-mismatch',
  });
});

test('Turnstile verification fails closed on rejection or service errors', async () => {
  const rejected = async () => response({ success: false });
  assert.deepEqual(await verifyTurnstileToken(baseInput, rejected), {
    success: false,
    reason: 'challenge-rejected',
  });

  const unavailable = async () => { throw new Error('network error'); };
  assert.deepEqual(await verifyTurnstileToken(baseInput, unavailable), {
    success: false,
    reason: 'siteverify-unavailable',
  });
});
