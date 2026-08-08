import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createHighlevelWebhookStore,
  handleHighlevelWebhook,
  isUninstallEvent,
  parseHighlevelWebhookEvent,
} from './highlevelWebhook';

test('parseHighlevelWebhookEvent accepts common field-name variants', () => {
  assert.deepEqual(
    parseHighlevelWebhookEvent({ type: 'UNINSTALL', locationId: 'loc-1' }),
    { type: 'UNINSTALL', locationId: 'loc-1' },
  );
  assert.deepEqual(
    parseHighlevelWebhookEvent({ eventType: 'AppUninstall', location_id: 'loc-2' }),
    { type: 'AppUninstall', locationId: 'loc-2' },
  );
  assert.deepEqual(
    parseHighlevelWebhookEvent({ event: 'LocationUninstall', location: { id: 'loc-3' } }),
    { type: 'LocationUninstall', locationId: 'loc-3' },
  );
});

test('parseHighlevelWebhookEvent returns null for unrecognized payloads', () => {
  assert.equal(parseHighlevelWebhookEvent(null), null);
  assert.equal(parseHighlevelWebhookEvent({}), null);
  assert.equal(parseHighlevelWebhookEvent('not an object'), null);
});

test('isUninstallEvent matches case-insensitively across naming conventions', () => {
  assert.equal(isUninstallEvent({ type: 'UNINSTALL', locationId: null }), true);
  assert.equal(isUninstallEvent({ type: 'AppUninstall', locationId: null }), true);
  assert.equal(isUninstallEvent({ type: 'app_uninstall', locationId: null }), true);
  assert.equal(isUninstallEvent({ type: 'ContactCreate', locationId: null }), false);
});

function fakeStore() {
  const deleted: string[] = [];
  return {
    deleted,
    store: {
      async deleteConnectionByLocation(locationId: string) {
        deleted.push(locationId);
        return true;
      },
    },
  };
}

test('handleHighlevelWebhook deletes the connection on an uninstall event', async () => {
  const { store, deleted } = fakeStore();
  const result = await handleHighlevelWebhook({
    store,
    body: { type: 'UNINSTALL', locationId: 'loc-1' },
  });
  assert.deepEqual(result, { kind: 'uninstalled', locationId: 'loc-1' });
  assert.deepEqual(deleted, ['loc-1']);
});

test('handleHighlevelWebhook ignores non-uninstall events without deleting anything', async () => {
  const { store, deleted } = fakeStore();
  const result = await handleHighlevelWebhook({
    store,
    body: { type: 'ContactCreate', locationId: 'loc-1' },
  });
  assert.equal(result.kind, 'ignored');
  assert.deepEqual(deleted, []);
});

test('handleHighlevelWebhook ignores an uninstall event with no locationId', async () => {
  const { store, deleted } = fakeStore();
  const result = await handleHighlevelWebhook({
    store,
    body: { type: 'UNINSTALL' },
  });
  assert.deepEqual(result, { kind: 'ignored', reason: 'Uninstall event missing locationId' });
  assert.deepEqual(deleted, []);
});

test('createHighlevelWebhookStore.deleteConnectionByLocation calls the RPC with the right args', async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client = {
    async rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      return { data: {}, error: null };
    },
  };
  const store = createHighlevelWebhookStore(client);
  const ok = await store.deleteConnectionByLocation('loc-1');
  assert.equal(ok, true);
  assert.equal(calls[0].fn, 'delete_highlevel_connection_by_location');
  assert.equal(calls[0].args.p_location_id, 'loc-1');
});
