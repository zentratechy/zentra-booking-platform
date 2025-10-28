'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { login, verifyPhone, loading } = useCustomerAuth();
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    verificationCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const phone = urlParams.get('phone');
    const businessId = urlParams.get('businessId');
    
    if (email && phone) {
      setFormData({ email, phone, verificationCode: '' });
      setStep('verify');
      
      // Store businessId for redirect after verification
      if (businessId) {
        sessionStorage.setItem('pendingBusinessId', businessId);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(formData.email, formData.phone);
      if (success) {
        setStep('verify');
      } else {
        setError('Failed to send verification code. Please try again.');
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await verifyPhone(formData.email, formData.phone, formData.verificationCode);
      if (success) {
        // Check if we have a businessId to redirect back to booking page
        const businessId = sessionStorage.getItem('pendingBusinessId');
        if (businessId) {
          sessionStorage.removeItem('pendingBusinessId');
          router.push(`/book/${businessId}`);
        } else {
          // Fallback to my-bookings if no businessId
          router.push('/my-bookings');
        }
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'login' ? 'Sign in to your account' : 'Verify your phone number'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'login' 
              ? 'Enter your email and phone number to receive a verification code'
              : 'Enter the 6-digit code sent to your phone'
            }
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={step === 'login' ? handleLogin : handleVerify}>
          {step === 'login' ? (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your phone number"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  Verification code
                </label>
                <input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  required
                  maxLength={6}
                  value={formData.verificationCode}
                  onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter 6-digit code"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Code sent to {formData.phone}
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {step === 'login' ? 'Sending code...' : 'Verifying...'}
                </div>
              ) : (
                step === 'login' ? 'Send verification code' : 'Verify and sign in'
              )}
            </button>
          </div>

          {step === 'verify' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep('login')}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                ← Back to login
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
