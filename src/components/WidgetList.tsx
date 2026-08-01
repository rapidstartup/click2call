import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Input, message, Modal, Space, Spin, Tooltip } from 'antd';
import { CopyOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';

import { supabase } from '../lib/supabase';
import { WidgetType } from './WidgetCreator';

interface Widget {
  allowed_origins: string[];
  created_at: string;
  destination: string;
  id: string;
  name: string;
  needs_allowed_origins: boolean;
  needs_vapi_public_key: boolean;
  type: WidgetType;
}

function embedCode(widgetId: string): string {
  return `<script src="https://click2call.ai/widget.js" data-widget-id="${widgetId}" async></script>`;
}

const WidgetList: React.FC = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [publicKey, setPublicKey] = useState('');
  const [allowedOrigins, setAllowedOrigins] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const authenticatedFetch = useCallback(async (input: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in required');
    return fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...init?.headers,
      },
    });
  }, []);

  const loadWidgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/widgets');
      const payload = await response.json() as Widget[] | { error?: string };
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(!Array.isArray(payload) && payload.error ? payload.error : 'Failed to load widgets');
      }
      setWidgets(payload);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to load widgets');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    void loadWidgets();
  }, [loadWidgets]);

  const handleCopyCode = async (widget: Widget) => {
    await navigator.clipboard.writeText(embedCode(widget.id));
    message.success('Widget code copied to clipboard!');
  };

  const handleDeleteWidget = (widget: Widget) => {
    Modal.info({
      title: 'Delete Widget',
      content: `Deletion is not available yet. “${widget.name}” was not changed.`,
    });
  };

  const handleSavePublicKey = async () => {
    if (!selectedWidget || (!publicKey.trim() && !allowedOrigins.trim())) return;
    setIsSaving(true);
    try {
      const response = await authenticatedFetch('/api/widgets', {
        method: 'PATCH',
        body: JSON.stringify({
          widget_id: selectedWidget.id,
          ...(publicKey.trim() ? { vapi_public_key: publicKey.trim() } : {}),
          ...(allowedOrigins.trim() ? {
            allowed_origins: allowedOrigins.split(/[\n,]/).map((origin) => origin.trim()).filter(Boolean),
          } : {}),
        }),
      });
      const payload = await response.json() as Widget | { error?: string };
      if (!response.ok) throw new Error('error' in payload && payload.error ? payload.error : 'Failed to update widget');
      message.success('VAPI security settings saved');
      setSelectedWidget(null);
      setPublicKey('');
      setAllowedOrigins('');
      await loadWidgets();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to update widget');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-10"><Spin /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="mb-6 text-2xl font-semibold">Your Widgets</h2>
      {widgets.some((widget) => widget.needs_vapi_public_key || widget.needs_allowed_origins) && (
        <Alert
          type="warning"
          showIcon
          message="VAPI security setup required"
          description="One or more existing VAPI widgets need a browser-safe public key or an allowed website origin before they can receive public calls. Private API keys are never sent to callers."
        />
      )}

      {widgets.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center"><p className="text-gray-500">No widgets created yet</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget) => (
            <Card key={widget.id} className="shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">{widget.name}</h3>
                  <p className="text-sm capitalize text-gray-500">{widget.type}</p>
                  <p className="text-sm text-gray-500">{widget.destination}</p>
                  {widget.needs_vapi_public_key && <p className="mt-2 text-xs font-medium text-amber-700">Public key required</p>}
                  {widget.needs_allowed_origins && <p className="mt-1 text-xs font-medium text-amber-700">Allowed website required</p>}
                </div>
                <Space>
                  <Tooltip title="Copy embed code"><Button icon={<CopyOutlined />} onClick={() => void handleCopyCode(widget)} /></Tooltip>
                  <Tooltip title="Widget settings"><Button icon={<SettingOutlined />} onClick={() => {
                    setSelectedWidget(widget);
                    setAllowedOrigins(widget.allowed_origins.join('\n'));
                  }} /></Tooltip>
                  <Tooltip title="Delete widget"><Button icon={<DeleteOutlined />} danger onClick={() => handleDeleteWidget(widget)} /></Tooltip>
                </Space>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title={selectedWidget?.type === 'vapi' ? 'VAPI browser configuration' : 'Widget settings'}
        open={Boolean(selectedWidget)}
        onCancel={() => { setSelectedWidget(null); setPublicKey(''); setAllowedOrigins(''); }}
        okText="Save security settings"
        okButtonProps={{
          disabled: selectedWidget?.type !== 'vapi' || (!publicKey.trim() && !allowedOrigins.trim()),
          loading: isSaving,
        }}
        onOk={() => void handleSavePublicKey()}
      >
        {selectedWidget?.type === 'vapi' ? (
          <div className="space-y-3">
            <p>Enter the browser-safe VAPI public key for “{selectedWidget.name}”. Never paste the private API key here.</p>
            <Input value={publicKey} onChange={(event) => setPublicKey(event.target.value)} placeholder="VAPI public key" />
            <p>Allow public calls only from these exact website origins, one per line.</p>
            <Input.TextArea
              rows={3}
              value={allowedOrigins}
              onChange={(event) => setAllowedOrigins(event.target.value)}
              placeholder="https://www.example.com"
            />
          </div>
        ) : (
          <p>No editable security settings are required for this widget type.</p>
        )}
      </Modal>
    </div>
  );
};

export default WidgetList;
