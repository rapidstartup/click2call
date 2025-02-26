import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.tsx';
import PricingPage from './pages/PricingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import WidgetManagementPage from './pages/WidgetManagementPage.tsx';
import CallRoutingPage from './pages/CallRoutingPage.tsx';
import ReportingPage from './pages/ReportingPage.tsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/widgets" element={<WidgetManagementPage />} />
        <Route path="/call-routing" element={<CallRoutingPage />} />
        <Route path="/reports" element={<ReportingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
