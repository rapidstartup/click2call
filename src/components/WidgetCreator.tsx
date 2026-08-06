import React, { useState } from 'react';
import { Button, Select, Input, Form, TimePicker, Radio, Space, Tooltip, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Phone, Bot, Voicemail, Cable, Sparkles, type LucideIcon } from 'lucide-react';

import { authenticatedFetchJson } from '../lib/fetchJson';
import PhoneDestinationInput, { isValidE164 } from './PhoneDestinationInput';

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
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-signal/40"
        onClick={(event) => event.preventDefault()}
      >
        <InfoCircleOutlined aria-hidden="true" />
      </button>
    </Tooltip>
  </span>
);

type WidgetTypeOption = {
  label: string;
  value: WidgetType;
  description: string;
  Icon: LucideIcon;
  iconClass: string;
  iconBg: string;
  badge?: 'recommended' | 'advanced';
};

// Order: simplest first, advanced last. Descriptions stay in the dropdown
// list only — the closed select shows the label (+ badge), never the helper line.
const widgetTypeOptions: WidgetTypeOption[] = [
  {
    label: 'Click2Call App',
    value: 'call2app',
    description: 'Ring your team in the Click2Call app, or a phone number you enter below.',
    Icon: Phone,
    iconClass: 'text-info',
    iconBg: 'bg-[#E8EEF3]',
    badge: 'recommended',
  },
  {
    label: 'AI Bot',
    value: 'aibot',
    description: 'Let a built-in AI assistant answer automatically — no extra setup here.',
    Icon: Bot,
    iconClass: 'text-ink',
    iconBg: 'bg-surface-strong',
  },
  {
    label: 'Voicemail-to-Email',
    value: 'voicemail',
    description: 'Take a message and email it to you — nothing rings live.',
    Icon: Voicemail,
    iconClass: 'text-live',
    iconBg: 'bg-[#D9E9DF]',
  },
  {
    label: 'VAPI Assistant',
    value: 'vapi',
    description: 'Connect one specific AI assistant from your own VAPI account.',
    Icon: Sparkles,
    iconClass: 'text-info',
    iconBg: 'bg-[#E8EEF3]',
  },
  {
    label: 'SIP Trunk',
    value: 'siptrunk',
    description: 'Send calls through a SIP phone system you already run (Twilio or VAPI).',
    Icon: Cable,
    iconClass: 'text-warning',
    iconBg: 'bg-[#F5EDD8]',
    badge: 'advanced',
  },
];

function needsDestination(type: WidgetType): boolean {
  return type === 'call2app' || type === 'siptrunk' || type === 'voicemail';
}

/** Smart-fill the default route to match the widget type the user just picked. */
function recommendedRouteFor(type: WidgetType): RouteType {
  switch (type) {
    case 'aibot':
    case 'vapi':
      return 'aibot';
    case 'voicemail':
      return 'voicemail';
    case 'call2app':
    case 'siptrunk':
    default:
      return 'call2app';
  }
}

const Badge: React.FC<{ kind: 'recommended' | 'advanced' }> = ({ kind }) => (
  <span
    className={
      kind === 'recommended'
        ? 'rounded-control bg-live/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-live'
        : 'rounded-control bg-surface-strong px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted'
    }
  >
    {kind === 'recommended' ? 'Recommended' : 'Advanced'}
  </span>
);

const WidgetTypeOptionRow: React.FC<{ option: WidgetTypeOption; compact?: boolean }> = ({
  option,
  compact = false,
}) => {
  const { Icon } = option;
  return (
    <div className={`flex gap-3 ${compact ? 'items-center py-0' : 'items-start py-1'}`}>
      <div className={`flex shrink-0 items-center justify-center rounded-control ${option.iconBg} ${compact ? 'h-6 w-6' : 'h-9 w-9'}`}>
        <Icon className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${option.iconClass}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{option.label}</span>
          {option.badge && <Badge kind={option.badge} />}
        </div>
        {!compact && (
          <div className="mt-0.5 whitespace-normal text-xs leading-snug text-muted">{option.description}</div>
        )}
      </div>
    </div>
  );
};

