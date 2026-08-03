import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface BillingPayload {
  plan?: { id?: unknown };
}

interface CheckoutPayload {
  error?: unknown;
  url?: unknown;
}

interface PricingTierProps {
  description: string;
  features: string[];
  highlighted?: boolean;
  isCurrent: boolean;
  isSubmitting: boolean;
  name: string;
  onSubscribe: () => void;
  planId: string;
  price: string;
  userIsAuthenticated: boolean;
}

const PricingTier = ({
  description,
  features,
  highlighted = false,
  isCurrent,
  isSubmitting,
  name,
  onSubscribe,
  planId,
  price,
  userIsAuthenticated,
}: PricingTierProps) => {
  const buttonClassName = `block w-full text-center py-3 rounded-lg font-semibold ${
    highlighted
      ? 'bg-white text-blue-600 hover:bg-blue-50'
      : 'bg-blue-600 text-white hover:bg-blue-700'
  } ${isCurrent || isSubmitting ? 'cursor-not-allowed opacity-70' : ''}`;
  return (
    <div className={`p-8 rounded-lg ${highlighted ? 'bg-blue-600 text-white' : 'bg-white'}`}>
      <div className='mb-3 min-h-6'>
        {isCurrent && (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${highlighted ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
            Current plan
          </span>
        )}
      </div>
      <h3 className='text-2xl font-bold mb-2'>{name}</h3>
      <div className='mb-4'>
        <span className='text-4xl font-bold'>${price}</span>
        <span className='text-sm opacity-80'>/month</span>
      </div>
      <p className={`mb-6 ${highlighted ? 'text-blue-100' : 'text-gray-600'}`}>{description}</p>
      <ul className='space-y-4 mb-8'>
        {features.map((feature) => (
          <li key={feature} className='flex items-center'>
            <Check className={`w-5 h-5 mr-2 ${highlighted ? 'text-blue-200' : 'text-blue-600'}`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {userIsAuthenticated ? (
        <button
          type='button'
          disabled={isCurrent || isSubmitting}
          onClick={onSubscribe}
          className={buttonClassName}
        >
          {isSubmitting ? 'Starting checkout...' : isCurrent ? 'Current plan' : 'Subscribe'}
        </button>
      ) : (
        <Link to={`/signup?plan=${encodeURIComponent(planId)}`} className={buttonClassName}>
          Get Started
        </Link>
      )}
    </div>
  );
};

const PricingPage = () => {
  const { user } = useAuth();
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setCurrentPlanId(null);
      setBillingError(null);
      return () => {
        cancelled = true;
      };
    }

    const loadBilling = async () => {
      setBillingError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sign in required');

        const response = await fetch('/api/billing', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const payload = await response.json() as BillingPayload & { error?: unknown };
        if (!response.ok || typeof payload.plan?.id !== 'string') {
          const message = typeof payload.error === 'string' ? payload.error : 'Unable to load current plan';
          throw new Error(message);
        }
        if (!cancelled) setCurrentPlanId(payload.plan.id);
      } catch (error: unknown) {
        if (!cancelled) {
          setBillingError(error instanceof Error ? error.message : 'Unable to load current plan');
        }
      }
    };

    void loadBilling();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSubscribe = async (planId: string) => {
    setCheckoutError(null);
    setSubmittingPlanId(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in required');

      const response = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId }),
      });
      const payload = await response.json() as CheckoutPayload;
      if (!response.ok || typeof payload.url !== 'string') {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Unable to start checkout');
      }
      window.location.href = payload.url;
    } catch (error: unknown) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to start checkout');
      setSubmittingPlanId(null);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 py-16'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h1 className='text-4xl font-bold mb-4'>Simple, Transparent Pricing</h1>
          <p className='text-xl text-gray-600'>
            Choose the plan that best fits your business needs
          </p>
          {user && currentPlanId === 'free' && (
            <span className='mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700'>
              Current plan: Free
            </span>
          )}
          {billingError && <p className='mt-4 text-sm text-red-600'>{billingError}</p>}
          {checkoutError && <p className='mt-4 text-sm text-red-600'>{checkoutError}</p>}
        </div>

        <div className='grid md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
          <PricingTier
            name='Starter'
            planId='starter'
            price='9'
            description='Perfect for small businesses just getting started'
            features={[
              '30 minutes of AI calls per month',
              'Basic call reporting',
              'Widget customization',
              'Email support',
              '5 active widgets',
            ]}
            isCurrent={currentPlanId === 'starter'}
            isSubmitting={submittingPlanId === 'starter'}
            onSubscribe={() => void handleSubscribe('starter')}
            userIsAuthenticated={Boolean(user)}
          />
          <PricingTier
            name='Professional'
            planId='pro'
            price='97'
            description='Ideal for growing businesses needing more features'
            highlighted={true}
            features={[
              'Everything in Starter, plus:',
              'AI-powered customer support',
              'Advanced call analytics',
              'Call recording (15 days)',
              'Priority support',
              'Unlimited widgets',
            ]}
            isCurrent={currentPlanId === 'pro'}
            isSubmitting={submittingPlanId === 'pro'}
            onSubscribe={() => void handleSubscribe('pro')}
            userIsAuthenticated={Boolean(user)}
          />
          <PricingTier
            name='Enterprise'
            planId='enterprise'
            price='297'
            description='For large organizations requiring full capabilities'
            features={[
              'Everything in Professional, plus:',
              'Custom AI training',
              'Advanced security features',
              'Dedicated account manager',
              'Custom integrations',
              'SLA guarantee',
            ]}
            isCurrent={currentPlanId === 'enterprise'}
            isSubmitting={submittingPlanId === 'enterprise'}
            onSubscribe={() => void handleSubscribe('enterprise')}
            userIsAuthenticated={Boolean(user)}
          />
        </div>

        <div className='mt-16 text-center'>
          <h2 className='text-2xl font-bold mb-4'>Need a Custom Solution?</h2>
          <p className='text-gray-600 mb-8'>
            Contact us to discuss your specific requirements and get a tailored quote.
          </p>
          <Link
            to='/contact'
            className='inline-block bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-900'
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
