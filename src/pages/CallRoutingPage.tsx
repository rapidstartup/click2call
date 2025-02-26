import React from 'react';
import { Phone, Bot, Voicemail, ArrowRight } from 'lucide-react';

const CallRoutingPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Call Routing</h1>

        <div className="bg-white shadow rounded-lg p-6">
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
          </div>

          {/* Settings */}
          <div className="mt-8">
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
      </div>
    </div>
  );
};

export default CallRoutingPage;