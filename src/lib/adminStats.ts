export interface AdminSummary {
  total_users: number;
  active_subscriptions: number;
  mrr_usd: number;
  total_calls: number;
  total_minutes: number;
  total_cost_usd: number;
}

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  total_calls: number;
  total_minutes: number;
  total_cost_usd: number;
}

export interface AdminStats {
  summary: AdminSummary;
  users: AdminUserRow[];
}

interface UnknownRecord {
  [key: string]: unknown;
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseUserRow(value: unknown): AdminUserRow | null {
  const record = asRecord(value);
  const userId = stringValue(record?.user_id);
  if (!userId) return null;

  return {
    user_id: userId,
    email: stringValue(record?.email),
    plan_id: stringValue(record?.plan_id),
    subscription_status: stringValue(record?.subscription_status),
    total_calls: numberValue(record?.total_calls),
    total_minutes: numberValue(record?.total_minutes),
    total_cost_usd: numberValue(record?.total_cost_usd),
  };
}

export function parseAdminStats(value: unknown): AdminStats {
  const root = asRecord(value);
  const summary = asRecord(root?.summary);
  const users = Array.isArray(root?.users) ? root.users : [];

  return {
    summary: {
      total_users: numberValue(summary?.total_users),
      active_subscriptions: numberValue(summary?.active_subscriptions),
      mrr_usd: numberValue(summary?.mrr_usd),
      total_calls: numberValue(summary?.total_calls),
      total_minutes: numberValue(summary?.total_minutes),
      total_cost_usd: numberValue(summary?.total_cost_usd),
    },
    users: users.flatMap((user) => {
      const parsed = parseUserRow(user);
      return parsed ? [parsed] : [];
    }),
  };
}

export function measuredCostPerMinute(summary: AdminSummary): number | null {
  if (summary.total_minutes === 0) return null;
  return Math.round((summary.total_cost_usd / summary.total_minutes) * 10000) / 10000;
}
