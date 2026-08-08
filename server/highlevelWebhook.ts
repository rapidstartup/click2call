interface RecordValue {
  [key: string]: unknown;
}

interface SupabaseErrorLike {
  message?: string;
}

interface SupabaseClientLike {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
}

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RecordValue;
}

function firstString(...values: unknown[]): string | null {
  const value = values.find((candidate): candidate is string => (
    typeof candidate === 'string' && candidate.trim().length > 0
  ));
  return value?.trim() || null;
}

// Not empirically verified against a real uninstall event yet (unlike the
// OAuth flow) — HighLevel's exact event `type` string for app/location
// uninstall is unconfirmed. Matches case-insensitively against the common
// naming conventions their other webhook docs use elsewhere
// (UNINSTALL / APP_UNINSTALL / LocationUninstall-style) so a real event is
// likely to match without a code change, but trigger a real test uninstall
// against the dev app and check this before relying on it in production.
const UNINSTALL_TYPE_PATTERN = /uninstall/i;

export interface HighlevelWebhookEvent {
  type: string;
  locationId: string | null;
}

export function parseHighlevelWebhookEvent(body: unknown): HighlevelWebhookEvent | null {
  const record = asRecord(body);
  if (!record) return null;

  const type = firstString(record.type, record.eventType, record.event);
  if (!type) return null;

  const locationId = firstString(
    record.locationId,
    record.location_id,
    asRecord(record.location)?.id,
  );

  return { type, locationId };
}

export function isUninstallEvent(event: HighlevelWebhookEvent): boolean {
  return UNINSTALL_TYPE_PATTERN.test(event.type);
}

export interface HighlevelWebhookStore {
  deleteConnectionByLocation(locationId: string): Promise<boolean>;
}

export function createHighlevelWebhookStore(client: unknown): HighlevelWebhookStore {
  const supabase = client as SupabaseClientLike;

  return {
    async deleteConnectionByLocation(locationId) {
      const { error } = await supabase.rpc('delete_highlevel_connection_by_location', {
        p_location_id: locationId,
      });
      return !error;
    },
  };
}

export type HandleHighlevelWebhookResult =
  | { kind: 'uninstalled'; locationId: string }
  | { kind: 'ignored'; reason: string };

export async function handleHighlevelWebhook(input: {
  store: HighlevelWebhookStore;
  body: unknown;
}): Promise<HandleHighlevelWebhookResult> {
  const event = parseHighlevelWebhookEvent(input.body);
  if (!event) return { kind: 'ignored', reason: 'Unrecognized payload' };
  if (!isUninstallEvent(event)) return { kind: 'ignored', reason: `Not an uninstall event: ${event.type}` };
  if (!event.locationId) return { kind: 'ignored', reason: 'Uninstall event missing locationId' };

  await input.store.deleteConnectionByLocation(event.locationId);
  return { kind: 'uninstalled', locationId: event.locationId };
}
