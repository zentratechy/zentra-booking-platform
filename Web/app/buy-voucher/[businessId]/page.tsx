'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { formatPrice, getCurrencySymbol } from '@/lib/currency';
import { getColorScheme } from '@/lib/colorSchemes';
import { useToast } from '@/hooks/useToast';

export default function BuyVoucherPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const { showToast, ToastContainer } = useToast();

  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [currency, setCurrency] = useState('GBP');
  const [colorScheme, setColorScheme] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  const [voucherData, setVoucherData] = useState({
    value: 50,
    customValue: '',
    recipientName: '',
    recipientEmail: '',
    message: '',
    purchaserName: '',
    purchaserEmail: '',
    purchaserPhone: '',
  });

  const presetValues = [25, 50, 75, 100, 150, 200];

  useEffect(() => {
    fetchBusinessData();
  }, [businessId]);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      const businessQuery = query(collection(db, 'businesses'), where('__name__', '==', businessId));
      const businessSnapshot = await getDocs(businessQuery);

      if (!businessSnapshot.empty) {
        const businessDoc = businessSnapshot.docs[0];
        const businessData = { id: businessDoc.id, ...businessDoc.data() } as any;
        setBusiness(businessData);
        setCurrency(businessData.currency || 'GBP');
        
        // Set color scheme
        const scheme = getColorScheme(businessData.colorScheme || 'purple-elegance');
        setColorScheme(scheme);
        
        // Apply CSS variables
        document.documentElement.style.setProperty('--color-primary', scheme.colors.primary);
        document.documentElement.style.setProperty('--color-primary-dark', scheme.colors.primaryDark);
        document.documentElement.style.setProperty('--color-secondary', scheme.colors.secondary);
        document.documentElement.style.setProperty('--color-accent', scheme.colors.accent);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching business:', error);
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    // Validate required fields
    if (!voucherData.recipientName || !voucherData.recipientEmail || !voucherData.purchaserName || !voucherData.purchaserEmail) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const finalValue = voucherData.customValue ? parseFloat(voucherData.customValue) : voucherData.value;
    if (finalValue <= 0) {
      showToast('Please enter a valid voucher amount', 'error');
      return;
    }

    setProcessing(true);
    try {
      // Create Stripe checkout session for voucher purchase
      const response = await fetch('/api/vouchers/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: businessId,
          voucherValue: finalValue,
          recipientName: voucherData.recipientName,
          recipientEmail: voucherData.recipientEmail,
          message: voucherData.message,
          purchaserName: voucherData.purchaserName,
          purchaserEmail: voucherData.purchaserEmail,
          purchaserPhone: voucherData.purchaserPhone,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Failed to create checkout session', 'error');
        setProcessing(false);
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      showToast('Failed to process payment: ' + error.message, 'error');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h2>
          <p className="text-gray-600 mb-6">This business doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: colorScheme?.colors.primary }}>
                {business.name}
              </h1>
              <p className="text-gray-600 mt-1">Purchase a Gift Voucher</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Powered by</div>
              <div className="text-2xl font-bold" style={{ color: colorScheme?.colors.primary }}>Zentra</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: colorScheme?.colors.primary + '20' }}>
                <svg className="w-8 h-8" style={{ color: colorScheme?.colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Voucher Amount</h2>
              <p className="text-gray-600">Select a preset value or enter a custom amount</p>
            </div>

            {/* Preset Values */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {presetValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setVoucherData({ ...voucherData, value, customValue: '' })}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    voucherData.value === value && !voucherData.customValue
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-white hover:border-primary hover:bg-purple-50'
                  }`}
                  style={voucherData.value === value && !voucherData.customValue ? { 
                    borderColor: colorScheme?.colors.primary,
                    backgroundColor: colorScheme?.colors.primary 
                  } : {}}
                >
                  <div className="text-3xl font-bold">{getCurrencySymbol(currency)}{value}</div>
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Or enter custom amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">{getCurrencySymbol(currency)}</span>
                <input
                  type="number"
                  value={voucherData.customValue}
                  onChange={(e) => setVoucherData({ ...voucherData, customValue: e.target.value, value: 0 })}
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={(!voucherData.value && !voucherData.customValue)}
              className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colorScheme?.colors.primary }}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setStep(1)}
              className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Voucher Details</h2>
              <p className="text-gray-600">Who is this voucher for?</p>
            </div>

            <div className="space-y-6">
              {/* Recipient Details */}
              <div className="bg-purple-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Recipient Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Name *</label>
                    <input
                      type="text"
                      value={voucherData.recipientName}
                      onChange={(e) => setVoucherData({ ...voucherData, recipientName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email *</label>
                    <input
                      type="email"
                      value={voucherData.recipientEmail}
                      onChange={(e) => setVoucherData({ ...voucherData, recipientEmail: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="jane@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Personal Message (Optional)</label>
                    <textarea
                      value={voucherData.message}
                      onChange={(e) => setVoucherData({ ...voucherData, message: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="Happy Birthday! Hope you enjoy your spa day..."
                    />
                  </div>
                </div>
              </div>

              {/* Purchaser Details */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
                    <input
                      type="text"
                      value={voucherData.purchaserName}
                      onChange={(e) => setVoucherData({ ...voucherData, purchaserName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="John Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Email *</label>
                    <input
                      type="email"
                      value={voucherData.purchaserEmail}
                      onChange={(e) => setVoucherData({ ...voucherData, purchaserEmail: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Phone (Optional)</label>
                    <input
                      type="tel"
                      value={voucherData.purchaserPhone}
                      onChange={(e) => setVoucherData({ ...voucherData, purchaserPhone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="+44 123 456 7890"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Voucher Value:</span>
                  <span className="text-2xl font-bold" style={{ color: colorScheme?.colors.primary }}>
                    {formatPrice(voucherData.customValue ? parseFloat(voucherData.customValue) : voucherData.value, currency)}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200 text-sm text-gray-600">
                  <p>✓ Valid for 1 year from purchase date</p>
                  <p>✓ Can be used for any service</p>
                  <p>✓ Transferable to others</p>
                </div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={processing}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colorScheme?.colors.primary }}
              >
                {processing ? 'Processing...' : 'Complete Purchase'}
              </button>

              <p className="text-xs text-center text-gray-500">
                Note: This is a demonstration. In production, this would integrate with your payment provider (Stripe/Square).
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">Purchase Complete!</h2>
            <p className="text-gray-600 mb-8">
              A confirmation email has been sent to <strong>{voucherData.purchaserEmail}</strong>
            </p>

            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-8 mb-8">
              <h3 className="text-sm text-gray-700 mb-2">Your Gift Voucher</h3>
              <div className="text-4xl font-bold mb-4" style={{ color: colorScheme?.colors.primary }}>
                {formatPrice(voucherData.customValue ? parseFloat(voucherData.customValue) : voucherData.value, currency)}
              </div>
              <p className="text-sm text-gray-600">
                The voucher code will be sent to {voucherData.recipientEmail}
              </p>
            </div>

            <button
              onClick={() => router.push(`/book/${businessId}`)}
              className="px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-lg transition-colors"
              style={{ backgroundColor: colorScheme?.colors.primary }}
            >
              Book an Appointment
            </button>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

