import assert from 'node:assert/strict';
import test from 'node:test';

import { canUseWidget, toPublicVapiConfig, toServerVapiConfig } from './socketSecurity';

test('a public call is restricted to its authorized widget', () => {
  assert.equal(canUseWidget('widget-a', 'widget-a'), true);
  assert.equal(canUseWidget('widget-a', 'widget-b'), false);
  assert.equal(canUseWidget(undefined, 'widget-a'), false);
});

test('browser VAPI config contains no provider credential', () => {
  const config = toPublicVapiConfig({
    vapi_api_key: 'private-secret',
    vapi_public_key: 'public-key',
    vapi_assistant_id: 'assistant-id',
  });
  assert.deepEqual(config, { assistantId: 'assistant-id' });
  assert.equal('vapi_api_key' in (config || {}), false);
  assert.equal('publicKey' in (config || {}), false);
  assert.equal(JSON.stringify(config).includes('private-secret'), false);
});

test('a distinct private-like value cannot be emitted as browser configuration', () => {
  const config = toPublicVapiConfig({
    vapi_api_key: 'private-secret',
    vapi_public_key: 'another-private-secret',
    vapi_assistant_id: 'assistant-id',
  });
  assert.deepEqual(config, { assistantId: 'assistant-id' });
  assert.equal(JSON.stringify(config).includes('another-private-secret'), false);
  assert.deepEqual(toServerVapiConfig({
    vapi_api_key: 'private-secret',
    vapi_public_key: 'another-private-secret',
    vapi_assistant_id: 'assistant-id',
  }), {
    apiKey: 'private-secret',
    assistantId: 'assistant-id',
  });
});

test('VAPI config is unavailable until the server key and assistant are configured', () => {
  assert.equal(toPublicVapiConfig({ vapi_api_key: 'private-secret' }), null);
  assert.equal(toPublicVapiConfig({ vapi_public_key: 'public-key' }), null);
  assert.deepEqual(toPublicVapiConfig({
    vapi_api_key: 'same-key',
    vapi_assistant_id: 'assistant-id',
  }), { assistantId: 'assistant-id' });
});
