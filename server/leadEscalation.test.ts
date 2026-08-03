import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLeadEscalationStore,
  escalateLead,
  parseEscalationPayload,
} from './leadEscalation';
import type {
  EscalationWidget,
  LeadEscalationPayload,
  LeadEscalationStore,
} from './leadEscalation';
import type { EmailMessage } from './email';

const userId = '11111111-1111-4111-8111-111111111111';
const widgetId = '22222222-2222-4222-8222-222222222222';
const widget = { id: widgetId, user_id: userId } satisfies EscalationWidget;

function payload(args: Record<string, unknown>): LeadEscalationPayload {
  return {
    apiKey: 'widget-secret',
    assistantId: 'assistant-1',
    vapiCallId: 'vapi-call-1',
    args,
  };
}

test('parseEscalationPayload accepts direct and nested call identifiers', () => {
  const direct = parseEscalationPayload({
    vapiCallId: 'vapi-call-direct',
    call: { assistantId: 'assistant-1' },
    toolArgs: { name: 'Ada' },
  }, 'Bearer widget-secret');
  assert.deepEqual(direct, {
    apiKey: 'widget-secret',
    assistantId: 'assistant-1',
    vapiCallId: 'vapi-call-direct',
    args: { name: 'Ada' },
  });

  const nested = parseEscalationPayload({
    call: { id: 'vapi-call-nested', assistantId: 'assistant-1' },
    arguments: { email: 'ada@example.com' },
  }, 'Bearer widget-secret');
  assert.equal(nested?.vapiCallId, 'vapi-call-nested');
  assert.deepEqual(nested?.args, { email: 'ada@example.com' });
});

test('parseEscalationPayload rejects missing authorization, assistant, or call id', () => {
  assert.equal(parseEscalationPayload({
    vapiCallId: 'vapi-call-1',
    call: { assistantId: 'assistant-1' },
  }, undefined), null);
  assert.equal(parseEscalationPayload({
    vapiCallId: 'vapi-call-1',
    call: {},
  }, 'Bearer widget-secret'), null);
  assert.equal(parseEscalationPayload({
    call: { assistantId: 'assistant-1' },
  }, 'Bearer widget-secret'), null);
});

interface WidgetQuery {
  select(columns?: string): WidgetQuery;
  eq(column: string, value: unknown): WidgetQuery;
  maybeSingle<T = unknown>(): Promise<{ data: T | null; error: null }>;
}

function widgetClient(expectedAssistant: string, expectedKey: string) {
  const filters: Record<string, unknown> = {};
  const row = { id: widgetId, user_id: userId };
  const query: WidgetQuery = {
    select() {
      return query;
    },
    eq(column, value) {
      filters[column] = value;
      return query;
    },
    async maybeSingle<T = unknown>() {
      const matches = filters['settings->>vapi_assistant_id'] === expectedAssistant
        && filters['settings->>vapi_api_key'] === expectedKey;
      return { data: (matches ? row : null) as T | null, error: null };
    },
  };
  return { from: () => query };
}

test('createLeadEscalationStore finds widgets only when assistant and API key match', async () => {
  const store = createLeadEscalationStore(widgetClient('assistant-1', 'widget-secret'));
  assert.deepEqual(await store.findEscalationWidget('assistant-1', 'widget-secret'), widget);
  assert.equal(await store.findEscalationWidget('assistant-1', 'wrong-secret'), null);
});

interface StoreTrace {
  outcomes: Array<{ vapiCallId: string; outcome: string }>;
  rows: Array<Record<string, unknown>>;
  ownerIds: string[];
  sent: EmailMessage[];
  marked: string[];
}

function fakeStore(options: {
  leadId?: string | null;
  ownerEmail?: string | null;
} = {}): { store: LeadEscalationStore; trace: StoreTrace } {
  const trace: StoreTrace = {
    outcomes: [],
    rows: [],
    ownerIds: [],
    sent: [],
    marked: [],
  };
  const store: LeadEscalationStore = {
    async findEscalationWidget() {
      return widget;
    },
    async setCallOutcome(vapiCallId, outcome) {
      trace.outcomes.push({ vapiCallId, outcome });
      return true;
    },
    async insertLead(row) {
      trace.rows.push(row);
      return options.leadId === undefined ? 'lead-1' : options.leadId;
    },
    async markLeadEmailDelivered(leadId) {
      trace.marked.push(leadId);
      return true;
    },
    async findOwnerEmail(userId) {
      trace.ownerIds.push(userId);
      return options.ownerEmail === undefined ? 'owner@example.com' : options.ownerEmail;
    },
  };
  return { store, trace };
}

