import React, { useState } from 'react';
import { Button, Select, Input, Form, message } from 'antd';

export type WidgetType = 'call2app' | 'siptrunk' | 'aibot' | 'voicemail';

interface WidgetConfig {
  type: WidgetType;
  name: string;
  destination: string;
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
        initialValues={{ type: 'call2app' }}
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