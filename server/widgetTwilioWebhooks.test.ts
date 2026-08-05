import assert from 'node:assert/strict';
import test from 'node:test';

import { validateTwilioWebhookBody } from '../netlify/functions/widget-twilio-webhooks';

test('validateTwilioWebhookBody rejects missing widgetId', () => {
  const result = validateTwilioWebhookBody({ sipDomain: 'test', accountSid: 'AC', authToken: 'token' });
  assert.equal(result.valid, false);
});

test('validateTwilioWebhookBody rejects missing sipDomain', () => {
  const result = validateTwilioWebhookBody({ widgetId: 'wid', accountSid: 'AC', authToken: 'token' });
  assert.equal(result.valid, false);
});

test('validateTwilioWebhookBody rejects missing accountSid', () => {
  const result = validateTwilioWebhookBody({ widgetId: 'wid', sipDomain: 'test', authToken: 'token' });
  assert.equal(result.valid, false);
});

test('validateTwilioWebhookBody rejects missing authToken', () => {
  const result = validateTwilioWebhookBody({ widgetId: 'wid', sipDomain: 'test', accountSid: 'AC' });
  assert.equal(result.valid, false);
});

test('validateTwilioWebhookBody accepts valid body', () => {
  const result = validateTwilioWebhookBody({
    widgetId: 'wid',
    sipDomain: 'test',
    accountSid: 'AC',
    authToken: 'token',
  });
  assert.equal(result.valid, true);
  assert.equal(result.widgetId, 'wid');
  assert.equal(result.sipDomain, 'test');
  assert.equal(result.accountSid, 'AC');
  assert.equal(result.authToken, 'token');
});

test('validateTwilioWebhookBody parses JSON string body', () => {
  const result = validateTwilioWebhookBody(
    JSON.stringify({ widgetId: 'wid', sipDomain: 'test', accountSid: 'AC', authToken: 'token' }),
  );
  assert.equal(result.valid, true);
  assert.equal(result.widgetId, 'wid');
});