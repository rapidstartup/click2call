const assert = require('node:assert/strict');
const test = require('node:test');
const twilio = require('twilio');
const {
  assertQuery,
  createSupabaseStub,
  installSupabaseStub
} = require('../support/supabase.cjs');
const { startApp, request, stopServer } = require('../support/http.cjs');

process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_SERVICE_KEY = 'test-service-key';
installSupabaseStub(createSupabaseStub());
const { createApp } = require('../../server/dist/app.js');

test('protected endpoints reject requests without authentication', async () => {
  const server = await startApp(createApp());
  try {
    const response = await request(server, '/mobile/widgets');
    assert.equal(response.status, 401);
    assert.deepEqual(response.json, { error: 'No token provided' });
  } finally {
    await stopServer(server);
  }
});

test('widget reads are scoped to the authenticated tenant', async () => {
  const supabase = installSupabaseStub(createSupabaseStub({
    authResult: { data: { user: { id: 'tenant-a' } }, error: null },
    results: {
      widgets: { data: [{ id: 'widget-a', name: 'Tenant A' }], error: null }
    }
  }));
  const server = await startApp(createApp());

  try {
    const response = await request(server, '/mobile/widgets', {
      headers: { Authorization: 'Bearer tenant-a-token' }
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.json, [{ id: 'widget-a', name: 'Tenant A' }]);
    assertQuery(supabase.calls, 'widgets', 'eq', 'user_id', 'tenant-a');
  } finally {
    await stopServer(server);
  }
});

test('widget creation always uses the verified tenant instead of request data', async () => {
  const supabase = installSupabaseStub(createSupabaseStub({
    authResult: { data: { user: { id: 'tenant-a' } }, error: null },
    results: {
      widgets: { data: { id: 'widget-a', user_id: 'tenant-a' }, error: null }
    }
  }));
  const server = await startApp(createApp());

  try {
    const response = await request(server, '/api/widgets', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer tenant-a-token',
        'Content-Type': 'application/json'
      },
      body: {
        user_id: 'tenant-b',
        name: 'Tenant A widget',
        type: 'call2app',
        destination: '+15551234567'
      }
    });

    assert.equal(response.status, 200);
    const insert = supabase.calls.find((call) => call.table === 'widgets' && call.method === 'insert');
    assert.deepEqual(insert.args[0].user_id, 'tenant-a');
    assert.notEqual(insert.args[0].user_id, 'tenant-b');
  } finally {
    await stopServer(server);
  }
});

test('route updates cannot address a widget owned by another tenant', async () => {
  const supabase = installSupabaseStub(createSupabaseStub({
    authResult: { data: { user: { id: 'tenant-a' } }, error: null },
    results: {
      widgets: { data: null, error: { message: 'not found' } }
    }
  }));
  const server = await startApp(createApp());

  try {
    const response = await request(server, '/mobile/widgets/widget-b/route', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer tenant-a-token',
        'Content-Type': 'application/json'
      },
      body: { deviceId: 'device-b', status: 'active' }
    });

    assert.equal(response.status, 404);
    assert.deepEqual(response.json, { error: 'Widget not found' });
    assert.equal(supabase.calls.some((call) => call.table === 'widget_routes'), false);
  } finally {
    await stopServer(server);
  }
});

test('Twilio rejects invalid webhook signatures', async () => {
  installSupabaseStub(createSupabaseStub({
    results: {
      widgets: { data: { settings: {
        twilio_account_sid: 'AC-test',
        twilio_auth_token: 'twilio-secret'
      } }, error: null }
    }
  }));
  const server = await startApp(createApp());

  try {
    const response = await request(server, '/twilio/status/widget-a', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': 'invalid-signature'
      },
      body: 'CallSid=CA-test&CallStatus=completed'
    });

    assert.equal(response.status, 403);
    assert.match(response.text, /Invalid Twilio request/);
    assert.doesNotMatch(response.text, /twilio-secret/);
  } finally {
    await stopServer(server);
  }
});

test('Twilio accepts a valid signature and completes the call lifecycle webhook', async () => {
  const authToken = 'twilio-secret';
  installSupabaseStub(createSupabaseStub({
    results: {
      widgets: [
        { data: { settings: {
          twilio_account_sid: 'AC-test',
          twilio_auth_token: authToken
        } }, error: null },
        { data: {
          routing: { defaultRoute: '+15551234567' },
          destination: '+15550000000'
        }, error: null }
      ]
    }
  }));
  const server = await startApp(createApp());
  const body = { CallSid: 'CA-test', From: '+15550000001' };

  try {
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}/twilio/voice/widget-a`;
    const signature = twilio.getExpectedTwilioSignature(authToken, url, body);
    const encodedBody = new URLSearchParams(body).toString();
    const response = await request(server, '/twilio/voice/widget-a', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': signature
      },
      body: encodedBody
    });

    assert.equal(response.status, 200);
    assert.match(response.text, /<Dial>\+15551234567<\/Dial>/);
    assert.doesNotMatch(response.text, /twilio-secret/);
  } finally {
    await stopServer(server);
  }
});