test('escalateLead records the lead, emails the owner, and marks delivery', async () => {
  const fake = fakeStore();
  const result = await escalateLead({
    store: fake.store,
    payload: payload({
      outcome: ' qualified ',
      name: ' Ada Lovelace ',
      email: ' ada@example.com ',
      phone: ' +61 400 000 000 ',
      message: ' Interested in a demo ',
      intent_score: 0.9,
    }),
    widget,
    sendEmail: async (message) => {
      fake.trace.sent.push(message);
      return { delivered: true };
    },
    now: () => new Date('2026-08-04T00:00:00.000Z'),
  });

  assert.match(result.result, /Lead recorded/);
  assert.deepEqual(fake.trace.outcomes, [{ vapiCallId: 'vapi-call-1', outcome: 'qualified' }]);
  assert.deepEqual(fake.trace.rows, [{
    user_id: userId,
    widget_id: widgetId,
    call_id: 'vapi-call-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+61 400 000 000',
    message: 'Interested in a demo',
    intent_score: 0.9,
    outcome: 'qualified',
    source: 'vapi',
  }]);
  assert.deepEqual(fake.trace.ownerIds, [userId]);
  assert.equal(fake.trace.sent[0]?.to, 'owner@example.com');
  assert.deepEqual(fake.trace.marked, ['lead-1']);
});

test('escalateLead records a lead when SMTP is not configured and reports the skip reason', async () => {
  const fake = fakeStore();
  const result = await escalateLead({
    store: fake.store,
    payload: payload({ name: 'Ada' }),
    widget,
    sendEmail: async () => ({ delivered: false, reason: 'SMTP not configured' }),
  });

  assert.match(result.result, /Lead recorded/);
  assert.match(result.result, /SMTP not configured/);
  assert.equal(fake.trace.rows.length, 1);
  assert.deepEqual(fake.trace.marked, []);
});

test('escalateLead writes an outcome without inserting a contactless lead', async () => {
  const fake = fakeStore();
  const result = await escalateLead({
    store: fake.store,
    payload: payload({ outcome: 'no_contact', message: 'Only a message' }),
    widget,
    sendEmail: async () => ({ delivered: true }),
  });

  assert.equal(result.result, 'No lead contact provided');
  assert.deepEqual(fake.trace.outcomes, [{ vapiCallId: 'vapi-call-1', outcome: 'no_contact' }]);
  assert.equal(fake.trace.rows.length, 0);
  assert.equal(fake.trace.ownerIds.length, 0);
  assert.equal(fake.trace.sent.length, 0);
});

test('escalateLead inserts a contact lead without writing a missing outcome', async () => {
  const fake = fakeStore();
  await escalateLead({
    store: fake.store,
    payload: payload({ email: 'ada@example.com' }),
    widget,
    sendEmail: async () => ({ delivered: false, reason: 'SMTP not configured' }),
  });

  assert.equal(fake.trace.outcomes.length, 0);
  assert.equal(fake.trace.rows.length, 1);
});

test('malformed tool arguments are treated as an empty argument record', async () => {
  const parsed = parseEscalationPayload({
    vapiCallId: 'vapi-call-1',
    call: { assistantId: 'assistant-1' },
    toolArgs: 'not-an-object',
  }, 'Bearer widget-secret');
  assert.ok(parsed);
  assert.deepEqual(parsed.args, {});

  const fake = fakeStore();
  const result = await escalateLead({
    store: fake.store,
    payload: parsed,
    widget,
    sendEmail: async () => ({ delivered: true }),
  });
  assert.equal(result.result, 'No lead contact provided');
  assert.equal(fake.trace.rows.length, 0);
});
