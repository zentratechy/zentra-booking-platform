'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardSidebar from '@/components/DashboardSidebar';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  description: string;
  features: string[];
  limits: {
    staff: number;
    clients: number;
    locations: number;
    appointments: number;
    apiCalls: number;
  };
  popular: boolean;
}

interface CurrentSubscription {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  priceId: string;
}

function SubscriptionPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, ToastContainer } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isUKCustomer, setIsUKCustomer] = useState<boolean | null>(null);
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [isExpiredRedirect, setIsExpiredRedirect] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if user was redirected due to trial expiration
    const expired = searchParams.get('expired');
    if (expired === 'true') {
      setIsExpiredRedirect(true);
      setMessage({
        type: 'error',
        text: 'Your trial has expired. Please subscribe to continue using Zentra.'
      });
    }
    
    fetchPlans();
    fetchCurrentSubscription();
    fetchTrialStatus();
    checkUKLocation();
    
    // Check for success/cancel messages in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setMessage({type: 'success', text: 'Subscription created successfully!'});
    } else if (urlParams.get('canceled') === 'true') {
      setMessage({type: 'error', text: 'Subscription setup was canceled.'});
    }
  }, [user, router]);

  const checkUKLocation = async () => {
    try {
      // Simple IP-based country detection
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setIsUKCustomer(data.country_code === 'GB');
    } catch (error) {
      console.error('Error checking location:', error);
      // Default to allowing access if location check fails
      setIsUKCustomer(true);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans');
      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch(`/api/subscriptions/current?businessId=${user?.uid}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching current subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch(`/api/trial/status?businessId=${user?.uid}`);
      if (response.ok) {
        const data = await response.json();
        setTrialStatus(data.trial);
      }
    } catch (error) {
      console.error('Error fetching trial status:', error);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: user?.uid,
          planId: planId,
          // customerId will be created automatically if not provided
        }),
      });

        if (response.ok) {
          const data = await response.json();
          // Redirect to Stripe Checkout
          if (data.url) {
            window.location.href = data.url;
          } else {
            showToast('Failed to get checkout URL', 'error');
          }
        } else {
          const errorData = await response.json();
          showToast(`Failed to create subscription: ${errorData.details || errorData.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    setShowCancelModal(false);
    showToast('Canceling subscription...', 'info');
    
    try {
        const response = await fetch('/api/subscriptions/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: user?.uid,
          }),
        });

        if (response.ok) {
          showToast('Subscription cancelled successfully. You will retain access until the end of your billing period.', 'success');
          fetchCurrentSubscription();
        } else {
          showToast('Failed to cancel subscription. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        showToast('An error occurred. Please try again.', 'error');
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />
      
      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your Zentra subscription and billing
          </p>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">
                {message.type === 'success' ? '✅' : '❌'}
              </span>
              {message.text}
            </div>
            <button 
              onClick={() => setMessage(null)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Trial Expired Redirect Banner */}
        {isExpiredRedirect && (
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

        {/* Trial Status */}
        {trialStatus && !currentSubscription && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {trialStatus.active ? '🎉 Free Trial Active' : '⏰ Trial Expired'}
                </h2>
                {trialStatus.active ? (
                  <div>
                    <p className="text-lg text-gray-600 mb-4">
                      You have <span className="font-bold text-blue-600">{trialStatus.daysRemaining} days</span> left in your free trial
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${((trialStatus.totalDays - trialStatus.daysRemaining) / trialStatus.totalDays) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Trial ends on {new Date(trialStatus.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg text-red-600 mb-4">
                      Your free trial has expired. Subscribe now to continue using Zentra.
                    </p>
                    <p className="text-sm text-gray-500">
                      Trial ended on {new Date(trialStatus.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              <div className="ml-6">
                {trialStatus.active ? (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{trialStatus.daysRemaining}</div>
                    <div className="text-sm text-gray-500">days left</div>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="text-2xl">🔒</div>
                    <div className="text-sm text-red-500">Expired</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Subscription */}
        {currentSubscription && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Plan</h2>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {currentSubscription.plan} Plan
                </h3>
                <p className="text-lg text-gray-600 mb-2">
                  Next billing: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    currentSubscription.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {currentSubscription.status === 'active' ? '✅ Active' : '❌ Inactive'}
                  </span>
                  {currentSubscription.cancelAtPeriodEnd && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      Cancelling at period end
                    </span>
                  )}
                </div>
              </div>
              <div className="flex space-x-3">
                {currentSubscription.status === 'active' && !currentSubscription.cancelAtPeriodEnd && (
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 text-sm font-semibold text-red-600 hover:text-red-700 border-2 border-red-300 rounded-xl hover:bg-red-50 transition-all duration-200"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* UK Only Notice */}
        {isUKCustomer === false && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Service Not Available</h3>
                <p className="text-red-700 mt-1">
                  Sorry, our subscription service is currently only available to UK customers. 
                  We're working on expanding to other regions soon.
                </p>
              </div>
            </div>
          </div>
        )}

        {isUKCustomer === true && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-blue-800 font-medium">
                🇬🇧 UK Customers Only - All prices are in British Pounds (GBP)
              </p>
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {currentSubscription 
              ? 'Upgrade Your Plan' 
              : trialStatus?.active 
                ? 'Choose Your Plan (Trial Active)' 
                : 'Choose Your Plan (Trial Expired)'}
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-lg border-2 ${
                  plan.popular ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
                } p-8 transition-all duration-200 hover:shadow-xl`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900">£{plan.price}</span>
                    <span className="text-xl text-gray-600">/{plan.interval}</span>
                  </div>
                  <p className="text-gray-600 text-lg">{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-6 h-6 text-green-500 mr-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700 text-base">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading === plan.id || isUKCustomer === false}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                    plan.popular
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl'
                      : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg'
                  } disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100`}
                >
                  {upgrading === plan.id ? 'Processing...' : 
                   isUKCustomer === false ? 'UK Only' : 'Choose Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>

          {/* Billing History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
            <p className="text-gray-600">
              Your billing history will appear here once you have an active subscription.
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Cancel Subscription</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Important:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• You will retain access until your current billing period ends</li>
                    <li>• You can resubscribe anytime to regain premium features</li>
                    <li>• All your data will be preserved</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <ProtectedRoute>
      <SubscriptionPageContent />
    </ProtectedRoute>
  );
}
