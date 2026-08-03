import { extractVapiCallId } from './vapiProxy';
import type { EmailMessage, EmailSender } from './email';

interface RecordValue {
  [key: string]: unknown;
}

interface SupabaseErrorLike {
  message?: string;
}

interface SupabaseQueryLike extends PromiseLike<{
  data: unknown;
  error: SupabaseErrorLike | null;
}> {
  eq(column: string, value: unknown): SupabaseQueryLike;
  insert(values: Record<string, unknown>): SupabaseQueryLike;
  maybeSingle<T = unknown>(): Promise<{ data: T | null; error: SupabaseErrorLike | null }>;
  select(columns?: string): SupabaseQueryLike;
  update(values: Record<string, unknown>): SupabaseQueryLike;
}

interface SupabaseClientLike {
  from(table: string): SupabaseQueryLike;
  auth: {
    admin: {
      getUserById(userId: string): Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
    };
  };
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

function stringArg(args: Record<string, unknown>, key: string): string | null {
  return firstString(args[key]);
}

function numberArg(args: Record<string, unknown>, key: string): number | null {
  const value = args[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface LeadEscalationPayload {
  apiKey: string;
  assistantId: string;
  vapiCallId: string;
  args: Record<string, unknown>;
}

export function parseEscalationPayload(
  body: unknown,
  authorization: string | undefined,
): LeadEscalationPayload | null {
  const record = asRecord(body);
  const tokenMatch = authorization?.trim().match(/^Bearer\s+(\S+)$/i);
  const apiKey = firstString(tokenMatch?.[1]);
  const call = asRecord(record?.call);
  const assistantId = firstString(call?.assistantId);
  const vapiCallId = firstString(record?.vapiCallId) || extractVapiCallId(record);
  const args = asRecord(record?.toolArgs) || asRecord(record?.arguments) || {};

  if (!apiKey || !assistantId || !vapiCallId) return null;
  return { apiKey, assistantId, vapiCallId, args };
}

export interface EscalationWidget {
  id: string;
  user_id: string;
}

export interface LeadEscalationStore {
  findEscalationWidget(assistantId: string, apiKey: string): Promise<EscalationWidget | null>;
  setCallOutcome(vapiCallId: string, outcome: string): Promise<boolean>;
  insertLead(row: {
    user_id: string;
    widget_id: string;
    call_id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    message: string | null;
    intent_score: number | null;
    outcome: string | null;
    source: string;
  }): Promise<string | null>;
  markLeadEmailDelivered(leadId: string): Promise<boolean>;
  findOwnerEmail(userId: string): Promise<string | null>;
}

export function createLeadEscalationStore(client: unknown): LeadEscalationStore {
  const supabase = client as SupabaseClientLike;

  return {
    async findEscalationWidget(assistantId, apiKey) {
      const { data, error } = await supabase
        .from('widgets')
        .select('id, user_id')
        .eq('settings->>vapi_assistant_id', assistantId)
        .eq('settings->>vapi_api_key', apiKey)
        .maybeSingle<RecordValue>();
      if (error || !data) return null;

      const id = firstString(data.id);
      const userId = firstString(data.user_id);
      return id && userId ? { id, user_id: userId } : null;
    },

    async setCallOutcome(vapiCallId, outcome) {
      const { data, error } = await supabase
        .from('calls')
        .update({ outcome })
        .eq('vapi_call_id', vapiCallId)
        .select('id');
      return !error && Array.isArray(data) && data.length > 0;
    },

    async insertLead(row) {
      let callId: string | null = null;
      if (row.call_id) {
        try {
          const callResult = await supabase
            .from('calls')
            .select('id')
            .eq('vapi_call_id', row.call_id)
            .maybeSingle<RecordValue>();
          if (!callResult.error && callResult.data) callId = firstString(callResult.data.id);
        } catch (error) {
          console.error(
            'Lead call lookup failed:',
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }

      const { data, error } = await supabase
        .from('leads')
        .insert({ ...row, call_id: callId })
        .select('id')
        .maybeSingle<RecordValue>();
      if (error || !data) return null;
      return firstString(data.id);
    },

    async markLeadEmailDelivered(leadId) {
      const { error } = await supabase
        .from('leads')
        .update({ email_delivered_at: new Date().toISOString() })
        .eq('id', leadId);
      return !error;
    },

    async findOwnerEmail(userId) {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) return null;
      const user = asRecord(asRecord(data)?.user);
      return firstString(user?.email);
    },
  };
}

export interface EscalateLeadInput {
  store: LeadEscalationStore;
  payload: LeadEscalationPayload;
  widget: EscalationWidget;
  sendEmail: EmailSender;
  now?: () => Date;
}

function leadEmailMessage(
  ownerEmail: string,
  name: string | null,
  email: string | null,
  phone: string | null,
  message: string | null,
  intentScore: number | null,
  outcome: string | null,
  now: () => Date,
): EmailMessage {
  const capturedAt = now().toISOString();
  const lines = [
    'A new lead was captured by Click2Call.',
    '',
    'Name: ' + (name || 'Not provided'),
    'Email: ' + (email || 'Not provided'),
    'Phone: ' + (phone || 'Not provided'),
    'Message: ' + (message || 'Not provided'),
    'Intent score: ' + (intentScore === null ? 'Not provided' : String(intentScore)),
    'Outcome: ' + (outcome || 'Not provided'),
    'Captured at: ' + capturedAt,
  ];
  return {
    to: ownerEmail,
    from: 'noreply@click2call.ai',
    subject: 'New lead captured',
    text: lines.join('\r\n'),
  };
}

export async function escalateLead(
  input: EscalateLeadInput,
): Promise<{ result: string }> {
  const outcome = stringArg(input.payload.args, 'outcome');
  const name = stringArg(input.payload.args, 'name');
  const email = stringArg(input.payload.args, 'email');
  const phone = stringArg(input.payload.args, 'phone');
  const message = stringArg(input.payload.args, 'message');
  const intentScore = numberArg(input.payload.args, 'intent_score');

  if (outcome) await input.store.setCallOutcome(input.payload.vapiCallId, outcome);
  if (!name && !email && !phone) return { result: 'No lead contact provided' };

  let leadId: string | null = null;
  try {
    leadId = await input.store.insertLead({
      user_id: input.widget.user_id,
      widget_id: input.widget.id,
      call_id: input.payload.vapiCallId,
      name,
      email,
      phone,
      message,
      intent_score: intentScore,
      outcome,
      source: 'vapi',
    });
  } catch (error) {
    console.error(
      'Lead insert failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }

  if (!leadId) {
    console.error('Lead insert failed: no lead id returned');
    return { result: 'Lead received; lead persistence failed' };
  }

  let ownerEmail: string | null = null;
  try {
    ownerEmail = await input.store.findOwnerEmail(input.widget.user_id);
  } catch (error) {
    console.error(
      'Lead owner lookup failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
  if (!ownerEmail) return { result: 'Lead recorded; email skipped: owner email unavailable' };

  let emailResult: { delivered: boolean; reason?: string };
  try {
    emailResult = await input.sendEmail(leadEmailMessage(
      ownerEmail,
      name,
      email,
      phone,
      message,
      intentScore,
      outcome,
      input.now || (() => new Date()),
    ));
  } catch (error) {
    emailResult = {
      delivered: false,
      reason: error instanceof Error ? error.message : 'Email delivery failed',
    };
  }

  if (!emailResult.delivered) {
    return {
      result: 'Lead recorded; email skipped: ' + (emailResult.reason || 'Email delivery failed'),
    };
  }

  try {
    await input.store.markLeadEmailDelivered(leadId);
  } catch (error) {
    console.error(
      'Lead email status update failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
  return { result: 'Lead recorded; email sent' };
}
