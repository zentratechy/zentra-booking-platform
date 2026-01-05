'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const { showToast, ToastContainer } = useToast();
  const [clientSecret, setClientSecret] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const subscriptionId = searchParams.get('subscription_id');
    const clientSecret = searchParams.get('client_secret');

    if (subscriptionId && clientSecret) {
      setSubscriptionId(subscriptionId);
      setClientSecret(clientSecret);
      setLoading(false);
    } else {
      setError('Missing subscription information');
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.href = '/subscription'}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Subscription
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Complete Your Subscription
          </h1>
          <p className="text-gray-600 mb-6">
            You're being redirected to Stripe to complete your payment...
          </p>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Subscription ID:</strong> {subscriptionId}
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  // For now, just show success message
                  showToast('Subscription created successfully! You can now use the features.', 'success');
                  window.location.href = '/subscription';
                }}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Complete Setup
              </button>
              
              <button
                onClick={() => window.location.href = '/subscription'}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
