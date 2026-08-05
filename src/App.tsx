import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage.tsx';
import PricingPage from './pages/PricingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import OnboardingPage from './pages/OnboardingPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import WidgetManagementPage from './pages/WidgetManagementPage.tsx';
import CallRoutingPage from './pages/CallRoutingPage.tsx';
import ReportingPage from './pages/ReportingPage.tsx';
import BillingPage from './pages/BillingPage.tsx';
import EmbedWidgetPage from './pages/EmbedWidgetPage.tsx';
import LeadsPage from './pages/LeadsPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import DashboardLayout from './components/DashboardLayout.tsx';
import { useIsAdmin } from './hooks/useIsAdmin';

const FullPageSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Spin size="large" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return <FullPageSpinner />;
  }

  if (!isAdmin) {
    return <Navigate to='/dashboard' />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/embed/:widgetId" element={<EmbedWidgetPage />} />

          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/widgets" element={
            <ProtectedRoute>
              <WidgetManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/call-routing" element={
            <ProtectedRoute>
              <DashboardLayout>
                <CallRoutingPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ReportingPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path='/leads' element={
            <ProtectedRoute>
              <DashboardLayout>
                <LeadsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path='/billing' element={
            <ProtectedRoute>
              <DashboardLayout>
                <BillingPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path='/admin' element={
            <ProtectedRoute>
              <AdminRoute>
                <DashboardLayout>
                  <AdminPage />
                </DashboardLayout>
              </AdminRoute>
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
