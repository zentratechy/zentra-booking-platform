'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function UnsubscribePage() {
  const [email, setEmail] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const businessParam = searchParams.get('business');
    
    if (emailParam) setEmail(emailParam);
    if (businessParam) setBusinessId(businessParam);
    
    // Fetch business name
    if (businessParam) {
      fetchBusinessName(businessParam);
    }
  }, [searchParams]);

  const fetchBusinessName = async (businessId: string) => {
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        setBusinessName(businessData.businessName || businessData.name || 'this business');
      }
    } catch (error) {
      console.error('Error fetching business:', error);
    }
  };

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !businessId) {
      setError('Missing required information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update business settings to add email to unsubscribe list
      const businessRef = doc(db, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);
      
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        const unsubscribedEmails = businessData.unsubscribedEmails || [];
        
        if (!unsubscribedEmails.includes(email)) {
          await updateDoc(businessRef, {
            unsubscribedEmails: [...unsubscribedEmails, email]
          });
        }
        
        setUnsubscribed(true);
      } else {
        setError('Business not found');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setError('Failed to unsubscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (unsubscribed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Successfully Unsubscribed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You have been unsubscribed from emails from {businessName || 'this business'}.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              You will no longer receive appointment reminders, confirmations, or other emails from this business.
            </p>
            <div className="mt-6">
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Unsubscribe from Emails
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You can unsubscribe from emails from {businessName || 'this business'} below.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleUnsubscribe}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your email address"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Unsubscribing...' : 'Unsubscribe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}









