import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Dashboard from './Dashboard';

const DashboardPage: React.FC = () => {
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
};

export default DashboardPage;