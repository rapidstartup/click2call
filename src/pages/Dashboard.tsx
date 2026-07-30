import React, { useState } from 'react';
import { Button, Card, Row, Tabs, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import WidgetList from '../components/WidgetList';
import WidgetCreator from '../components/WidgetCreator';
import { useLocation, useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
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
        <Card className="mb-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Call metrics are unavailable</h3>
            <p className="mt-2 text-gray-600">
              Call history is not available from the current backend, so no summary metrics are shown.
            </p>
          </div>
        </Card>
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
          <WidgetList refreshKey={widgetsRefreshKey} />
        </div>
      ),
    },
    {
      key: 'reports',
      label: 'Reports',
      children: (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h2 className="text-lg font-medium text-gray-900">Call reports are unavailable</h2>
          <p className="mt-2 text-gray-600">
            Call history is not available from the current backend, so no report data is shown.
          </p>
        </div>
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
          <WidgetCreator onSuccess={() => {
            setIsCreatorVisible(false);
            setWidgetsRefreshKey(currentKey => currentKey + 1);
          }} />
        </Modal>
      </div>
    </div>
  );
};

export default Dashboard;
