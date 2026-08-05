import ReportsView from '../components/ReportsView';
import { useDashboardStats } from '../hooks/useDashboardStats';

const ReportingPage = () => {
  const { stats, retentionDays, loading, error, refetch } = useDashboardStats();

  return (
    <div className='py-6'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <h1 className='mb-8 text-2xl font-semibold text-ink'>Call Reports</h1>
        <ReportsView
          stats={stats}
          retentionDays={retentionDays}
          loading={loading}
          error={error}
          onRetry={() => void refetch()}
          emptyCta={{ label: 'Create a widget', to: '/widgets' }}
        />
      </div>
    </div>
  );
};

export default ReportingPage;
