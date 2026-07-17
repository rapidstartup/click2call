const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createSupabaseStub,
  installSupabaseStub
} = require('../support/supabase.cjs');

function responseRecorder() {
  const response = {
    statusCode: 200,
    body: undefined,
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(body) {
      response.body = body;
      return response;
    }
  };
  return response;
}

test('authentication rejects missing and malformed bearer credentials', async () => {
  const supabase = installSupabaseStub(createSupabaseStub());
  const { authenticateUser } = require('../../server/dist/middleware/auth.js');

  for (const authorization of [undefined, 'Basic secret', 'Bearer   ']) {
    const req = { headers: authorization ? { authorization } : {} };
    const res = responseRecorder();
    let nextCalled = false;

    await authenticateUser(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'No token provided' });
    assert.equal(nextCalled, false);
  }

  assert.deepEqual(supabase.authCalls, []);
});

test('authentication attaches only the verified user identity', async () => {
  const supabase = installSupabaseStub(createSupabaseStub({
    authResult: { data: { user: { id: 'user-a', email: 'a@example.com' } }, error: null }
  }));
  const { authenticateUser } = require('../../server/dist/middleware/auth.js');
  const req = { headers: { authorization: 'Bearer signed-token' } };
  const res = responseRecorder();
  let nextCalled = false;

  await authenticateUser(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { id: 'user-a' });
  assert.deepEqual(supabase.authCalls, ['signed-token']);
  assert.equal(res.body, undefined);
});

test('authentication rejects tokens Supabase cannot verify', async () => {
  const supabase = installSupabaseStub(createSupabaseStub({
    authResult: { data: { user: null }, error: new Error('invalid') }
  }));
  const { authenticateUser } = require('../../server/dist/middleware/auth.js');
  const req = { headers: { authorization: 'Bearer invalid-token' } };
  const res = responseRecorder();

  await authenticateUser(req, res, () => assert.fail('next must not run'));

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Invalid token' });
  assert.deepEqual(supabase.authCalls, ['invalid-token']);
});
