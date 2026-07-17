const assert = require('node:assert/strict');

function createSupabaseStub({ authResult, results = {} } = {}) {
  const calls = [];
  const authCalls = [];
  const resultQueues = new Map(
    Object.entries(results).map(([table, tableResults]) => [
      table,
      Array.isArray(tableResults) ? [...tableResults] : [tableResults]
    ])
  );

  const nextResult = (table) => {
    const queue = resultQueues.get(table);
    return queue && queue.length
      ? queue.shift()
      : { data: null, error: null };
  };

  const from = (table) => {
    const result = nextResult(table);
    const builder = {};

    for (const method of ['select', 'insert', 'upsert', 'update', 'eq']) {
      builder[method] = (...args) => {
        calls.push({ table, method, args });
        return builder;
      };
    }

    builder.single = async () => result;
    builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return builder;
  };

  return {
    calls,
    authCalls,
    auth: {
      getUser: async (token) => {
        authCalls.push(token);
        return authResult || { data: { user: null }, error: new Error('No auth result') };
      }
    },
    from
  };
}

function installSupabaseStub(stub) {
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_SERVICE_KEY = 'test-service-key';
  const db = require('../../server/dist/db/index.js');
  db.supabase = stub;
  return stub;
}

function assertQuery(calls, table, method, ...args) {
  assert.ok(
    calls.some(
      (call) => call.table === table && call.method === method &&
        JSON.stringify(call.args) === JSON.stringify(args)
    ),
    `expected ${table}.${method}(${args.map(String).join(', ')})`
  );
}

module.exports = { createSupabaseStub, installSupabaseStub, assertQuery };
