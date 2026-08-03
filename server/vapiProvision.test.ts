import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLeadCaptureTool,
  mergeLeadCaptureTool,
  provisionAllUserWidgets,
  provisionWidget,
  provisionWidgetAssistant,
} from './vapiProvision';
import type { ProvisionFetchLike, VapiProvisionStore } from './vapiProvision';

interface FetchCall {
  url: string;
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };
}

function response(
  ok: boolean,
  status: number,
  payload: unknown,
): Awaited<ReturnType<ProvisionFetchLike>> {
  return { ok, status, json: async () => payload };
}

function widgetStore(
  widgets: Array<{ id: string; settings: unknown }>,
): VapiProvisionStore {
  return {
    async findWidgetForUser(widgetId) {
      return widgets.find((widget) => widget.id === widgetId) || null;
    },
    async listUserVapiWidgets() {
      return widgets;
    },
  };
}

const baseUrl = 'https://click2call.ai';
const validSettings = {
  vapi_api_key: 'private-key',
  vapi_assistant_id: 'assistant-1',
};

test('buildLeadCaptureTool describes the record_lead server tool', () => {
  const tool = buildLeadCaptureTool(baseUrl);
  const server = tool.server as Record<string, unknown>;
  const parameters = tool.parameters as Record<string, unknown>;
  const properties = parameters.properties as Record<string, unknown>;
  const outcome = properties.outcome as Record<string, unknown>;
  const intentScore = properties.intent_score as Record<string, unknown>;


  assert.equal(tool.name, 'record_lead');
  assert.equal(tool.type, 'server');
  assert.equal((server.url as string).endsWith('/api/vapi-escalate'), true);
  assert.equal(server.url, baseUrl + '/api/vapi-escalate');
  assert.deepEqual(outcome.enum, ['qualified', 'unqualified', 'lead_captured', 'booked', 'no_contact']);
  assert.equal(intentScore.type, 'number');
});

test('mergeLeadCaptureTool replaces record_lead and preserves unrelated tools', () => {
  const seedFromNull = mergeLeadCaptureTool(null, baseUrl);
  assert.equal(seedFromNull.length, 1);
  assert.equal(seedFromNull[0].name, 'record_lead');

  const seedFromNonArray = mergeLeadCaptureTool('not-an-array', baseUrl);
  assert.equal(seedFromNonArray.length, 1);
  assert.equal(seedFromNonArray[0].name, 'record_lead');

  const unrelated = { type: 'function', name: 'other_tool', function: { name: 'other_tool' } };
  const existingLead = { type: 'server', name: 'record_lead', server: { url: 'old-url' } };
  const tools = mergeLeadCaptureTool([unrelated, existingLead], baseUrl);

  assert.equal(tools.length, 2);
  assert.deepEqual(tools[0], unrelated);
  assert.equal(tools.filter((tool) => tool.name === 'record_lead').length, 1);
  assert.equal((tools[1].server as Record<string, unknown>).url, baseUrl + '/api/vapi-escalate');
});

test('provisionWidgetAssistant looks up then updates the VAPI assistant', async () => {
  const calls: FetchCall[] = [];
  const fetchImpl: ProvisionFetchLike = async (url, init) => {
    calls.push({ url, init });
    if (init?.method === 'GET') {
      return response(true, 200, {
        model: { tools: [{ type: 'function', name: 'existing_tool' }] },
      });
    }
    return response(true, 200, {});
  };
  const tool = buildLeadCaptureTool(baseUrl);

  const result = await provisionWidgetAssistant({
    fetchImpl,
    apiKey: 'api-key',
    assistantId: 'assistant-1',
    baseUrl,
    tool,
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.vapi.ai/assistant/assistant-1');
  assert.equal(calls[0].init?.method, 'GET');
  assert.equal(calls[0].init?.headers?.Authorization, 'Bearer api-key');
  assert.equal(calls[1].init?.method, 'PATCH');
  assert.equal(calls[1].init?.headers?.Authorization, 'Bearer api-key');
  assert.equal(calls[1].init?.headers?.['Content-Type'], 'application/json');
  const updateBody = JSON.parse(calls[1].init?.body || '{}') as {
    model?: { tools?: Array<Record<string, unknown>> };
  };
  assert.equal(updateBody.model?.tools?.some((entry) => entry.name === 'existing_tool'), true);
  assert.equal(updateBody.model?.tools?.filter((entry) => entry.name === 'record_lead').length, 1);
});

test('provisionWidgetAssistant reports lookup and fetch failures', async () => {
  const tool = buildLeadCaptureTool(baseUrl);

  const failedGet = await provisionWidgetAssistant({
    fetchImpl: async () => response(false, 404, { message: 'nope' }),
    apiKey: 'api-key',
    assistantId: 'assistant-1',
    baseUrl,
    tool,
  });
  assert.equal(failedGet.ok, false);
  assert.equal(failedGet.status, 404);
  assert.equal(failedGet.error, 'Assistant lookup failed');

  const throwing = await provisionWidgetAssistant({
    fetchImpl: async () => { throw new Error('boom'); },
    apiKey: 'api-key',
    assistantId: 'assistant-1',
    baseUrl,
    tool,
  });
  assert.equal(throwing.ok, false);
});

test('provisionWidget gates on widget ownership and vapi configuration', async () => {
  const fetchImpl: ProvisionFetchLike = async () => response(true, 200, {});

  const missing = await provisionWidget({
    store: widgetStore([]),
    fetchImpl,
    widgetId: 'widget-1',
    userId: 'user-1',
    baseUrl,
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, 'Widget not found');

  const incomplete = await provisionWidget({
    store: widgetStore([{ id: 'widget-2', settings: { vapi_api_key: 'k' } }]),
    fetchImpl,
    widgetId: 'widget-2',
    userId: 'user-1',
    baseUrl,
  });
  assert.equal(incomplete.ok, false);
  assert.equal(incomplete.error, 'VAPI configuration is incomplete');

  const ok = await provisionWidget({
    store: widgetStore([{ id: 'widget-3', settings: validSettings }]),
    fetchImpl,
    widgetId: 'widget-3',
    userId: 'user-1',
    baseUrl,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.widgetId, 'widget-3');
});

test('provisionAllUserWidgets provisions every widget and tolerates failures', async () => {
  let calls = 0;
  const fetchImpl: ProvisionFetchLike = async () => {
    calls += 1;
    return response(true, 200, {});
  };

  const results = await provisionAllUserWidgets({
    store: widgetStore([
      { id: 'widget-a', settings: validSettings },
      { id: 'widget-b', settings: { vapi_api_key: 'k' } },
    ]),
    fetchImpl,
    userId: 'user-1',
    baseUrl,
  });

  assert.equal(results.length, 2);
  assert.equal(results[0].ok, true);
  assert.equal(results[0].widgetId, 'widget-a');
  assert.equal(results[1].ok, false);
  assert.equal(results[1].widgetId, 'widget-b');
  assert.equal(results[1].error, 'VAPI configuration is incomplete');
  assert.equal(calls, 2);
});
