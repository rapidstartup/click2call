import React, { useState } from 'react';
import { Button, Select, Input, Form, TimePicker, Radio, Space, message } from 'antd';
import { Phone, Bot, Voicemail } from 'lucide-react';

export type WidgetType = 'call2app' | 'siptrunk' | 'aibot' | 'voicemail';
export type RouteType = 'call2app' | 'aibot' | 'voicemail';

interface WidgetConfig {
  name: string;
  type: WidgetType;
  destination: string;
  routing: {
    defaultRoute: RouteType;
    fallbackRoute: RouteType;
    businessHours: {
      start: string;
      end: string;
    };
  };
  settings: Record<string, string | number | boolean>;
}

interface WidgetCreatorProps {
  onSuccess?: () => void;
}

const WidgetCreator: React.FC<WidgetCreatorProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [widgetType, setWidgetType] = useState<WidgetType>('call2app');

  const widgetTypes = [
    { label: 'Click2Call App', value: 'call2app' },
    { label: 'SIP Trunk', value: 'siptrunk' },
    { label: 'AI Bot', value: 'aibot' },
    { label: 'Voicemail-to-Email', value: 'voicemail' }
  ];

  const handleTypeChange = (value: WidgetType) => {
    setWidgetType(value);
    form.setFieldsValue({ type: value });
  };

  const handleSubmit = async (values: WidgetConfig) => {
    try {
      // Create the widget first
      const response = await fetch('/api/widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to create widget');
      }

      const widget = await response.json();

      // If it's a SIP trunk widget, configure Twilio webhooks
      if (values.type === 'siptrunk' && values.destination.includes('.sip.twilio.com')) {
        const sipDomain = values.destination.split('.sip.twilio.com')[0];
        
        try {
          const twilioResponse = await fetch(`/api/widgets/${widget.id}/configure-twilio-webhooks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sipDomain,
              accountSid: values.settings.twilio_account_sid,
              authToken: values.settings.twilio_auth_token,
            }),
          });

          if (!twilioResponse.ok) {
            message.warning('Widget created but failed to configure Twilio webhooks automatically. Please configure them manually.');
          } else {
            message.success('Widget created and Twilio webhooks configured successfully!');
          }
        } catch (error) {
          console.error('Failed to configure Twilio webhooks:', error);
          message.warning('Widget created but failed to configure Twilio webhooks automatically. Please configure them manually.');
        }
      } else {
        message.success('Widget created successfully!');
      }

      form.resetFields();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating widget:', error);
      message.error('Failed to create widget');
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
          label="Widget Name"
          rules={[{ required: true, message: 'Please enter a widget name' }]}
        >
          <Input placeholder="Enter widget name" />
        </Form.Item>

        <Form.Item
          name="type"
          label="Widget Type"
          rules={[{ required: true, message: 'Please select a widget type' }]}
        >
          <Select
            options={widgetTypes}
            onChange={handleTypeChange}
            placeholder="Select widget type"
          />
        </Form.Item>

        <Form.Item
          name="destination"
          label="Destination"
          rules={[{ required: true, message: 'Please enter a destination' }]}
          extra={widgetType === 'siptrunk' ? 
            "For Twilio, enter your SIP Domain URI (e.g., your-domain.sip.twilio.com) or phone number" : 
            undefined}
        >
          <Input 
            placeholder={
              widgetType === 'call2app' ? 'Enter phone number' :
              widgetType === 'siptrunk' ? 'Enter SIP URI or phone number' :
              widgetType === 'aibot' ? 'Enter AI Bot configuration' :
              'Enter email address'
            }
          />
        </Form.Item>

        {widgetType === 'siptrunk' && (
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">Twilio Configuration</h3>
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
          </div>
        )}

        {/* Call Routing Configuration */}
        <div className="border rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-4">Call Routing</h3>
          
          <Form.Item
            name={['routing', 'defaultRoute']}
            label="Default Route"
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
            label="Business Hours"
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
            label="After Hours Fallback"
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