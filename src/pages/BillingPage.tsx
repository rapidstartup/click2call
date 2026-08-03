import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CreditCard, Gauge, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '../lib/supabase';

interface BillingSummary {
  allowance_seconds: number;
  current_period_end: string | null;
  plan: {
    id: string;
    minutes_allowance: number;
    name: string;
  };
  subscription_status: string | null;
  used_seconds: number;
}

interface BillingResponse extends Partial<BillingSummary> {
  error?: unknown;
}

interface PortalResponse {
  error?: unknown;
  url?: unknown;
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  canceled: 'Canceled',
  past_due: 'Past due',
  trialing: 'Trialing',
  unpaid: 'Past due',
};

function statusLabel(status: string | null): string {
  if (!status) return 'Free';
  return statusLabels[status] || 'Unknown';
}

function formatPeriodEnd(value: string | null): string {
  if (!value) return 'No active subscription';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No active subscription';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function formatMinutes(seconds: number): string {
  return String(Math.round((seconds / 60) * 10) / 10);
}

const BillingPage = () => {
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticatedFetch = useCallback(async (input: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in required');
    return fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...init?.headers,
      },
    });
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (!query.has('session_id')) return;
    setShowSuccess(true);
    window.history.replaceState({}, '', '/billing');
  }, []);

  const loadBilling = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch('/api/billing');
      const payload = await response.json() as BillingResponse;
      if (!response.ok || !payload.plan || typeof payload.allowance_seconds !== 'number') {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Unable to load billing');
      }
      setBilling(payload as BillingSummary);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load billing');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const manageBilling = async () => {
    setIsManaging(true);
    setError(null);
    try {
      const response = await authenticatedFetch('/api/billing', { method: 'POST' });
      const payload = await response.json() as PortalResponse;
      if (!response.ok || typeof payload.url !== 'string') {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Unable to open billing portal');
      }
      window.location.href = payload.url;
    } catch (portalError: unknown) {
      setError(portalError instanceof Error ? portalError.message : 'Unable to open billing portal');
      setIsManaging(false);
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-100 py-6'>
        <div className='flex items-center justify-center gap-2 text-gray-600'>
          <Loader2 className='h-5 w-5 animate-spin' />
          Loading billing...
        </div>
      </div>
    );
  }

  if (error && !billing) {
    return (
      <div className='min-h-screen bg-gray-100 py-6'>
        <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700'>
            <AlertCircle className='h-5 w-5 shrink-0' />
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!billing) return null;

  const activeSubscription = ['active', 'trialing', 'past_due', 'unpaid']
    .includes(billing.subscription_status || '');
  const usagePercent = billing.allowance_seconds > 0
    ? Math.min((billing.used_seconds / billing.allowance_seconds) * 100, 100)
    : 0;
  const allowanceExhausted = billing.allowance_seconds > 0
    && billing.used_seconds >= billing.allowance_seconds;

  return (
    <div className='min-h-screen bg-gray-100 py-6'>
      <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8'>
        <div className='mb-8 flex items-center justify-between'>
          <h1 className='text-2xl font-semibold text-gray-900'>Billing</h1>
          <Link to='/dashboard' className='text-sm font-medium text-blue-600 hover:text-blue-700'>
            Dashboard
          </Link>
        </div>

        {showSuccess && (
          <div className='mb-6 rounded-lg bg-green-50 p-4 text-sm font-medium text-green-700'>
            Payment successful — your plan is active
          </div>
        )}
        {error && (
          <div className='mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700'>
            <AlertCircle className='h-5 w-5 shrink-0' />
            {error}
          </div>
        )}

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <div className='rounded-lg bg-white p-6 shadow'>
            <div className='mb-6 flex items-start justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-500'>Current plan</p>
                <h2 className='mt-1 text-2xl font-semibold text-gray-900'>{billing.plan.name}</h2>
              </div>
              <CreditCard className='h-6 w-6 text-blue-600' />
            </div>
            <div className='space-y-4 text-sm'>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-gray-500'>Subscription status</span>
                <span className='rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700'>
                  {statusLabel(billing.subscription_status)}
                </span>
              </div>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-gray-500'>Period end</span>
                <span className='font-medium text-gray-900'>
                  {formatPeriodEnd(billing.current_period_end)}
                </span>
              </div>
            </div>
            <div className='mt-6'>
              {activeSubscription ? (
                <button
                  type='button'
                  onClick={() => void manageBilling()}
                  disabled={isManaging}
                  className='flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {isManaging && <Loader2 className='h-4 w-4 animate-spin' />}
                  {isManaging ? 'Opening portal...' : 'Manage billing'}
                </button>
              ) : (
                <Link
                  to='/pricing'
                  className='flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700'
                >
                  View plans
                  <ArrowRight className='h-4 w-4' />
                </Link>
              )}
            </div>
          </div>
          <div className='rounded-lg bg-white p-6 shadow'>
            <div className='mb-6 flex items-start justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-500'>Usage</p>
                <h2 className='mt-1 text-2xl font-semibold text-gray-900'>Monthly calls</h2>
              </div>
              <Gauge className='h-6 w-6 text-blue-600' />
            </div>
            <div className='flex items-baseline justify-between gap-4'>
              <p className='text-sm text-gray-600'>
                <span className='font-semibold text-gray-900'>{formatMinutes(billing.used_seconds)}</span>
                {' '}minutes used of{' '}
                <span className='font-semibold text-gray-900'>{formatMinutes(billing.allowance_seconds)}</span>
                {' '}minutes
              </p>
              <span className='text-sm font-medium text-gray-500'>{Math.round(usagePercent)}%</span>
            </div>
            <div className='mt-3 h-3 overflow-hidden rounded-full bg-gray-200'>
              <div
                className='h-full rounded-full transition-all'
                style={{ width: `${usagePercent}%`, backgroundColor: '#3B82F6' }}
              />
            </div>
            {allowanceExhausted && (
              <p className='mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800'>
                Your monthly allowance is exhausted — upgrade to keep calls flowing
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
