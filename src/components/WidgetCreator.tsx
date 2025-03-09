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

const WidgetCreator: React.FC = () => {
  const [form] = Form.useForm();
  const [widgetType, setWidgetType] = useState<WidgetType>('call2app');

  const widgetTypes = [
    { label: 'Call2 App', value: 'call2app' },
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
      // TODO: Implement API call to create widget
      console.log('Creating widget:', values);
      message.success('Widget created successfully!');
      form.resetFields();
    } catch {
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
        >
          <Input 
            placeholder={
              widgetType === 'call2app' ? 'Enter phone number' :
              widgetType === 'siptrunk' ? 'Enter SIP address' :
              widgetType === 'aibot' ? 'Enter AI Bot configuration' :
              'Enter email address'
            }
          />
        </Form.Item>

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
                <Radio value="call2app" className="w-full">
                  <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium">Call App</h4>
                      <p className="text-xs text-gray-500">Route calls to your Call2 app</p>
                    </div>
                  </div>
                </Radio>
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
            <Space>
              <TimePicker.RangePicker format="HH:mm" />
            </Space>
          </Form.Item>

          <Form.Item
            name={['routing', 'fallbackRoute']}
            label="After Hours Fallback"
            rules={[{ required: true, message: 'Please select a fallback route' }]}
          >
            <Select
              options={[
                { label: 'Voicemail', value: 'voicemail' },
                { label: 'AI Bot', value: 'aibot' }
              ]}
              placeholder="Select fallback route"
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