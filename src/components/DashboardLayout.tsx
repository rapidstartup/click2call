import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  AppstoreOutlined,
  PhoneOutlined,
  BarChartOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/widgets',
      icon: <AppstoreOutlined />,
      label: 'Widgets',
    },
    {
      key: '/call-routing',
      icon: <PhoneOutlined />,
      label: 'Call Routing',
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'Reports',
    },
  ];

  const handleMenuClick = (key: string) => {
    if (key === 'logout') {
      signOut();
      navigate('/login');
    } else {
      navigate(key);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={250}
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1,
        }}
      >
        <div className="p-4">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-8 mb-6"
          />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
        />
        <Menu
          mode="inline"
          selectable={false}
          className="absolute bottom-0 w-full"
          items={[
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: 'Logout',
              danger: true,
            },
          ]}
          onClick={({ key }) => handleMenuClick(key)}
        />
      </Sider>
      <Layout>
        <Header className="bg-white px-6 flex items-center justify-between" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h1 className="text-xl font-semibold">
            {menuItems.find(item => item.key === location.pathname)?.label || 'Dashboard'}
          </h1>
        </Header>
        <Content className="m-6">
          <div className="bg-white rounded-lg min-h-full">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout; 