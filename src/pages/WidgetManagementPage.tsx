import React, { useState } from 'react';
import { Code, Copy, Settings, Eye, Trash2 } from 'lucide-react';

const WidgetManagementPage = () => {
  const [widgets] = useState([
    { id: 1, name: 'Sales Widget', domain: 'example.com', active: true },
    { id: 2, name: 'Support Widget', domain: 'support.example.com', active: true },
  ]);

  const [selectedWidget, setSelectedWidget] = useState(widgets[0]);

  const copyCode = () => {
    const code = `<script src="https://click2call.ai/widget/${selectedWidget.id}"></script>`;
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Widget Management</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Create New Widget
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Widget List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedWidget.id === widget.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedWidget(widget)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{widget.name}</h3>
                        <p className="text-sm text-gray-500">{widget.domain}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button className="text-gray-400 hover:text-gray-500">
                          <Settings className="w-5 h-5" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-500">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Widget Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Widget Code</h2>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between text-gray-200 font-mono text-sm mb-2">
                <Code className="w-4 h-4" />
                <button onClick={copyCode} className="hover:text-white">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <code className="text-blue-400 text-sm">
                {`<script src="https://click2call.ai/widget/${selectedWidget.id}"></script>`}
              </code>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Widget Name</label>
                <input
                  type="text"
                  value={selectedWidget.name}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Domain</label>
                <input
                  type="text"
                  value={selectedWidget.domain}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedWidget.active}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetManagementPage;