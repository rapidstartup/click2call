interface PublicVapiConfig {
  assistantId: string;
}

export interface ServerVapiConfig extends PublicVapiConfig {
  apiKey: string;
}

function readServerVapiConfig(settings: unknown): ServerVapiConfig | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const record = settings as Record<string, unknown>;
  const apiKey = typeof record.vapi_api_key === 'string' ? record.vapi_api_key.trim() : '';
  const assistantId = typeof record.vapi_assistant_id === 'string' ? record.vapi_assistant_id.trim() : '';
  if (!apiKey || !assistantId) return null;

  return {
    assistantId,
    apiKey,
  };
}

// VAPI does not document a key-format invariant that can distinguish public
// keys from private API keys. Keep the provider credential server-side and
// expose only the assistant ID to the browser; the server proxy uses the full
// config internally when it creates the VAPI web call.
export function toPublicVapiConfig(settings: unknown): PublicVapiConfig | null {
  const serverConfig = readServerVapiConfig(settings);
  return serverConfig ? { assistantId: serverConfig.assistantId } : null;
}

export function toServerVapiConfig(settings: unknown): ServerVapiConfig | null {
  return readServerVapiConfig(settings);
}

export function canUseWidget(authorizedWidgetId: unknown, requestedWidgetId: unknown): boolean {
  return typeof authorizedWidgetId === 'string'
    && typeof requestedWidgetId === 'string'
    && authorizedWidgetId === requestedWidgetId;
}
