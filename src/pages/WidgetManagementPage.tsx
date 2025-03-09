import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import WidgetCreator from '../components/WidgetCreator';
import WidgetList from '../components/WidgetList';
import { Tabs } from 'antd';

const WidgetManagementPage: React.FC = () => {
  const items = [
    {
      key: 'list',
      label: 'My Widgets',
      children: <WidgetList />,
    },
    {
      key: 'create',
      label: 'Create Widget',
      children: <WidgetCreator />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <Tabs
          defaultActiveKey="list"
          items={items}
          className="bg-white rounded-lg"
        />
      </div>
    </DashboardLayout>
  );
};

export default WidgetManagementPage;