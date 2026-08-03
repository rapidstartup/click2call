import { toServerVapiConfig } from './socketSecurity';

interface RecordValue {
  [key: string]: unknown;
}

interface SupabaseErrorLike {
  message?: string;
}

interface SupabaseQueryResult {
  data: unknown;
  error: SupabaseErrorLike | null;
}

interface SupabaseFilterQueryLike extends PromiseLike<SupabaseQueryResult> {
  eq(column: string, value: unknown): SupabaseFilterQueryLike;
  maybeSingle(): Promise<SupabaseQueryResult>;
}

interface SupabaseTableLike {
  select(columns?: string): SupabaseFilterQueryLike;
}

interface SupabaseClientLike {
  from(table: string): SupabaseTableLike;
}

export interface VapiProvisionStore {
  findWidgetForUser(
    widgetId: string,
    userId: string,
  ): Promise<{ id: string; settings: unknown } | null>;
  listUserVapiWidgets(userId: string): Promise<Array<{ id: string; settings: unknown }>>;
}

export function createVapiProvisionStore(client: unknown): VapiProvisionStore {
  const supabase = client as SupabaseClientLike;

  return {
    async findWidgetForUser(widgetId, userId) {
      const { data, error } = await supabase
        .from('widgets')
        .select('id, settings')
        .eq('id', widgetId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error(error.message || 'Widget lookup failed');
      return widgetRow(data);
    },
    async listUserVapiWidgets(userId) {
      const { data, error } = await supabase
        .from('widgets')
        .select('id, settings')
        .eq('user_id', userId)
        .eq('type', 'vapi');
      if (error) throw new Error(error.message || 'Widget lookup failed');
      if (!Array.isArray(data)) return [];
      return data.flatMap((value): Array<{ id: string; settings: unknown }> => {
        const row = widgetRow(value);
        return row ? [row] : [];
      });
    },
  };
}

export interface ProvisionFetchLike {
  (
    url: string,
    init?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }>;
}

export interface ProvisionResult {
  ok: boolean;
  status?: number;
  error?: string;
}

const leadOutcomes = ['qualified', 'unqualified', 'lead_captured', 'booked', 'no_contact'];

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RecordValue;
}

function widgetRow(value: unknown): { id: string; settings: unknown } | null {
  const row = asRecord(value);
  const id = typeof row?.id === 'string' ? row.id.trim() : '';
  return id ? { id, settings: row?.settings } : null;
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  const record = asRecord(value);
  if (!record) return value;

  const clone: RecordValue = {};
  for (const [key, entry] of Object.entries(record)) clone[key] = cloneValue(entry);
  return clone;
}

function cloneTool(value: unknown): Record<string, unknown> | null {
  const clone = cloneValue(value);
  return asRecord(clone);
}

function mergeTool(tools: unknown, tool: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(tools)) return [cloneTool(tool) || {}];

  const merged = tools.flatMap((value): Record<string, unknown>[] => {
    const record = asRecord(value);
    if (!record || record.name === 'record_lead') return [];
    const clone = cloneTool(record);
    return clone ? [clone] : [];
  });
  const toolClone = cloneTool(tool);
  if (toolClone) merged.push(toolClone);
  return merged;
}

export function buildLeadCaptureTool(baseUrl: string): Record<string, unknown> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  return {
    type: 'server',
    name: 'record_lead',
    async: false,
    server: {
      url: normalizedBaseUrl + '/api/vapi-escalate',
      timeoutSeconds: 10,
    },
    description: "Record a qualified or captured lead with the caller's contact details for escalation to the owner.",
    parameters: {
      type: 'object',
      properties: {
        outcome: { type: 'string', enum: leadOutcomes },
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        message: { type: 'string' },
        intent_score: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: [],
    },
  };
}

export function mergeLeadCaptureTool(
  tools: unknown,
  baseUrl: string,
): Record<string, unknown>[] {
  return mergeTool(tools, buildLeadCaptureTool(baseUrl));
}

export async function provisionWidgetAssistant(input: {
  fetchImpl: ProvisionFetchLike;
  apiKey: string;
  assistantId: string;
  baseUrl: string;
  tool: Record<string, unknown>;
}): Promise<ProvisionResult> {
  const assistantUrl = 'https://api.vapi.ai/assistant/' + input.assistantId;
  const authorization = 'Bearer ' + input.apiKey;

  try {
    const lookup = await input.fetchImpl(assistantUrl, {
      method: 'GET',
      headers: { Authorization: authorization },
    });
    if (!lookup.ok) return { ok: false, status: lookup.status, error: 'Assistant lookup failed' };

    const payload = asRecord(await lookup.json());
    const model = asRecord(payload?.model);
    const tools = mergeTool(model?.tools, input.tool);
    const update = await input.fetchImpl(assistantUrl, {
      method: 'PATCH',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: { tools } }),
    });
    if (!update.ok) return { ok: false, status: update.status, error: 'Assistant update failed' };

    return { ok: true, status: update.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'VAPI provisioning request failed',
    };
  }
}

export function appBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return (
    env.PUBLIC_APP_URL?.trim()
    || env.URL?.trim()
    || 'https://click2call.ai'
  ).replace(/\/+$/, '');
}

async function provisionWidgetRow(input: {
  fetchImpl: ProvisionFetchLike;
  widget: { id: string; settings: unknown };
  baseUrl: string;
}): Promise<ProvisionResult & { widgetId: string }> {
  const config = toServerVapiConfig(input.widget.settings);
  if (!config) {
    return { ok: false, widgetId: input.widget.id, error: 'VAPI configuration is incomplete' };
  }

  const result = await provisionWidgetAssistant({
    fetchImpl: input.fetchImpl,
    apiKey: config.apiKey,
    assistantId: config.assistantId,
    baseUrl: input.baseUrl,
    tool: buildLeadCaptureTool(input.baseUrl),
  });
  return { ...result, widgetId: input.widget.id };
}

export async function provisionWidget(input: {
  store: VapiProvisionStore;
  fetchImpl: ProvisionFetchLike;
  widgetId: string;
  userId: string;
  baseUrl: string;
}): Promise<ProvisionResult & { widgetId: string }> {
  const widget = await input.store.findWidgetForUser(input.widgetId, input.userId);
  if (!widget) return { ok: false, widgetId: input.widgetId, error: 'Widget not found' };
  return provisionWidgetRow({
    fetchImpl: input.fetchImpl,
    widget,
    baseUrl: input.baseUrl,
  });
}

export async function provisionAllUserWidgets(input: {
  store: VapiProvisionStore;
  fetchImpl: ProvisionFetchLike;
  userId: string;
  baseUrl: string;
}): Promise<Array<ProvisionResult & { widgetId: string }>> {
  const widgets = await input.store.listUserVapiWidgets(input.userId);
  const results: Array<ProvisionResult & { widgetId: string }> = [];

  for (const widget of widgets) {
    try {
      results.push(await provisionWidgetRow({
        fetchImpl: input.fetchImpl,
        widget,
        baseUrl: input.baseUrl,
      }));
    } catch (error) {
      results.push({
        ok: false,
        widgetId: widget.id,
        error: error instanceof Error ? error.message : 'VAPI provisioning failed',
      });
    }
  }

  return results;
}
