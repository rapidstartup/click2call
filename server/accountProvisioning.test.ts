import assert from 'node:assert/strict';
import test from 'node:test';

import { createAccountProvisioningStore, provisionUserByEmail } from './accountProvisioning';
import type { AccountProvisioningStore } from './accountProvisioning';

function fakeAdminClient(existingUsers: { id: string; email: string }[]) {
  let created: { id: string; email: string } | null = null;
  let nextId = 1;

  return {
    auth: {
      admin: {
        async listUsers({ page, perPage }: { page: number; perPage: number }) {
          const start = (page - 1) * perPage;
          const users = existingUsers.slice(start, start + perPage);
          return { data: { users }, error: null };
        },
        async createUser({ email }: { email: string; email_confirm: boolean }) {
          created = { id: `new-user-${nextId}`, email };
          nextId += 1;
          return { data: { user: created }, error: null };
        },
      },
    },
    getCreated: () => created,
  };
}

test('provisionUserByEmail returns an existing user without creating one', async () => {
  const client = fakeAdminClient([{ id: 'user-1', email: 'agency@example.com' }]);
  const store = createAccountProvisioningStore(client);

  const result = await provisionUserByEmail(store, 'agency@example.com');
  assert.deepEqual(result, { userId: 'user-1', isNewUser: false });
  assert.equal(client.getCreated(), null);
});

test('provisionUserByEmail matches email case-insensitively', async () => {
  const client = fakeAdminClient([{ id: 'user-1', email: 'Agency@Example.com' }]);
  const store = createAccountProvisioningStore(client);

  const result = await provisionUserByEmail(store, 'agency@example.com');
  assert.deepEqual(result, { userId: 'user-1', isNewUser: false });
});

test('provisionUserByEmail creates a new user when none exists', async () => {
  const client = fakeAdminClient([]);
  const store = createAccountProvisioningStore(client);

  const result = await provisionUserByEmail(store, 'newagency@example.com');
  assert.equal(result?.isNewUser, true);
  assert.equal(result?.userId, 'new-user-1');
  assert.deepEqual(client.getCreated(), { id: 'new-user-1', email: 'newagency@example.com' });
});

test('provisionUserByEmail returns null for an empty email', async () => {
  const client = fakeAdminClient([]);
  const store = createAccountProvisioningStore(client);

  const result = await provisionUserByEmail(store, '   ');
  assert.equal(result, null);
  assert.equal(client.getCreated(), null);
});

test('createAccountProvisioningStore.findUserIdByEmail paginates until it finds a match', async () => {
  const users = Array.from({ length: 250 }, (_, i) => ({ id: `user-${i}`, email: `user${i}@example.com` }));
  const client = fakeAdminClient(users);
  const store: AccountProvisioningStore = createAccountProvisioningStore(client);

  const result = await store.findUserIdByEmail('user240@example.com');
  assert.equal(result, 'user-240');
});
