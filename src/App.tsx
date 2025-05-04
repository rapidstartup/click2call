import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StreamVideo } from '@stream-io/video-react-sdk';
import { createGuestUser, createStreamVideoClient } from './lib/streamVideo';
import LandingPage from './pages/LandingPage.tsx';
import PricingPage from './pages/PricingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import WidgetManagementPage from './pages/WidgetManagementPage.tsx';
import CallRoutingPage from './pages/CallRoutingPage.tsx';
import ReportingPage from './pages/ReportingPage.tsx';
import WidgetPage from './pages/WidgetPage.tsx';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// Create a guest user and client instance
const guestUser = createGuestUser();
const streamClient = createStreamVideoClient(guestUser);

function App() {
  return (
    <AuthProvider>
      <StreamVideo client={streamClient}>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Widget Public Page - No Auth Required */}
            <Route path="/widget/:id" element={<WidgetPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/widgets" element={
              <ProtectedRoute>
                <WidgetManagementPage />
              </ProtectedRoute>
            } />
            <Route path="/call-routing" element={
              <ProtectedRoute>
                <CallRoutingPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <ReportingPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </StreamVideo>
    </AuthProvider>
  );
}

export default App;
