'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  description: string;
  features: string[];
  limits: {
    staff: number;
    locations: number;
    clients: number;
    appointments: number;
  };
}

interface CurrentSubscription {
  id: string;
  plan: string;
  status: string;
  currentPeriodEnd: string;
  priceId: string;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, ToastContainer } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUKCustomer, setIsUKCustomer] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [trialStatus, setTrialStatus] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Check for success/cancel messages
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const expired = searchParams.get('expired');

    if (success === 'true') {
      setMessage({
        type: 'success',
        text: 'Subscription created successfully! Welcome to Zentra.'
      });
    } else if (canceled === 'true') {
      setMessage({
        type: 'error',
        text: 'Subscription was canceled. You can try again anytime.'
      });
    } else if (expired === 'true') {
      setMessage({
        type: 'error',
        text: 'Your trial has expired. Please subscribe to continue using Zentra.'
      });
    }

    fetchPlans();
    fetchCurrentSubscription();
    fetchTrialStatus();
    checkUKLocation();
  }, [user, searchParams, router]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans');
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch(`/api/subscriptions/current?businessId=${user?.uid}`);
      const data = await response.json();
      if (data.subscription) {
        setCurrentSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching current subscription:', error);
    }
  };

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch(`/api/trial/status?businessId=${user?.uid}`);
      const data = await response.json();
      if (data.trial) {
        setTrialStatus(data.trial);
      }
    } catch (error) {
      console.error('Error fetching trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUKLocation = async () => {
    // Skip location check to avoid CORS issues
    setIsUKCustomer(true); // Default to UK for now
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: user?.uid,
          planId: planId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to create subscription'
        });
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      setMessage({
        type: 'error',
        text: 'Failed to create subscription. Please try again.'
      });
    }
  };

  const handleCancel = async () => {
    
    try {
      
      if (!user?.uid) {
        showToast('No user UID available', 'error');
        setMessage({
          type: 'error',
          text: 'User not authenticated. Please log in again.'
        });
        return;
      }
      
      
      const requestBody = {
        businessId: user.uid,
      };
      
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || 'Subscription canceled successfully'
        });
        // Refresh subscription data
        fetchCurrentSubscription();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to cancel subscription'
        });
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setMessage({
        type: 'error',
        text: 'Failed to cancel subscription. Please try again.'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-dark mb-4 mx-auto"></div>
          <p className="text-gray-700 text-lg">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-cream">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {trialStatus?.active ? 'Choose Your Plan (Trial Active)' : 'Choose Your Plan'}
          </h1>
          <p className="text-xl text-gray-600">
            Select the perfect plan for your business needs
          </p>
        </div>

        {/* UK Only Notice */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <span className="text-2xl mr-2">🇬🇧</span>
            <span className="font-medium">UK Customers Only</span>
          </div>
        </div>

        {/* Non-UK Customer Message */}
        {isUKCustomer === false && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-red-800">
                  Service Not Available
                </h3>
                <p className="text-red-700 mt-1">
                  Zentra is currently only available to customers in the United Kingdom.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trial Status Banner */}
        {trialStatus?.active && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-blue-800">
                  Trial Active - {trialStatus.daysRemaining} Days Remaining
                </h3>
                <p className="text-blue-700 mt-1">
                  Your trial ends on {new Date(trialStatus.endDate.seconds * 1000).toLocaleDateString()}. 
                  Subscribe now to continue using Zentra after your trial ends.
                </p>
                <div className="mt-3">
                  <div className="bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(trialStatus.daysRemaining / 14) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expired Trial Banner */}
        {trialStatus?.expired && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-red-800">
                  Trial Expired - Subscription Required
                </h3>
                <p className="text-red-700 mt-1">
                  Your 14-day free trial has ended. To continue using Zentra, please choose a subscription plan below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {message && (
          <div className={`mb-8 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border-l-4 border-green-400 text-green-700' 
              : 'bg-red-50 border-l-4 border-red-400 text-red-700'
          }`}>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Current Subscription */}
        {currentSubscription && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Subscription</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">{currentSubscription.plan}</p>
                <p className="text-gray-600">
                  Status: <span className={`font-medium ${
                    currentSubscription.status === 'active' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentSubscription.status}
                  </span>
                </p>
                <p className="text-gray-600">
                  Next billing: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right space-x-3">
                <button
                  onClick={handleCancel}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel Subscription
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-lg p-6 relative ${
                plan.id === 'professional' 
                  ? 'border-blue-500 ring-2 ring-blue-100 transform scale-105' 
                  : 'border-gray-200'
              }`}
            >
              {plan.id === 'professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  £{plan.price}
                  <span className="text-lg font-normal text-gray-600">/{plan.interval}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="text-center">
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isUKCustomer === false}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    isUKCustomer === false
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : plan.id === 'professional'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {currentSubscription ? 'Change Plan' : 'Subscribe Now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
