import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WidgetManagementPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the dashboard widgets tab
    navigate('/dashboard?tab=widgets');
  }, [navigate]);

  return null;
};

export default WidgetManagementPage;