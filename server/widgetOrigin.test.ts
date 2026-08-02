import assert from 'node:assert/strict';
import test from 'node:test';

import { getAllowedOrigins, isOriginAllowed, normalizeOrigin } from './widgetOrigin';

test('widget origins are exact and normalized', () => {
  assert.equal(normalizeOrigin('https://Example.com/path'), 'https://example.com');
  assert.equal(isOriginAllowed('https://example.com', { allowed_origins: ['https://EXAMPLE.com/'] }), true);
  assert.equal(isOriginAllowed('https://evil.example', { allowed_origins: ['https://example.com'] }), false);
  assert.equal(isOriginAllowed(undefined, { allowed_origins: ['https://example.com'] }), false);
});

test('invalid and duplicate allowed origins are removed', () => {
  assert.deepEqual(getAllowedOrigins({
    allowed_origins: ['https://example.com/a', 'https://example.com/b', 'javascript:alert(1)'],
  }), ['https://example.com']);
});
