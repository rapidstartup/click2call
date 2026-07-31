import assert from 'node:assert/strict';
import test from 'node:test';

import { canUseWidget, toPublicVapiConfig } from './socketSecurity';

test('a public call is restricted to its authorized widget', () => {
  assert.equal(canUseWidget('widget-a', 'widget-a'), true);
  assert.equal(canUseWidget('widget-a', 'widget-b'), false);
  assert.equal(canUseWidget(undefined, 'widget-a'), false);
});

test('public VAPI config never includes the private API key', () => {
  const config = toPublicVapiConfig({
    vapi_api_key: 'private-secret',
    vapi_public_key: 'public-key',
    vapi_assistant_id: 'assistant-id',
  });
  assert.deepEqual(config, { publicKey: 'public-key', assistantId: 'assistant-id' });
  assert.equal('vapi_api_key' in (config || {}), false);
});

test('VAPI config is unavailable until a public key and assistant are configured', () => {
  assert.equal(toPublicVapiConfig({ vapi_api_key: 'private-secret' }), null);
  assert.equal(toPublicVapiConfig({ vapi_public_key: 'public-key' }), null);
  assert.equal(toPublicVapiConfig({
    vapi_api_key: 'same-key',
    vapi_public_key: ' same-key ',
    vapi_assistant_id: 'assistant-id',
  }), null);
});
