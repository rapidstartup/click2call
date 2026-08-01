import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Supabase service credentials never use a Vite-exposed variable', () => {
  const forbiddenName = 'VITE_SUPABASE_' + 'SERVICE_KEY';
  const files = [
    '.env.example',
    'server/db/index.ts',
    'server/ecosystem.config.js',
    'server/socket.ts',
    'src/lib/supabase.ts',
  ];

  for (const file of files) {
    const contents = readFileSync(join(process.cwd(), file), 'utf8');
    assert.doesNotMatch(contents, new RegExp(forbiddenName), `${file} must not reference ${forbiddenName}`);
  }

  const browserClient = readFileSync(join(process.cwd(), 'src/lib/supabase.ts'), 'utf8');
  assert.match(browserClient, /VITE_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(browserClient, /SUPABASE_SERVICE_KEY/);
});
