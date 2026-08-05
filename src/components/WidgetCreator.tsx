import React, { useState } from 'react';
import { Button, Select, Input, Form, TimePicker, Radio, Space, Tooltip, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Phone, Bot, Voicemail } from 'lucide-react';

import { authenticatedFetchJson } from '../lib/fetchJson';

export type WidgetType = 'call2app' | 'siptrunk' | 'aibot' | 'voicemail' | 'vapi';
export type RouteType = 'call2app' | 'aibot' | 'voicemail';
export type SipProvider = 'twilio' | 'vapi';

interface WidgetConfig {
  name: string;
  type: WidgetType;
  destination?: string;
  routing: {
    defaultRoute: RouteType;
    fallbackRoute: RouteType;
    businessHours: {
      start: string;
      end: string;
    };
  };
  settings: Record<string, string | number | boolean | string[]>;
}

interface VapiAssistant {
  id: string;
  name?: string;
  // Add other assistant properties if needed
}

interface VapiAssistantOption {
  label: string;
  value: string;
  data: VapiAssistant;
}

interface CreatedWidget {
  id: string;
  name: string;
  type: WidgetType;
}

interface WidgetCreatorProps {
  onSuccess?: (widget: CreatedWidget) => void;
}

/**
 * Form.Item label + an "i" info icon whose tooltip content doubles as its
 * accessible name, so screen reader users get the help text on focus even
 * without triggering the visual tooltip, and keyboard users can reach it
 * via Tab (it's a real <button>, not a hover-only icon).
 */
