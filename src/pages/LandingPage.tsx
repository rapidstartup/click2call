import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Globe, Shield, FileText, Settings, BarChart } from 'lucide-react';
import CallWidget from '../components/CallWidget';

const Feature = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="p-6 bg-white rounded-lg shadow-md">
    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-blue-600" />
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-1/2 mb-8 lg:mb-0">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                Free International Web Calling for Your Business
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Replace expensive international toll-free numbers with our web-based solution.
                Start receiving calls worldwide without any charges.
              </p>
              <div className="flex gap-4">
                <Link
                  to="/signup"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Get Started
                </Link>
                <Link
                  to="/pricing"
                  className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50"
                >
                  View Pricing
                </Link>
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center">
              <CallWidget />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Feature
            icon={Globe}
            title="Global Accessibility"
            description="Replace expensive international toll-free numbers with our web-based solution."
          />
          <Feature
            icon={Shield}
            title="Anonymous Calling"
            description="Protect user privacy with anonymous calling - promoting whistleblower calls."
          />
          <Feature
            icon={FileText}
            title="Call Recording"
            description="Record calls with up to 15 days cloud storage for quality assurance."
          />
          <Feature
            icon={Settings}
            title="Easy Integration"
            description="Embed our widget on your website or share via QR code."
          />
          <Feature
            icon={BarChart}
            title="Advanced Reporting"
            description="Access detailed call reports and export data in multiple formats."
          />
          <Feature
            icon={Phone}
            title="Direct IP Telephony"
            description="Connect to your existing IP PBX or Cloud Telephony Provider."
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Start Receiving International Calls?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of businesses using our platform for seamless communication.
          </p>
          <Link
            to="/signup"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;