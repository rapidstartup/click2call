interface PublicVapiConfig {
  assistantId: string;
  publicKey: string;
}

export function toPublicVapiConfig(settings: unknown): PublicVapiConfig | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const record = settings as Record<string, unknown>;
  const publicKey = typeof record.vapi_public_key === 'string' ? record.vapi_public_key.trim() : '';
  const privateKey = typeof record.vapi_api_key === 'string' ? record.vapi_api_key.trim() : '';
  const assistantId = typeof record.vapi_assistant_id === 'string' ? record.vapi_assistant_id.trim() : '';
  if (
    !publicKey
    || !assistantId
    || publicKey === privateKey
  ) {
    return null;
  }

  return {
    assistantId,
    publicKey,
  };
}

export function canUseWidget(authorizedWidgetId: unknown, requestedWidgetId: unknown): boolean {
  return typeof authorizedWidgetId === 'string'
    && typeof requestedWidgetId === 'string'
    && authorizedWidgetId === requestedWidgetId;
}