const FieldLabel: React.FC<{ text: string; help: string }> = ({ text, help }) => (
  <span className="inline-flex items-center gap-1.5">
    <span>{text}</span>
    <Tooltip title={help} trigger={['hover', 'focus']}>
      <button
        type="button"
        aria-label={`${text} — ${help}`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        // Labels sit inside <Form>; without this a focused/activated icon
        // could trigger a submit.
        onClick={(event) => event.preventDefault()}
      >
        <InfoCircleOutlined aria-hidden="true" />
      </button>
    </Tooltip>
  </span>
);

// Plain-language, business-facing explanation of what each widget type does,
// shown directly in the dropdown (not just on hover) so a user can tell them
// apart before picking one.
const widgetTypeOptions: { label: string; value: WidgetType; description: string }[] = [
  {
    label: 'Click2Call App',
    value: 'call2app',
    description: "Ring your team in the Click2Call app, or a phone number you enter below.",
  },
  {
    label: 'SIP Trunk',
    value: 'siptrunk',
    description: 'Send calls through a SIP phone system you already run (Twilio or VAPI).',
  },
  {
    label: 'AI Bot',
    value: 'aibot',
    description: 'Let a built-in AI assistant answer automatically — no extra setup here.',
  },
  {
    label: 'VAPI Assistant',
    value: 'vapi',
    description: 'Connect one specific AI assistant from your own VAPI account.',
  },
  {
    label: 'Voicemail-to-Email',
    value: 'voicemail',
    description: 'Take a message and email it to you — nothing rings live.',
  },
];

const WidgetCreator: React.FC<WidgetCreatorProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [widgetType, setWidgetType] = useState<WidgetType>('call2app');
  const [vapiAssistants, setVapiAssistants] = useState<VapiAssistantOption[]>([]);

  const handleTypeChange = (value: WidgetType) => {
    setWidgetType(value);
    form.setFieldsValue({ type: value, destination: undefined });
  };

  const handleSubmit = async (values: WidgetConfig) => {
    try {
      const settings = { ...values.settings };
      if (values.type === 'vapi') {
        const rawOrigins = typeof settings.allowed_origins === 'string' ? settings.allowed_origins : '';
        settings.allowed_origins = rawOrigins
          .split(/[\n,]/)
          .map((origin) => origin.trim())
          .filter(Boolean);
      }

      // Create the widget first
      const widget = await authenticatedFetchJson<CreatedWidget>('/api/widgets', {
        method: 'POST',
        body: JSON.stringify({ ...values, settings }),
      });

      // If it's a SIP trunk widget, configure Twilio webhooks
      if (values.type === 'siptrunk' && values.destination.includes('.sip.twilio.com')) {
        const sipDomain = values.destination.split('.sip.twilio.com')[0];

        try {
          await authenticatedFetchJson('/api/widget-twilio-webhooks', {
            method: 'POST',
            body: JSON.stringify({
              widgetId: widget.id,
              sipDomain,
              accountSid: values.settings.twilio_account_sid,
              authToken: values.settings.twilio_auth_token,
            }),
          });
          message.success('Widget created and Twilio webhooks configured successfully!');
        } catch (error) {
          console.error('Failed to configure Twilio webhooks:', error);
          message.warning('Widget created but failed to configure Twilio webhooks automatically. Please configure them manually.');
        }
      } else {
        message.success('Widget created successfully!');
      }

      form.resetFields();
      onSuccess?.(widget);
    } catch (error) {
      console.error('Error creating widget:', error);
      message.error(error instanceof Error ? error.message : 'Failed to create widget');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Create New Widget</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          type: 'call2app',
          routing: {
            defaultRoute: 'call2app',
            fallbackRoute: 'voicemail'
          }
        }}
      >
        <Form.Item
          name="name"
          label={<FieldLabel text="Widget Name" help="An internal label so you can tell your widgets apart in this dashboard. Callers never see it." />}
          rules={[{ required: true, message: 'Please enter a widget name' }]}
        >
          <Input placeholder="e.g. Main Website — Support Line" />
        </Form.Item>

        <Form.Item
          name="type"
          label={<FieldLabel text="Widget Type" help="How this widget answers a call. Each option below explains what happens — this changes which fields appear next." />}
          rules={[{ required: true, message: 'Please select a widget type' }]}
        >
          <Select
            onChange={handleTypeChange}
            placeholder="Select widget type"
          >
            {widgetTypeOptions.map((option) => (
              <Select.Option key={option.value} value={option.value} label={option.label}>
                <div className="py-0.5">
                  <div className="font-medium">{option.label}</div>
                  <div className="whitespace-normal text-xs text-gray-500">{option.description}</div>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {(widgetType === 'call2app' || widgetType === 'siptrunk' || widgetType === 'voicemail' || widgetType === 'aibot' || widgetType === 'vapi') && (
          <Form.Item
            name="destination"
            label={<FieldLabel text="Destination" help="Who or what actually receives the call, based on the widget type you picked above — a phone number, an email address, or a SIP address." />}
            rules={[
              widgetType !== 'aibot' && widgetType !== 'vapi'
                ? { required: true, message: 'Please enter a destination' }
                : undefined,
            ].filter(Boolean)}
            preserve={false}
            dependencies={[['settings', 'sip_provider']]}
            extra={
              widgetType === 'call2app' ?
                "The phone number that should ring when this widget is called, in E.164 format (a leading + and country code, no spaces or dashes) — e.g. +14155550123 for a US number. This is your number, not the caller's." :
              widgetType === 'voicemail' ?
                "The email address that should receive the message left when this widget is called. Only you see this address — callers never do." :
              widgetType === 'siptrunk' ?
                form.getFieldValue(['settings', 'sip_provider']) === 'twilio' ?
                  "For Twilio, enter your SIP Domain URI (e.g., your-domain.sip.twilio.com) or a phone number in E.164 format (e.g. +14155550123). This is where calls are forwarded to." :
                form.getFieldValue(['settings', 'sip_provider']) === 'vapi' ?
                  "For VAPI, enter your SIP gateway domain (e.g., sip.vapi.ai) or a phone number in E.164 format (e.g. +14155550123). This is where calls are forwarded to." :
                  "Select a SIP provider first" :
              widgetType === 'aibot' ?
                "Not needed. The AI assistant handles the call routing automatically based on the call routing configuration below." :
              "Not needed. The VAPI assistant handles the call routing automatically based on the call routing configuration below."
            }
          >
            <Input
              autoComplete="off"
              placeholder={
                widgetType === 'call2app' ? 'e.g. +14155550123' :
                widgetType === 'siptrunk' ?
                  form.getFieldValue(['settings', 'sip_provider']) === 'twilio' ? 'e.g. your-domain.sip.twilio.com or +14155550123' :
                  form.getFieldValue(['settings', 'sip_provider']) === 'vapi' ? 'e.g. sip.vapi.ai or +14155550123' :
                  'Select a SIP provider first' :
                widgetType === 'voicemail' ? 'e.g. you@yourcompany.com' :
                widgetType === 'aibot' ? 'Not applicable for AI bot widgets' :
                'Not applicable for VAPI widgets'
              }
            />
          </Form.Item>
        )}

        {widgetType === 'siptrunk' && (
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">SIP Configuration</h3>
            
            <Form.Item
              name={['settings', 'sip_provider']}
              label="SIP Provider"
              rules={[{ required: true, message: 'Please select a SIP provider' }]}
            >
              <Select
                options={[
                  { label: 'Twilio', value: 'twilio' },
                  { label: 'VAPI', value: 'vapi' }
                ]}
                placeholder="Select SIP provider"
              />
            </Form.Item>

            {form.getFieldValue(['settings', 'sip_provider']) === 'twilio' && (
              <>
                <Form.Item
                  name={['settings', 'twilio_account_sid']}
                  label="Account SID"
                  rules={[{ required: true, message: 'Please enter your Twilio Account SID' }]}
                >
                  <Input placeholder="Enter your Twilio Account SID" />
                </Form.Item>

                <Form.Item
                  name={['settings', 'twilio_auth_token']}
                  label="Auth Token"
                  rules={[{ required: true, message: 'Please enter your Twilio Auth Token' }]}
                >
                  <Input.Password placeholder="Enter your Twilio Auth Token" />
                </Form.Item>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Webhook Configuration</h4>
                  <p className="text-sm text-blue-600">
                    Configure these webhooks in your Twilio SIP Domain settings:
                  </p>
                  <ul className="list-disc list-inside text-sm text-blue-600 mt-2">
                    <li>A CALL COMES IN: https://your-server.com/twilio/voice</li>
                    <li>CALL STATUS CHANGES: https://your-server.com/twilio/status</li>
                  </ul>
                </div>
              </>
            )}

            {form.getFieldValue(['settings', 'sip_provider']) === 'vapi' && (
              <>
                <Form.Item
                  name={['settings', 'vapi_api_key']}
                  label="VAPI Private API Key"
                  rules={[{ required: true, message: 'Please enter your VAPI API Key' }]}
                  className="flex-1"
                >
                  <Input.Password placeholder="Enter your VAPI API Key" />
                </Form.Item>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">VAPI SIP Configuration</h4>
                  <p className="text-sm text-blue-600">
                    Your SIP trunk will be automatically configured with VAPI's infrastructure. You can use the same API key for both AI and SIP functionality.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {widgetType === 'vapi' && (
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">VAPI Configuration</h3>
            
            {/* API Key with Save button */}
            <div className="space-y-4">
              <Form.Item
                name={['settings', 'vapi_public_key']}
                label="VAPI Public Key"
                rules={[
                  { required: true, message: 'Please enter your VAPI Public Key' },
                  {
                    validator: async (_, value: string) => {
                      const privateKey = form.getFieldValue(['settings', 'vapi_api_key']);
                      if (value && privateKey && value.trim() === String(privateKey).trim()) {
                        throw new Error('Use the VAPI public key here, not the private API key');
                      }
                    },
                  },
                ]}
                extra="This key is safe to use in the browser. Do not use your private API key here."
              >
                <Input placeholder="Enter your VAPI Public Key" />
              </Form.Item>

              <Form.Item
                name={['settings', 'allowed_origins']}
                label="Allowed website origins"
                rules={[{ required: true, message: 'Add at least one website origin' }]}
                extra="Only these exact sites can request a public call token. Enter one origin per line, for example https://www.example.com."
              >
                <Input.TextArea rows={3} placeholder="https://www.example.com" />
              </Form.Item>

              <div className="flex items-start space-x-4">
                <Form.Item
                  name={['settings', 'vapi_api_key']}
                  label="VAPI Private API Key"
                  rules={[{ required: true, message: 'Please enter your VAPI API Key' }]}
                  className="flex-1"
                >
                  <Input.Password placeholder="Enter your VAPI API Key" />
                </Form.Item>
                <Button 
                  type="default"
                  className="mt-7"
                  onClick={async () => {
                    try {
                      const apiKey = form.getFieldValue(['settings', 'vapi_api_key']);
                      if (!apiKey) {
                        message.error('Please enter a VAPI API Key');
                        return;
                      }

                      // Show loading state
                      message.loading('Validating API key and loading assistants...', 0);

                      // The authenticated server function contacts VAPI so the
                      // provider key is never placed in a third-party browser request.
                      const assistants = await authenticatedFetchJson<VapiAssistant[]>('/api/vapi-assistants', {
                        method: 'POST',
                        body: JSON.stringify({ api_key: apiKey }),
                      });

                      // Update the assistants options
                      setVapiAssistants(assistants.map((assistant: VapiAssistant) => ({
                        label: assistant.name || assistant.id,
                        value: assistant.id,
                        data: assistant
                      })));

                      // Clear any existing assistant selection
                      form.setFieldsValue({
                        settings: {
                          ...form.getFieldValue('settings'),
                          vapi_assistant_id: undefined,
                          vapi_assistant_name: undefined
                        }
                      });

                      message.success('API key validated successfully!');
                    } catch (error) {
                      console.error('Error validating VAPI API key:', error);
                      message.error(error instanceof Error ? error.message : 'Failed to validate API key. Please check your key and try again.');
                    } finally {
                      message.destroy(); // Clear loading message
                    }
                  }}
                >
                  Validate & Load Assistants
                </Button>
              </div>

              {/* Assistant Selection Dropdown */}
              <Form.Item
                name={['settings', 'vapi_assistant_id']}
                label="Assistant"
                rules={[{ required: true, message: 'Please select an assistant' }]}
                dependencies={[['settings', 'vapi_api_key']]}
              >
                <Select
                  placeholder="Select an assistant"
                  options={vapiAssistants}
                  disabled={!form.getFieldValue(['settings', 'vapi_api_key']) || vapiAssistants.length === 0}
                  onChange={(value, option) => {
                    // When an assistant is selected, also save its name
                    if (option && !Array.isArray(option)) {
                      form.setFieldsValue({
                        settings: {
                          ...form.getFieldValue('settings'),
                          vapi_assistant_name: option.data.name
                        }
                      });
                    }
                  }}
                />
              </Form.Item>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">VAPI Integration</h4>
                <p className="text-sm text-blue-600">
                  This will connect your widget to a VAPI AI Assistant. When calls come in, they will be automatically routed to your configured VAPI assistant.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Call Routing Configuration */}
        <div className="border rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-1">Call Routing</h3>
          <p className="mb-4 text-sm text-gray-500">
            Choose where calls go by default, and — optionally — a different place for them to go outside business hours.
          </p>

          <Form.Item
            name={['routing', 'defaultRoute']}
            label={<FieldLabel text="Default Route" help="Where calls go. If you set Business Hours below, this route is only used during those hours; otherwise it's used all the time." />}
            rules={[{ required: true, message: 'Please select a default route' }]}
          >
            <Radio.Group>
              <Space direction="vertical" className="w-full">
                {(widgetType === 'call2app' || widgetType === 'siptrunk') && (
                  <Radio value="call2app" className="w-full">
                    <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium">Call App</h4>
                        <p className="text-xs text-gray-500">Route calls to your Click2Call app</p>
                      </div>
                    </div>
                  </Radio>
                )}
                {widgetType === 'siptrunk' && (
                  <Radio value="siptrunk" className="w-full">
                    <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <Phone className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium">SIP Trunk</h4>
                        <p className="text-xs text-gray-500">Route calls through your SIP provider (e.g., Twilio)</p>
                      </div>
                    </div>
                  </Radio>
                )}
                <Radio value="aibot" className="w-full">
                  <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Bot className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium">AI Bot</h4>
                      <p className="text-xs text-gray-500">Route calls to an AI assistant</p>
                    </div>
                  </div>
                </Radio>
                <Radio value="voicemail" className="w-full">
                  <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Voicemail className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium">Voicemail</h4>
                      <p className="text-xs text-gray-500">Send calls to voicemail</p>
                    </div>
                  </div>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name={['routing', 'businessHours']}
            label={<FieldLabel text="Business Hours" help="Optional. The time window (your local time) when the Default Route above is used. Outside this window, calls use the After Hours Fallback instead. Leave blank to always use the Default Route." />}
          >
            <TimePicker.RangePicker
              format="HH:mm"
              onChange={(value) => {
                // Clear fallback route if business hours are cleared
                if (!value) {
                  form.setFieldsValue({ routing: { ...form.getFieldValue('routing'), fallbackRoute: undefined } });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name={['routing', 'fallbackRoute']}
            label={<FieldLabel text="After Hours Fallback" help="Where calls go outside Business Hours. Only used if you've set Business Hours above." />}
            rules={[{
              required: !!form.getFieldValue(['routing', 'businessHours']), 
              message: 'Please select a fallback route when business hours are set' 
            }]}
            dependencies={[['routing', 'businessHours']]}
          >
            <Select
              options={[
                { label: 'Voicemail', value: 'voicemail' },
                { label: 'AI Bot', value: 'aibot' }
              ]}
              placeholder="Select fallback route"
              disabled={!form.getFieldValue(['routing', 'businessHours'])}
            />
          </Form.Item>
        </div>

        <Form.Item>
          <Button type="primary" htmlType="submit" className="w-full">
            Create Widget
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default WidgetCreator;
