import React, { useState } from 'react';
import { Alert, Button, Card, Modal, Row, Skeleton, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import WidgetList from '../components/WidgetList';
import ReportsView from '../components/ReportsView';
import WidgetCreator from '../components/WidgetCreator';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useLocation, useNavigate } from 'react-router-dom';

function shortDay(value: string | number): string {
  const day = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day.slice(5, 7)}/${day.slice(8, 10)}` : day;
}

const Dashboard: React.FC = () => {
  const { stats, retentionDays, loading, error, refetch } = useDashboardStats();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get('tab') || 'overview';
  const [isCreatorVisible, setIsCreatorVisible] = useState(false);
  const [widgetsRefreshKey, setWidgetsRefreshKey] = useState(0);

  const handleTabChange = (activeKey: string) => {
    navigate(`/dashboard?tab=${activeKey}`);
  };

  const items = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <div>
          {loading ? (
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
              <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
              <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
            </div>
          ) : error && !stats ? (
            <Alert
              type='error'
              showIcon
              message='Unable to load dashboard stats'
              description={error}
              action={<Button type='primary' size='small' onClick={() => void refetch()}>Retry</Button>}
            />
          ) : (
            <>
              <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-3'>
                <Card>
                  <div className='text-center'>
                    <h3 className='mb-2 text-lg font-medium'>Total Calls</h3>
                    <p className='text-3xl font-bold'>{stats?.summary.total_calls ?? 0}</p>
                  </div>
                </Card>
                <Card>
                  <div className='text-center'>
                    <h3 className='mb-2 text-lg font-medium'>Leads Captured</h3>
                    <p className='text-3xl font-bold'>{stats?.summary.leads ?? 0}</p>
                  </div>
                </Card>
                <Card>
                  <div className='text-center'>
                    <h3 className='mb-2 text-lg font-medium'>Call Minutes</h3>
                    <p className='text-3xl font-bold'>{stats?.summary.total_minutes ?? 0} min</p>
                  </div>
                </Card>
              </div>
              <Card title='Call Volume' className='shadow-sm'>
                <div className='h-80'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={stats?.by_day ?? []}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='day' tickFormatter={shortDay} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey='calls' fill='#3B82F6' />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'widgets',
      label: 'Widgets',
      children: (
        <div>
          <Row justify="end" className="mb-6">
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsCreatorVisible(true)}
            >
              Create New Widget
            </Button>
          </Row>
          <WidgetList key={widgetsRefreshKey} />
        </div>
      ),
    },
    {
      key: 'reports',
      label: 'Reports',
      children: (
        <ReportsView
          stats={stats}
          retentionDays={retentionDays}
          loading={loading}
          error={error}
          onRetry={() => void refetch()}
          emptyCta={{ label: 'Create a widget', to: '/dashboard?tab=widgets' }}
        />
      ),
    }
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <Tabs
          activeKey={defaultTab}
          onChange={handleTabChange}
          items={items}
          className="bg-white rounded-lg shadow p-6"
        />
        <Modal
          title="Create New Widget"
          open={isCreatorVisible}
          onCancel={() => setIsCreatorVisible(false)}
          footer={null}
          width={800}
        >
          <WidgetCreator
            onSuccess={() => {
              setIsCreatorVisible(false);
              setWidgetsRefreshKey((key) => key + 1);
            }}
          />
        </Modal>
      </div>
    </div>
  );
};

export default Dashboard;
