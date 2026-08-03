import { Alert, Button, Card, Skeleton, Tag } from 'antd';
import { Download, Filter, PhoneCall } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';

import RecordingPlayer from './RecordingPlayer';
import { formatCurrency, formatDateTime, formatDuration, recordingStatusLabel, statusBadgeTone } from '../lib/format';
import type { DashboardStats } from '../hooks/useDashboardStats';

interface ReportsViewProps {
  stats: DashboardStats | null;
  retentionDays: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyCta: { label: string; to: string };
}

type StatusTone = ReturnType<typeof statusBadgeTone>['tone'];

const statusClasses: Record<StatusTone, string> = {
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
};

function shortDay(value: string | number): string {
  const day = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day.slice(5, 7)}/${day.slice(8, 10)}` : day;
}

function outcomeLabel(value: string): string {
  return value.replace(/[_-]+/g, ' ');
}

const ReportsView = ({ stats, retentionDays, loading, error, onRetry, emptyCta }: ReportsViewProps) => {
  if (loading) {
    return (
      <div className='space-y-6'>
        <Skeleton active paragraph={{ rows: 5 }} />
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <Alert
        type='error'
        showIcon
        message='Unable to load reports'
        description={error}
        action={<Button type='primary' size='small' onClick={onRetry}>Retry</Button>}
      />
    );
  }

  if (!stats) return null;

  const warning = error ? <Alert className='mb-6' type='warning' showIcon message={error} /> : null;

  if (stats.recent.length === 0) {
    return (
      <div>
        {warning}
        <div className='flex flex-col items-center justify-center rounded-lg bg-gray-50 px-6 py-16 text-center'>
          <PhoneCall className='mb-4 h-10 w-10 text-gray-400' />
          <h2 className='text-xl font-semibold text-gray-900'>No calls yet</h2>
          <p className='mt-2 max-w-md text-sm text-gray-500'>Create a widget to start receiving calls and see your reports here.</p>
          <Link to={emptyCta.to} className='mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'>{emptyCta.label}</Link>
        </div>
      </div>
    );
  }

  return <div>{warning}
    <div className='mb-8 flex items-center justify-between'>
      <div className='flex space-x-4'>
        <button type='button' className='flex items-center rounded-lg border px-4 py-2 hover:bg-gray-50'>
          <Filter className='mr-2 h-4 w-4' />
          Filter
        </button>
        <button type='button' className='flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'>
          <Download className='mr-2 h-4 w-4' />
          Export
        </button>
      </div>
    </div>

    <div className='mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <Card title='Call Volume' className='shadow-sm'>
        <div className='h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={stats.by_day}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='day' tickFormatter={shortDay} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey='calls' fill='#3B82F6' />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title='Call Duration (minutes)' className='shadow-sm'>
        <div className='h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={stats.by_day}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='day' tickFormatter={shortDay} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type='monotone' dataKey='minutes' stroke='#3B82F6' />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>

    <Card
      title={(
        <div>
          <h2 className='text-lg font-medium'>Recent Calls</h2>
          <p className='mt-1 text-xs font-normal text-gray-500'>Recordings are retained for {retentionDays} days on your plan.</p>
        </div>
      )}
      className='shadow-sm'
    >
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Date &amp; Time</th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Duration</th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Widget</th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Outcome</th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Status</th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Cost</th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Recording</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200 bg-white'>
            {stats.recent.map((call) => {
              const badge = statusBadgeTone(call.status);
              const canPlay = call.recording_status === 'copied' && Boolean(call.recording_storage_path);
              return (
                <tr key={call.id}>
                  <td className='whitespace-nowrap px-4 py-4 text-sm text-gray-900'>{formatDateTime(call.started_at)}</td>
                  <td className='whitespace-nowrap px-4 py-4 text-sm text-gray-500'>{formatDuration(call.duration_s)}</td>
                  <td className='whitespace-nowrap px-4 py-4 text-sm text-gray-500'>{call.widget_name || 'Deleted widget'}</td>
                  <td className='whitespace-nowrap px-4 py-4 text-sm text-gray-500'>
                    {call.outcome ? <Tag color='blue'>{outcomeLabel(call.outcome)}</Tag> : '—'}
                  </td>
                  <td className='whitespace-nowrap px-4 py-4'>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[badge.tone]}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className='whitespace-nowrap px-4 py-4 text-sm text-gray-500'>{formatCurrency(call.cost_usd)}</td>
                  <td className='whitespace-nowrap px-4 py-4 text-sm text-gray-500'>
                    {canPlay && call.recording_storage_path ? (
                      <RecordingPlayer path={call.recording_storage_path} />
                    ) : (
                      <span className='text-gray-400'>{recordingStatusLabel(call.recording_status)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  </div>;
};

export default ReportsView;
