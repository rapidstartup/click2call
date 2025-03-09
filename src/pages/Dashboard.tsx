import React from 'react';
import { Button, Card, Row, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import WidgetCreator from '../components/WidgetCreator';
import WidgetList from '../components/WidgetList';

const Dashboard: React.FC = () => {
  const items = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Total Calls</h3>
              <p className="text-3xl font-bold">0</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Active Widgets</h3>
              <p className="text-3xl font-bold">0</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Call Duration</h3>
              <p className="text-3xl font-bold">0 min</p>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: 'widgets',
      label: 'Widgets',
      children: (
        <div>
          <Row justify="end" className="mb-6">
            <Button type="primary" icon={<PlusOutlined />}>
              Create New Widget
            </Button>
          </Row>
          <WidgetList />
        </div>
      ),
    },
    {
      key: 'create',
      label: 'Create Widget',
      children: <WidgetCreator />,
    },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <Tabs
          defaultActiveKey="overview"
          items={items}
          className="bg-white rounded-lg shadow p-6"
        />
      </div>
    </div>
  );
};

export default Dashboard; 