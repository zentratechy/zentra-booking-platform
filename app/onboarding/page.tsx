'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

export default function Onboarding() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [step, setStep] = useState(1);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'stripe' | 'square' | 'later'>('later');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Business Details
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    
    // Hours
    hours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true },
    },
    
    // Booking Settings
    bookingBuffer: 15,
    requireDeposit: false,
    depositPercentage: 30,
  });

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      const { doc, setDoc, getDoc, addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db, auth } = await import('@/lib/firebase');
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      // Get business data from signup
      const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
      const businessData = businessDoc.data();
      
      // Save onboarding data to Firestore
      await setDoc(doc(db, 'businesses', user.uid), {
        ...formData,
        paymentConfig: {
          provider: selectedPaymentProvider === 'later' ? 'none' : selectedPaymentProvider,
          stripe: selectedPaymentProvider === 'stripe' ? {
            connected: false,
            onboardingComplete: false,
          } : null,
          square: selectedPaymentProvider === 'square' ? {
            connected: false,
          } : null,
        },
        onboardingComplete: true,
        updatedAt: new Date(),
      }, { merge: true });

      // Create default location from onboarding data
      const fullAddress = [
        formData.address,
        formData.city,
        formData.state,
        formData.zipCode
      ].filter(Boolean).join(', ');

      const locationData = {
        businessId: user.uid,
        name: businessData?.businessName || 'Main Location',
        address: fullAddress || '',
        phone: businessData?.phone || '',
        hours: formData.hours,
        createdAt: serverTimestamp(),
      };

      const locationRef = await addDoc(collection(db, 'locations'), locationData);

      // Create staff member for the owner
      const staffData = {
        businessId: user.uid,
        name: businessData?.ownerName || 'Owner',
        email: businessData?.email || user.email,
        phone: businessData?.phone || '',
        locationId: locationRef.id,
        role: 'owner',
        status: 'active',
        services: ['all'], // Default to all services - owner can perform all treatments
        workingHours: formData.hours,
        breaks: [],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'staff'), staffData);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      showToast('Failed to save settings. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-pink via-soft-cream to-secondary/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome to Zentra!
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Let's set up your business in just a few steps</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base ${step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 sm:w-20 h-1 ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          {/* Step 1: Business Details */}
          {step === 1 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Business Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">County <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="County"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="SW1A 1AA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.address || !formData.city || !formData.state || !formData.zipCode}
                  className="bg-primary hover:bg-primary-dark text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Business Hours */}
          {step === 2 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Business Hours & Settings</h2>
              
              <div className="space-y-3 mb-8">
                {Object.entries(formData.hours).map(([day, hours]) => (
                  <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-soft-pink/30 rounded-lg">
                    <div className="w-full sm:w-32 flex-shrink-0">
                      <span className="font-medium text-gray-900 capitalize">{day}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      <label className="flex items-center flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={!hours.closed}
                          onChange={(e) => setFormData({
                            ...formData,
                            hours: {
                              ...formData.hours,
                              [day]: { ...hours, closed: !e.target.checked }
                            }
                          })}
                          className="rounded border-gray-300 text-primary focus:ring-primary mr-2"
                        />
                        <span className="text-sm text-gray-600">Open</span>
                      </label>
                      {!hours.closed && (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => setFormData({
                              ...formData,
                              hours: {
                                ...formData.hours,
                                [day]: { ...hours, open: e.target.value }
                              }
                            })}
                            className="flex-1 min-w-0 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-gray-600 text-sm sm:text-base flex-shrink-0">to</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => setFormData({
                              ...formData,
                              hours: {
                                ...formData.hours,
                                [day]: { ...hours, close: e.target.value }
                              }
                            })}
                            className="flex-1 min-w-0 px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6 mb-8 p-6 bg-soft-cream rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Booking Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Buffer (minutes between appointments)
                  </label>
                  <select
                    value={formData.bookingBuffer}
                    onChange={(e) => setFormData({ ...formData, bookingBuffer: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="0">No buffer</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.requireDeposit}
                    onChange={(e) => setFormData({ ...formData, requireDeposit: e.target.checked })}
                    className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="ml-3">
                    <label className="font-medium text-gray-900">Require deposit for bookings</label>
                    <p className="text-sm text-gray-600">Clients will pay a deposit when booking online</p>
                  </div>
                </div>

                {formData.requireDeposit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deposit Percentage
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={formData.depositPercentage}
                        onChange={(e) => setFormData({ ...formData, depositPercentage: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold text-primary w-16">{formData.depositPercentage}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="bg-primary hover:bg-primary-dark text-white px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment Provider Selection */}
          {step === 3 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Payment Processing</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Choose how you want to accept payments from your clients</p>
              
              <div className="space-y-4 mb-8">
                {/* Stripe Option */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentProvider('stripe')}
                  className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
                    selectedPaymentProvider === 'stripe'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      S
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Stripe</h3>
                      <p className="text-sm text-gray-600 mb-3">Industry-leading payment processor • 1.4% + £0.20 per transaction (European cards)</p>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Accept all major cards, Apple Pay, Google Pay
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Advanced fraud protection
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Recurring billing & subscriptions
                        </li>
                      </ul>
                    </div>
                    {selectedPaymentProvider === 'stripe' && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>

                {/* Square Option */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentProvider('square')}
                  className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
                    selectedPaymentProvider === 'square'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      □
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Square</h3>
                      <p className="text-sm text-gray-600 mb-3">All-in-one payments • 2.5% + £0.10 online, 1.75% in-person</p>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Perfect if you already use Square
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Free card readers for in-person payments
                        </li>
                        <li className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Integrated POS system
                        </li>
                      </ul>
                    </div>
                    {selectedPaymentProvider === 'square' && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>

                {/* Set up Later */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentProvider('later')}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                    selectedPaymentProvider === 'later'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Set up later</h3>
                      <p className="text-sm text-gray-600">You can connect a payment provider anytime in Settings</p>
                    </div>
                    {selectedPaymentProvider === 'later' && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">You keep 100% of your booking revenue</p>
                    <p>Payments go directly to your account. Zentra only charges a monthly subscription fee (£25-£125/month). No transaction fees or revenue sharing.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                >
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="bg-primary hover:bg-primary-dark text-white px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  {loading ? 'Setting up...' : selectedPaymentProvider === 'later' ? 'Complete Setup' : `Connect ${selectedPaymentProvider === 'stripe' ? 'Stripe' : 'Square'}`}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      <ToastContainer />
    </div>
  );
}

