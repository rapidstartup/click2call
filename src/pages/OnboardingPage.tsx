import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Steps, message } from 'antd';
import { CheckCircleOutlined, CopyOutlined } from '@ant-design/icons';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { embedCode } from '../lib/format';
import WidgetCreator from '../components/WidgetCreator';

interface CreatedWidget {
  id: string;
  name: string;
}

const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(
    (user?.user_metadata?.business_name as string | undefined) || ''
  );
  const [savingName, setSavingName] = useState(false);
  const [createdWidget, setCreatedWidget] = useState<CreatedWidget | null>(null);

  const goToDashboard = () => navigate('/dashboard');

  const handleSaveBusinessName = async () => {
    setSavingName(true);
    try {
      if (businessName.trim()) {
        const { error } = await supabase.auth.updateUser({
          data: { business_name: businessName.trim() },
        });
        if (error) throw error;
      }
      setStep(1);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save business name');
    } finally {
      setSavingName(false);
    }
  };

  const handleWidgetCreated = (widget: CreatedWidget) => {
    setCreatedWidget(widget);
    setStep(2);
  };

  const handleCopyEmbed = async () => {
    if (!createdWidget) return;
    await navigator.clipboard.writeText(embedCode(createdWidget.id));
    message.success('Embed code copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-surface py-xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
           <h1 className="text-2xl font-semibold text-ink">Welcome to Click2Call</h1>
           <button
             type="button"
             onClick={goToDashboard}
             className="text-sm font-medium text-muted hover:text-ink"
          >
            Skip for now
          </button>
        </div>

         <div className="rounded-card bg-paper p-6 shadow sm:p-8">
          <Steps
            current={step}
            className="mb-8"
            items={[
              { title: 'Your account' },
              { title: 'Create a widget' },
              { title: 'Install it' },
            ]}
          />

          {step === 0 && (
            <div>
               <h2 className="text-lg font-medium text-ink">What should we call your business?</h2>
               <p className="mt-1 text-sm text-muted">
                This helps us personalize your dashboard. You can change it later.
              </p>
              <div className="mt-6 max-w-md">
                <label htmlFor="business-name" className="block text-sm font-medium text-gray-700">
                  Business name
                </label>
                <Input
                  id="business-name"
                  className="mt-1"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Acme Inc."
                  onPressEnter={() => void handleSaveBusinessName()}
                />
              </div>
              <div className="mt-8 flex items-center gap-3">
                <Button type="primary" loading={savingName} onClick={() => void handleSaveBusinessName()}>
                  Continue
                </Button>
                <Button type="text" onClick={() => setStep(1)}>
                  Skip this step
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
               <h2 className="mb-1 text-lg font-medium text-ink">Create your first widget</h2>
               <p className="mb-4 text-sm text-muted">
                Set up how calls to your business should be routed. You can add more widgets anytime.
              </p>
              <WidgetCreator onSuccess={handleWidgetCreated} />
              <div className="mt-4">
                <Button type="text" onClick={goToDashboard}>
                  I'll do this later
                </Button>
              </div>
            </div>
          )}

          {step === 2 && createdWidget && (
            <div>
               <div className="flex items-center gap-2 text-success">
                 <CheckCircleOutlined />
                 <h2 className="text-lg font-medium text-ink">
                  “{createdWidget.name}” is ready
                </h2>
              </div>
               <p className="mt-2 text-sm text-muted">
                 Paste this snippet before the closing <code>&lt;/body&gt;</code> tag of your site to
                 start receiving calls.
               </p>
               <div className="mt-4 rounded-control bg-ink p-4">
                 <code className="block whitespace-pre-wrap break-all text-xs text-paper">
                  {embedCode(createdWidget.id)}
                </code>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button icon={<CopyOutlined />} onClick={() => void handleCopyEmbed()}>
                  Copy embed code
                </Button>
                <Button type="primary" onClick={goToDashboard}>
                  Go to dashboard
                </Button>
              </div>
            </div>
          )}
        </div>

         <p className="mt-6 text-center text-sm text-muted">
           Need help? <Link to="/dashboard" className="font-medium text-signal hover:text-signal/80">Head to your dashboard</Link> anytime.
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;
