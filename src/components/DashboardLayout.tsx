import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  AppstoreOutlined,
  PhoneOutlined,
  BarChartOutlined,
  ContactsOutlined,
  CreditCardOutlined,
  FundOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useIsAdmin } from '../hooks/useIsAdmin';

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const MOBILE_BREAKPOINT = 'md';

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    {
      key: '/leads',
      icon: <ContactsOutlined />,
      label: 'Leads',
    },
    {
      key: '/billing',
      icon: <CreditCardOutlined />,
      label: 'Billing',
    },
    ...(isAdmin ? [{
      key: '/admin',
      icon: <FundOutlined />,
      label: 'Admin',
    }] : []),
  ];

  const handleMenuClick = (key: string) => {
    if (key === 'logout') {
      signOut();
      navigate('/login');
    } else {
      navigate(key);
      if (isMobile) setCollapsed(true);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }} hasSider>
      <Sider
        theme="light"
        width={196}
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        breakpoint={MOBILE_BREAKPOINT}
        onBreakpoint={(broken) => setIsMobile(broken)}
        collapsedWidth={0}
        trigger={null}
        style={{
          borderRight: '1px solid var(--color-border)',
          zIndex: 10,
        }}
      >
        <div
          className="p-4 mb-2 flex items-center gap-2"
          role="img"
          aria-label="click2call"
        >
          {/* Inline SVG, not <img src>, so this can never 404 into a broken-image
              icon and inherits `currentColor` / CSS custom properties, so it
              stays correct in both light and dark surfaces without a second
              asset. See DESIGN.md > Aesthetic Direction ("a modern telephone
              exchange... hard rules") and Color (signal red reserved for a
              single meaningful accent) — the mark is an ink handset with one
              signal-red "live connection" dot; no gradients, no blobs. A
              static twin lives at public/logo.svg for any non-React usage. */}
          <svg
            viewBox="0 0 32 32"
            width="26"
            height="26"
            className="shrink-0 text-ink"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M13 13C16.5 7 25 15.5 19 19"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="9" cy="9" r="6" fill="currentColor" />
            <circle cx="23" cy="23" r="6" fill="currentColor" />
            <circle cx="13.5" cy="4.5" r="3" fill="var(--color-signal)" />
          </svg>
          <span className="font-display text-lede font-semibold text-ink leading-none">
            click2call
          </span>
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
        <Header
          className="bg-surface px-6 flex items-center gap-4 justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label={collapsed ? 'Open menu' : 'Close menu'}
              onClick={() => setCollapsed(!collapsed)}
              className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-surface-strong hover:text-ink"
            >
              <MenuOutlined />
            </button>
            <h1 className="text-lede font-semibold text-ink">
              {menuItems.find(item => item.key === location.pathname)?.label || 'Dashboard'}
            </h1>
          </div>
        </Header>
        <Content className="m-6">
          <div className="bg-surface rounded-card min-h-full">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
