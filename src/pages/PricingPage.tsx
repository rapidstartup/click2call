import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

const PricingTier = ({
  name,
  price,
  description,
  features,
  highlighted = false
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) => (
  <div className={`p-8 rounded-lg ${highlighted ? 'bg-blue-600 text-white' : 'bg-white'}`}>
    <h3 className="text-2xl font-bold mb-2">{name}</h3>
    <div className="mb-4">
      <span className="text-4xl font-bold">${price}</span>
      <span className="text-sm opacity-80">/month</span>
    </div>
    <p className={`mb-6 ${highlighted ? 'text-blue-100' : 'text-gray-600'}`}>{description}</p>
    <ul className="space-y-4 mb-8">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center">
          <Check className={`w-5 h-5 mr-2 ${highlighted ? 'text-blue-200' : 'text-blue-600'}`} />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <Link
      to="/signup"
      className={`block text-center py-3 rounded-lg font-semibold ${
        highlighted
          ? 'bg-white text-blue-600 hover:bg-blue-50'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      Get Started
    </Link>
  </div>
);

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">
            Choose the plan that best fits your business needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <PricingTier
            name="Starter"
            price="9"
            description="Perfect for small businesses just getting started"
            features={[
              'Free international web calling',
              'Basic call reporting',
              'Widget customization',
              'Email support',
              '5 active widgets'
            ]}
          />
          <PricingTier
            name="Professional"
            price="97"
            description="Ideal for growing businesses needing more features"
            highlighted={true}
            features={[
              'Everything in Starter, plus:',
              'AI-powered customer support',
              'Advanced call analytics',
              'Call recording (15 days)',
              'Priority support',
              'Unlimited widgets'
            ]}
          />
          <PricingTier
            name="Enterprise"
            price="297"
            description="For large organizations requiring full capabilities"
            features={[
              'Everything in Professional, plus:',
              'Custom AI training',
              'Advanced security features',
              'Dedicated account manager',
              'Custom integrations',
              'SLA guarantee'
            ]}
          />
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Need a Custom Solution?</h2>
          <p className="text-gray-600 mb-8">
            Contact us to discuss your specific requirements and get a tailored quote.
          </p>
          <Link
            to="/contact"
            className="inline-block bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-900"
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;