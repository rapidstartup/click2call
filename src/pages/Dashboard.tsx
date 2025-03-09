import React from 'react';
import { Button, Card, Row, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Phone, Bot, Voicemail, ArrowRight, Download, Filter } from 'lucide-react';
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WidgetList from '../components/WidgetList';
import { useLocation, useNavigate } from 'react-router-dom';

const reportData = [
  { name: 'Mon', calls: 4, duration: 120 },
  { name: 'Tue', calls: 3, duration: 90 },
  { name: 'Wed', calls: 6, duration: 180 },
  { name: 'Thu', calls: 8, duration: 240 },
  { name: 'Fri', calls: 5, duration: 150 },
  { name: 'Sat', calls: 2, duration: 60 },
  { name: 'Sun', calls: 1, duration: 30 },
];

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (activeKey: string) => {
    navigate(`/dashboard?tab=${activeKey}`);
  };

  const items = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Total Calls</h3>
              <p className="text-3xl font-bold">0</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Active Widgets</h3>
              <p className="text-3xl font-bold">0</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Call Duration</h3>
              <p className="text-3xl font-bold">0 min</p>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: 'widgets',
      label: 'Widgets',
      children: (
        <div>
          <Row justify="end" className="mb-6">
            <Button type="primary" icon={<PlusOutlined />}>
              Create New Widget
            </Button>
          </Row>
          <WidgetList />
        </div>
      ),
    },
    {
      key: 'call-routing',
      label: 'Call Routing',
      children: (
        <div className="space-y-6">
          {/* Call App Route */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">Call App</h3>
                  <p className="text-sm text-gray-500">Route calls to your Call2 app</p>
                </div>
              </div>
              <label className="flex items-center">
                <input type="radio" name="route" className="text-blue-600" />
                <ArrowRight className="w-5 h-5 ml-2 text-gray-400" />
              </label>
            </div>
          </div>

          {/* AI Bot Route */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Bot className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">AI Bot</h3>
                  <p className="text-sm text-gray-500">Route calls to an AI assistant</p>
                </div>
              </div>
              <label className="flex items-center">
                <input type="radio" name="route" className="text-blue-600" />
                <ArrowRight className="w-5 h-5 ml-2 text-gray-400" />
              </label>
            </div>
          </div>

          {/* Voicemail Route */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Voicemail className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">Voicemail</h3>
                  <p className="text-sm text-gray-500">Send calls to voicemail</p>
                </div>
              </div>
              <label className="flex items-center">
                <input type="radio" name="route" className="text-blue-600" />
                <ArrowRight className="w-5 h-5 ml-2 text-gray-400" />
              </label>
            </div>
          </div>

          {/* Settings */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Route Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Hours</label>
                <div className="mt-1 grid grid-cols-2 gap-4">
                  <input
                    type="time"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fallback Route</label>
                <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option>Voicemail</option>
                  <option>AI Bot</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </div>
      ),
    },
    {
      key: 'reports',
      label: 'Reports',
      children: (
        <div>
          <div className="flex justify-between items-center mb-8">
            <div className="flex space-x-4">
              <button className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Call Volume Chart */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-medium mb-4">Call Volume</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="calls" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Call Duration Chart */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-medium mb-4">Call Duration (minutes)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="duration" stroke="#3B82F6" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Call Log Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">Recent Calls</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date().toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Math.floor(Math.random() * 10) + 1}m {Math.floor(Math.random() * 60)}s
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {['Call App', 'AI Bot', 'Voicemail'][Math.floor(Math.random() * 3)]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    }
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <Tabs
          activeKey={defaultTab}
          onChange={handleTabChange}
          items={items}
          className="bg-white rounded-lg shadow p-6"
        />
      </div>
    </div>
  );
};

export default Dashboard; 