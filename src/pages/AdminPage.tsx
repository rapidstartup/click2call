import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Skeleton, Spin, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';

import { useIsAdmin } from '../hooks/useIsAdmin';
import {
  measuredCostPerMinute,
  parseAdminStats,
  type AdminStats,
  type AdminUserRow,
} from '../lib/adminStats';
import { formatCurrency, formatDuration } from '../lib/format';
import { supabase } from '../lib/supabase';

function statusColor(status: string | null): string {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'green';
    case 'past_due':
    case 'unpaid':
      return 'gold';
    case 'canceled':
      return 'red';
    default:
      return 'default';
  }
}

const userColumns: ColumnsType<AdminUserRow> = [
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    render: (email: string | null) => email || '—',
  },
  {
    title: 'Plan',
    dataIndex: 'plan_id',
    key: 'plan_id',
    render: (planId: string | null) => planId || '—',
  },
  {
    title: 'Status',
    dataIndex: 'subscription_status',
    key: 'subscription_status',
    render: (status: string | null) => <Tag color={statusColor(status)}>{status || 'No plan'}</Tag>,
  },
  {
    title: 'Calls',
    dataIndex: 'total_calls',
    key: 'total_calls',
  },
  {
    title: 'Minutes',
    dataIndex: 'total_minutes',
    key: 'total_minutes',
    render: (minutes: number) => formatDuration(minutes * 60),
  },
  {
    title: 'Cost',
    dataIndex: 'total_cost_usd',
    key: 'total_cost_usd',
    render: (cost: number) => formatCurrency(cost),
  },
];

const AdminPage = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);
    setStats(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_platform_stats');
      if (rpcError) throw new Error(rpcError.message);
      setStats(parseAdminStats(data));
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load platform stats');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) void loadStats();
  }, [isAdmin, loadStats]);

  if (adminLoading) {
    return <div className='flex min-h-[240px] items-center justify-center'><Spin /></div>;
  }

  if (!isAdmin) {
    return (
      <div className='py-6'>
        <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8'>
          <Card className='shadow-sm'>
             <h1 className='text-xl font-semibold text-ink'>Admin access required</h1>
             <p className='mt-2 text-sm text-muted'>Your account does not have access to platform statistics.</p>
            <Link to='/dashboard' className='mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-700'>
              Back to dashboard
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='py-6'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className='py-6'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <Alert
            type='error'
            showIcon
            message='Unable to load platform stats'
            description={error || 'No platform stats were returned'}
            action={<Button type='primary' size='small' onClick={() => void loadStats()}>Retry</Button>}
          />
        </div>
      </div>
    );
  }

  const costPerMinute = measuredCostPerMinute(stats.summary);

  return (
    <div className='py-6'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='mb-8 flex items-center justify-between'>
          <div>
           <h1 className='text-2xl font-semibold text-ink'>Admin platform dashboard</h1>
             <p className='mt-1 text-sm text-muted'>Measured usage, spend, and subscription revenue.</p>
          </div>
             <Link to='/dashboard' className='text-sm font-medium text-signal hover:text-signal/80'>
               Dashboard
             </Link>
        </div>

        <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card className='shadow-sm'><Statistic title='Total users' value={stats.summary.total_users} /></Card>
          <Card className='shadow-sm'><Statistic title='MRR' value={formatCurrency(stats.summary.mrr_usd)} /></Card>
          <Card className='shadow-sm'><Statistic title='Active subscriptions' value={stats.summary.active_subscriptions} /></Card>
          <Card className='shadow-sm'><Statistic title='Total calls' value={stats.summary.total_calls} /></Card>
          <Card className='shadow-sm'><Statistic title='Total minutes' value={stats.summary.total_minutes} suffix=' min' /></Card>
          <Card className='shadow-sm'><Statistic title='Platform spend' value={formatCurrency(stats.summary.total_cost_usd)} /></Card>
          <Card className='shadow-sm'>
            <Statistic
              title='Measured cost/min'
              value={costPerMinute === null ? '—' : costPerMinute}
              precision={costPerMinute === null ? undefined : 4}
              prefix={costPerMinute === null ? undefined : '$'}
            />
             <p className='mt-2 text-xs text-muted'>Compare this measured rate against plan prices.</p>
          </Card>
        </div>

        <Card title='Per-user usage and spend' className='shadow-sm'>
          <Table<AdminUserRow>
            rowKey='user_id'
            columns={userColumns}
            dataSource={stats.users}
            pagination={{ pageSize: 25 }}
            scroll={{ x: 650 }}
            locale={{ emptyText: 'No users found' }}
          />
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
