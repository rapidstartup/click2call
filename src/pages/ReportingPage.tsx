import React from 'react';

const ReportingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Call Reports</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-lg font-medium text-gray-900">Call reports are unavailable</h2>
          <p className="mt-2 text-gray-600">
            Call history is not available from the current backend, so no report data is shown.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportingPage;
