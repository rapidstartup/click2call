import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, message, Tooltip, Space, Spin } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { WidgetType } from './WidgetCreator';
import { getAuthHeaders } from '../lib/api';

interface Widget {
  id: string;
  name: string;
  type: WidgetType;
  destination: string;
  createdAt: string;
}

interface ApiWidget {
  id: string;
  name: string;
  type: WidgetType;
  destination: string;
  created_at: string;
}

interface WidgetListProps {
  refreshKey?: number;
}

const WidgetList: React.FC<WidgetListProps> = ({ refreshKey = 0 }) => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadWidgets = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch('/api/widgets', {
          headers: await getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to load widgets');
        }

        const data: ApiWidget[] = await response.json();
        if (isMounted) {
          setWidgets(data.map(widget => ({
            id: widget.id,
            name: widget.name,
            type: widget.type,
            destination: widget.destination,
            createdAt: widget.created_at,
          })));
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load widgets');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadWidgets();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleDeleteWidget = (widget: Widget) => {
    Modal.confirm({
      title: 'Delete Widget',
      content: `Are you sure you want to delete "${widget.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(`/api/widgets/${widget.id}`, {
            method: 'DELETE',
            headers: await getAuthHeaders(),
          });

          if (!response.ok) {
            throw new Error('Failed to delete widget');
          }

          setWidgets(currentWidgets => currentWidgets.filter(currentWidget => currentWidget.id !== widget.id));
          message.success('Widget deleted successfully!');
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Failed to delete widget');
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spin />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg">
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }

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
                  <p className="text-sm text-gray-500">{widget.destination || 'No destination configured'}</p>
                </div>
                <Space>
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
    </div>
  );
};

export default WidgetList;
