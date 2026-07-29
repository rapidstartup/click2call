const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_SERVICE_KEY = 'test-service-key';

const { supabase } = require('../dist/db');
const mobileRoutes = require('../dist/routes/mobile').default;

const USER_ID = 'user-a';
const WIDGET_ID = 'widget-a';
const OWN_DEVICE_ID = 'device-a';
const FOREIGN_DEVICE_ID = 'device-b';

function installSupabaseStub() {
  const upserts = [];
  const originalFrom = supabase.from;
  const originalGetUser = supabase.auth.getUser;

  supabase.auth.getUser = async () => ({
    data: { user: { id: USER_ID } },
    error: null
  });

  supabase.from = (table) => {
    const filters = [];
    let upsertPayload;

    const query = {
      select: () => query,
      eq: (column, value) => {
        filters.push([column, value]);
        return query;
      },
      upsert: (payload) => {
        upserts.push({ table, payload });
        upsertPayload = payload;
        return query;
      },
      single: async () => {
        if (table === 'widgets') {
          const ownsWidget = filters.some(([column, value]) => column === 'user_id' && value === USER_ID);
          return ownsWidget
            ? { data: { id: WIDGET_ID }, error: null }
            : { data: null, error: { message: 'not found' } };
        }

        if (table === 'mobile_devices') {
          const deviceId = filters.find(([column]) => column === 'id')?.[1];
          const deviceOwners = {
            [OWN_DEVICE_ID]: USER_ID,
            [FOREIGN_DEVICE_ID]: 'user-b'
          };
          const requestedUserId = filters.find(([column]) => column === 'user_id')?.[1];
          const deviceExists = typeof deviceId === 'string' && deviceId in deviceOwners;
          const ownsDevice = !requestedUserId || deviceOwners[deviceId] === requestedUserId;
          return deviceExists && ownsDevice
            ? { data: { id: deviceId }, error: null }
            : { data: null, error: { message: 'not found' } };
        }

        return { data: { id: 'route-a', ...upsertPayload }, error: null };
      }
    };

    return query;
  };

  return {
    upserts,
    restore() {
      supabase.from = originalFrom;
      supabase.auth.getUser = originalGetUser;
    }
  };
}

async function postRoute(deviceId) {
  const app = express();
  app.use(express.json());
  app.use('/mobile', mobileRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    return await new Promise((resolve, reject) => {
      const request = http.request({
        hostname: '127.0.0.1',
        port,
        path: `/mobile/widgets/${WIDGET_ID}/route`,
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json'
        }
      }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve({
          statusCode: response.statusCode,
          body: JSON.parse(body)
        }));
      });

      request.on('error', reject);
      request.end(JSON.stringify({ deviceId, status: 'active' }));
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('accepts a route for the authenticated user’s device', async () => {
  const stub = installSupabaseStub();

  try {
    const response = await postRoute(OWN_DEVICE_ID);

    assert.equal(response.statusCode, 200);
    assert.equal(stub.upserts.length, 1);
    assert.equal(stub.upserts[0].table, 'widget_routes');
    assert.equal(stub.upserts[0].payload.device_id, OWN_DEVICE_ID);
  } finally {
    stub.restore();
  }
});

test('rejects another user’s device before creating a route', async () => {
  const stub = installSupabaseStub();

  try {
    const response = await postRoute(FOREIGN_DEVICE_ID);

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.body, { error: 'Device not found' });
    assert.equal(stub.upserts.length, 0);
  } finally {
    stub.restore();
  }
});