const WidgetCreator: React.FC<WidgetCreatorProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [widgetType, setWidgetType] = useState<WidgetType | null>(null);
  const [vapiAssistants, setVapiAssistants] = useState<VapiAssistantOption[]>([]);
  const sipProvider = Form.useWatch(['settings', 'sip_provider'], form);
  const businessHours = Form.useWatch(['routing', 'businessHours'], form);

  const handleTypeChange = (value: WidgetType) => {
    setWidgetType(value);
    form.setFieldsValue({
      type: value,
      destination: undefined,
      routing: {
        ...form.getFieldValue('routing'),
        defaultRoute: recommendedRouteFor(value),
        fallbackRoute: 'voicemail',
      },
    });
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

      const payload = {
        ...values,
        settings,
        // AI / VAPI widgets have no external destination — omit rather than send a dummy.
        destination: needsDestination(values.type) ? values.destination : undefined,
      };

      const widget = await authenticatedFetchJson<CreatedWidget>('/api/widgets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (values.type === 'siptrunk' && values.destination?.includes('.sip.twilio.com')) {
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
      setWidgetType(null);
      onSuccess?.(widget);
    } catch (error) {
      console.error('Error creating widget:', error);
      message.error(error instanceof Error ? error.message : 'Failed to create widget');
    }
  };

  const selectedOption = widgetTypeOptions.find((option) => option.value === widgetType);

  return (
    <div className="rounded-card bg-surface p-6 shadow">
      <h2 className="mb-6 text-2xl font-semibold text-ink">Create New Widget</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          routing: {
            fallbackRoute: 'voicemail',
          },
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
            placeholder="Choose how calls should be answered"
            optionLabelProp="label"
            listHeight={420}
            listItemHeight={68}
            labelRender={() =>
              selectedOption ? <WidgetTypeOptionRow option={selectedOption} compact /> : null
            }
          >
            {widgetTypeOptions.map((option) => (
              <Select.Option key={option.value} value={option.value} label={option.label}>
                <WidgetTypeOptionRow option={option} />
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {widgetType === 'call2app' && (
          <Form.Item
            name="destination"
            label={<FieldLabel text="Destination" help="The phone number that should ring when this widget is called. Pick the country code, then enter digits only — we assemble the full international number for you." />}
            rules={[
              { required: true, message: 'Please enter a phone number' },
              {
                validator: async (_, value: string) => {
                  if (!value) return;
                  if (!isValidE164(value)) {
                    throw new Error('Enter a valid phone number (7–15 digits including country code)');
                  }
                },
              },
            ]}
            validateTrigger={['onChange', 'onBlur']}
            preserve={false}
          >
            <PhoneDestinationInput placeholder="4155550123" />
          </Form.Item>
        )}

        {widgetType === 'voicemail' && (
          <Form.Item
            name="destination"
            label={<FieldLabel text="Destination" help="The email address that should receive the message left when this widget is called. Only you see this address — callers never do." />}
            rules={[
              { required: true, message: 'Please enter an email address' },
              { type: 'email', message: 'Enter a valid email address (e.g. you@yourcompany.com)' },
            ]}
            validateTrigger={['onChange', 'onBlur']}
            preserve={false}
            extra="We'll email voicemail recordings here. Checked as you type."
          >
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@yourcompany.com"
            />
          </Form.Item>
        )}

        {widgetType === 'siptrunk' && (
          <Form.Item
            name="destination"
            label={<FieldLabel text="Destination" help="Your SIP Domain URI or a phone number in E.164 format — where calls are forwarded." />}
            rules={[{ required: true, message: 'Please enter a destination' }]}
            preserve={false}
            extra={
              sipProvider === 'twilio' ?
                "For Twilio, enter your SIP Domain URI (e.g., your-domain.sip.twilio.com) or a phone number in E.164 format (e.g. +14155550123)." :
              sipProvider === 'vapi' ?
                "For VAPI, enter your SIP gateway domain (e.g., sip.vapi.ai) or a phone number in E.164 format (e.g. +14155550123)." :
                "Select a SIP provider first"
            }
          >
            <Input
              autoComplete="off"
              placeholder={
                sipProvider === 'twilio' ? 'e.g. your-domain.sip.twilio.com or +14155550123' :
                sipProvider === 'vapi' ? 'e.g. sip.vapi.ai or +14155550123' :
                'Select a SIP provider first'
              }
            />
          </Form.Item>
        )}

        {widgetType === 'siptrunk' && (
          <div className="mb-6 rounded-card border border-border p-4">
            <h3 className="mb-4 text-lg font-medium text-ink">SIP Configuration</h3>

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

            {sipProvider === 'twilio' && (
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

                <div className="rounded-control bg-[#E8EEF3] p-4">
                  <h4 className="mb-2 text-sm font-medium text-info">Webhook Configuration</h4>
                  <p className="text-sm text-info/80">
                    Configure these webhooks in your Twilio SIP Domain settings:
                  </p>
                  <ul className="mt-2 list-inside list-disc text-sm text-info/80">
                    <li>A CALL COMES IN: https://your-server.com/twilio/voice</li>
                    <li>CALL STATUS CHANGES: https://your-server.com/twilio/status</li>
                  </ul>
                </div>
              </>
            )}

            {sipProvider === 'vapi' && (
              <>
                <Form.Item
                  name={['settings', 'vapi_api_key']}
                  label="VAPI Private API Key"
                  rules={[{ required: true, message: 'Please enter your VAPI API Key' }]}
                  className="flex-1"
                >
                  <Input.Password placeholder="Enter your VAPI API Key" />
                </Form.Item>

                <div className="rounded-control bg-[#E8EEF3] p-4">
                  <h4 className="mb-2 text-sm font-medium text-info">VAPI SIP Configuration</h4>
                  <p className="text-sm text-info/80">
                    Your SIP trunk will be automatically configured with VAPI's infrastructure. You can use the same API key for both AI and SIP functionality.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {widgetType === 'vapi' && (
          <div className="mb-6 rounded-card border border-border p-4">
            <h3 className="mb-4 text-lg font-medium text-ink">VAPI Configuration</h3>

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

                      message.loading('Validating API key and loading assistants...', 0);

                      const assistants = await authenticatedFetchJson<VapiAssistant[]>('/api/vapi-assistants', {
                        method: 'POST',
                        body: JSON.stringify({ api_key: apiKey }),
                      });

                      setVapiAssistants(assistants.map((assistant: VapiAssistant) => ({
                        label: assistant.name || assistant.id,
                        value: assistant.id,
                        data: assistant
                      })));

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
                      message.destroy();
                    }
                  }}
                >
                  Validate & Load Assistants
                </Button>
              </div>

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

              <div className="rounded-control bg-[#E8EEF3] p-4">
                <h4 className="mb-2 text-sm font-medium text-info">VAPI Integration</h4>
                <p className="text-sm text-info/80">
                  This will connect your widget to a VAPI AI Assistant. When calls come in, they will be automatically routed to your configured VAPI assistant.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Call routing appears only after a widget type is chosen, smart-filled to match. */}
        {widgetType && (
          <div
            key={widgetType}
            className="mb-6 rounded-card border border-border p-4 transition-opacity duration-medium ease-enter"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-medium text-ink">Call Routing</h3>
              {selectedOption?.badge === 'recommended' && <Badge kind="recommended" />}
            </div>
            <p className="mb-4 text-sm text-muted">
              Pre-filled for {selectedOption?.label}. Choose where calls go by default, and — optionally — a different place outside business hours.
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
                      <div className="flex items-center rounded-control p-2 hover:bg-surface-strong/60">
                        <div className="rounded-control bg-[#E8EEF3] p-2">
                          <Phone className="h-5 w-5 text-info" />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-ink">Call App</h4>
                          <p className="text-xs text-muted">Route calls to your Click2Call app</p>
                        </div>
                      </div>
                    </Radio>
                  )}
                  {widgetType === 'siptrunk' && (
                    <Radio value="siptrunk" className="w-full">
                      <div className="flex items-center rounded-control p-2 hover:bg-surface-strong/60">
                        <div className="rounded-control bg-[#F5EDD8] p-2">
                          <Cable className="h-5 w-5 text-warning" />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-ink">SIP Trunk</h4>
                          <p className="text-xs text-muted">Route calls through your SIP provider (e.g., Twilio)</p>
                        </div>
                      </div>
                    </Radio>
                  )}
                  <Radio value="aibot" className="w-full">
                    <div className="flex items-center rounded-control p-2 hover:bg-surface-strong/60">
                      <div className="rounded-control bg-surface-strong p-2">
                        <Bot className="h-5 w-5 text-ink" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-ink">AI Bot</h4>
                        <p className="text-xs text-muted">Route calls to an AI assistant</p>
                      </div>
                    </div>
                  </Radio>
                  <Radio value="voicemail" className="w-full">
                    <div className="flex items-center rounded-control p-2 hover:bg-surface-strong/60">
                      <div className="rounded-control bg-[#D9E9DF] p-2">
                        <Voicemail className="h-5 w-5 text-live" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-ink">Voicemail</h4>
                        <p className="text-xs text-muted">Send calls to voicemail</p>
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
                required: !!businessHours,
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
                disabled={!businessHours}
              />
            </Form.Item>
          </div>
        )}

        {!widgetType && (
          <p className="mb-6 rounded-control border border-dashed border-border bg-paper px-4 py-3 text-sm text-muted">
            Pick a widget type above to unlock call routing — we&apos;ll pre-fill the recommended path for you.
          </p>
        )}

        <Form.Item>
          <Button type="primary" htmlType="submit" className="w-full" disabled={!widgetType}>
            Create Widget
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default WidgetCreator;
