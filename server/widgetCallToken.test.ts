import assert from 'node:assert/strict';
import test from 'node:test';

import { createWidgetCallToken, verifyWidgetCallToken } from './widgetCallToken';

const secret = 'test-only-widget-token-secret';
const widgetId = '11111111-1111-4111-8111-111111111111';

test('widget call tokens are scoped and expire', () => {
  const token = createWidgetCallToken(widgetId, secret, 1_000_000, 60);
  assert.equal(verifyWidgetCallToken(token, secret, 1_030_000)?.widgetId, widgetId);
  assert.equal(verifyWidgetCallToken(token, secret, 1_061_000), null);
});

test('widget call tokens reject missing, tampered, and incorrectly signed values', () => {
  const token = createWidgetCallToken(widgetId, secret);
  assert.equal(verifyWidgetCallToken(undefined, secret), null);
  assert.equal(verifyWidgetCallToken(`${token}x`, secret), null);
  assert.equal(verifyWidgetCallToken(token, 'different-secret'), null);
});
