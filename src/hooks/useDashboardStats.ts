import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

export interface RecentCall {
  id: string;
  started_at: string;
  status: string;
  outcome: string | null;
  duration_s: number;
  cost_usd: number;
  widget_id: string | null;
  widget_name: string | null;
  recording_status: string;
  recording_storage_path: string | null;
}

export interface DashboardStats {
  summary: {
    total_calls: number;
    completed_calls: number;
    total_minutes: number;
    avg_minutes: number;
    total_cost: number;
    leads: number;
  };
  by_day: Array<{
    day: string;
    calls: number;
    minutes: number;
  }>;
  recent: RecentCall[];
}

interface UnknownRecord {
  [key: string]: unknown;
}

interface BillingDetails {
  retentionDays: number;
  planName: string | null;
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
}

function errorValue(value: unknown, fallback: string): string {
  const record = asRecord(value);
  return stringValue(record?.error) || fallback;
}

function parseRecentCall(value: unknown, index: number): RecentCall {
  const record = asRecord(value);
  return {
    id: stringValue(record?.id) || `recent-call-${index}`,
    started_at: stringValue(record?.started_at) || '',
    status: stringValue(record?.status) || 'unknown',
    outcome: stringValue(record?.outcome),
    duration_s: numberValue(record?.duration_s),
    cost_usd: numberValue(record?.cost_usd),
    widget_id: stringValue(record?.widget_id),
    widget_name: stringValue(record?.widget_name),
    recording_status: stringValue(record?.recording_status) || 'none',
    recording_storage_path: stringValue(record?.recording_storage_path),
  };
}

function parseDashboardStats(value: unknown): DashboardStats {
  const root = asRecord(value);
  const summary = asRecord(root?.summary);
  const byDay = Array.isArray(root?.by_day) ? root.by_day : [];
  const recent = Array.isArray(root?.recent) ? root.recent : [];

  return {
    summary: {
      total_calls: numberValue(summary?.total_calls),
      completed_calls: numberValue(summary?.completed_calls),
      total_minutes: numberValue(summary?.total_minutes),
      avg_minutes: numberValue(summary?.avg_minutes),
      total_cost: numberValue(summary?.total_cost),
      leads: numberValue(summary?.leads),
    },
    by_day: byDay.flatMap((entry) => {
      const record = asRecord(entry);
      const day = stringValue(record?.day);
      return day ? [{
        day,
        calls: numberValue(record?.calls),
        minutes: numberValue(record?.minutes),
      }] : [];
    }),
    recent: recent.map(parseRecentCall),
  };
}

async function loadBillingDetails(): Promise<BillingDetails> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in required');

  const response = await fetch('/api/billing', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const payload = await response.json() as unknown;
  const payloadRecord = asRecord(payload);
  if (!response.ok) {
    throw new Error(errorValue(payload, 'Unable to load billing summary'));
  }

  const plan = asRecord(payloadRecord?.plan);
  return {
    retentionDays: numberValue(payloadRecord?.recording_retention_days) || 7,
    planName: stringValue(plan?.name),
  };
}

function rpcErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === 'PGRST202') {
    return 'The recording/analytics migration may not be applied.';
  }
  return error.message || 'Unable to load dashboard stats';
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [retentionDays, setRetentionDays] = useState(7);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStats(null);
    setRetentionDays(7);
    setPlanName(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sign in required');

      const { data, error: rpcError } = await supabase.rpc('get_dashboard_stats', {
        p_user_id: user.id,
      });
      if (rpcError) throw new Error(rpcErrorMessage(rpcError));

      setStats(parseDashboardStats(data));

      try {
        const billing = await loadBillingDetails();
        setRetentionDays(billing.retentionDays);
        setPlanName(billing.planName);
      } catch (billingError: unknown) {
        setError(billingError instanceof Error ? billingError.message : 'Unable to load billing summary');
      }
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    stats,
    retentionDays,
    planName,
    loading,
    error,
    refetch,
  };
}
