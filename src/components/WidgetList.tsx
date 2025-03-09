import React, { useState } from 'react';
import { Card, Button, Modal, message, Tooltip, Space } from 'antd';
import { CopyOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { WidgetType } from './WidgetCreator';

interface Widget {
  id: string;
  name: string;
  type: WidgetType;
  destination: string;
  embedCode: string;
  createdAt: string;
}

const WidgetList: React.FC = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [showEmbedCode, setShowEmbedCode] = useState(false);

  const handleCopyCode = (widget: Widget) => {
    navigator.clipboard.writeText(widget.embedCode);
    message.success('Widget code copied to clipboard!');
  };

  const handleDeleteWidget = (widget: Widget) => {
    Modal.confirm({
      title: 'Delete Widget',
      content: `Are you sure you want to delete "${widget.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // TODO: Implement API call to delete widget
          setWidgets(widgets.filter(w => w.id !== widget.id));
          message.success('Widget deleted successfully!');
        } catch {
          message.error('Failed to delete widget');
        }
      }
    });
  };

  const handleShowEmbedCode = (widget: Widget) => {
    setSelectedWidget(widget);
    setShowEmbedCode(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-6">Your Widgets</h2>
      
      {widgets.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No widgets created yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map(widget => (
            <Card key={widget.id} className="shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{widget.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{widget.type}</p>
                  <p className="text-sm text-gray-500">{widget.destination}</p>
                </div>
                <Space>
                  <Tooltip title="Copy embed code">
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyCode(widget)}
                    />
                  </Tooltip>
                  <Tooltip title="Widget settings">
                    <Button
                      icon={<SettingOutlined />}
                      onClick={() => handleShowEmbedCode(widget)}
                    />
                  </Tooltip>
                  <Tooltip title="Delete widget">
                    <Button
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => handleDeleteWidget(widget)}
                    />
                  </Tooltip>
                </Space>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title="Widget Embed Code"
        open={showEmbedCode}
        onCancel={() => setShowEmbedCode(false)}
        footer={[
          <Button key="copy" type="primary" onClick={() => selectedWidget && handleCopyCode(selectedWidget)}>
            Copy Code
          </Button>,
          <Button key="close" onClick={() => setShowEmbedCode(false)}>
            Close
          </Button>
        ]}
      >
        {selectedWidget && (
          <div>
            <p className="mb-4">Add this code to your website to embed the widget:</p>
            <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
              {selectedWidget.embedCode}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WidgetList; 