const assert = require('node:assert/strict');
const test = require('node:test');
const { io } = require('socket.io-client');
const {
  createSupabaseStub,
  installSupabaseStub
} = require('../support/supabase.cjs');
const { request, stopServer } = require('../support/http.cjs');

process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_SERVICE_KEY = 'test-service-key';

function waitForEvent(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 5000);
    socket.once(event, (value) => {
      clearTimeout(timer);
      resolve(value);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

test('a websocket client can establish and end a VAPI call session', async () => {
  installSupabaseStub(createSupabaseStub({
    results: {
      widgets: {
        data: {
          type: 'vapi',
          settings: {
            vapi_api_key: 'vapi-test-key',
            vapi_assistant_id: 'assistant-test-id'
          }
        },
        error: null
      }
    }
  }));
  const { createServerInstance } = require('../../server/dist/index.js');
  const server = createServerInstance();
  let socket;

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    const before = (await request(server, '/api/stats')).json;
    socket = io(`http://127.0.0.1:${address.port}`, {
      transports: ['websocket']
    });
    await waitForEvent(socket, 'connect');

    const configEvent = waitForEvent(socket, 'vapi-config');
    const establishedEvent = waitForEvent(socket, 'call-established');
    socket.emit('signal', { type: 'call-start', widgetId: 'widget-a' });
    const [vapiConfig] = await Promise.all([configEvent, establishedEvent]);

    assert.deepEqual(vapiConfig, {
      apiKey: 'vapi-test-key',
      assistantId: 'assistant-test-id'
    });

    const endedEvent = waitForEvent(socket, 'call-ended');
    socket.emit('signal', { type: 'call-end' });
    await endedEvent;

    const after = (await request(server, '/api/stats')).json;
    assert.equal(after.totalCalls, before.totalCalls + 1);
    assert.equal(after.activeCalls, before.activeCalls);
    assert.equal(after.activeConnections, before.activeConnections + 1);
  } finally {
    if (socket) socket.disconnect();
    await stopServer(server);
  }
});
