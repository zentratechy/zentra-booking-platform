'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPrice } from '@/lib/currency';
import { useToast } from '@/hooks/useToast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getColorScheme, defaultColorScheme } from '@/lib/colorSchemes';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PaymentForm({ amount, onSuccess, voucherData, businessData, colorScheme }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setLoading(false);
      } else if (paymentIntent) {
        // Payment successful
        await onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full text-white py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: colorScheme.colors.primary }}
        onMouseEnter={(e) => !loading && !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = colorScheme.colors.primaryDark)}
        onMouseLeave={(e) => !loading && !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = colorScheme.colors.primary)}
      >
        {loading ? 'Processing...' : `Pay ${formatPrice(amount, businessData?.currency || 'GBP')}`}
      </button>
    </form>
  );
}

export default function VoucherPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const { showToast, ToastContainer } = useToast();
  
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState(defaultColorScheme);
  const [sendToMyself, setSendToMyself] = useState(false);
  const [voucherData, setVoucherData] = useState({
    value: 25,
    recipientName: '',
    recipientEmail: '',
    message: '',
    purchaserName: '',
    purchaserEmail: '',
  });

  useEffect(() => {
    if (businessId) {
      fetchBusinessData();
    }
  }, [businessId]);

  const fetchBusinessData = async () => {
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      if (businessDoc.exists()) {
        const data = businessDoc.data();
        setBusinessData(data);
        // Get color scheme
        const scheme = getColorScheme(data.colorScheme);
        setColorScheme(scheme);
      } else {
        showToast('Business not found', 'error');
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
      showToast('Failed to load business information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessData) return;

    // Validate form
    if (!voucherData.recipientName || !voucherData.recipientEmail || !voucherData.purchaserName || !voucherData.purchaserEmail || voucherData.value <= 0) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Check if Stripe is connected
    const stripeAccountId = businessData.paymentConfig?.stripe?.accountId;
    if (!stripeAccountId) {
      showToast('Payment processing is not available for this business', 'error');
      return;
    }

    try {
      // Create payment intent
      const response = await fetch('/api/vouchers/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: businessId,
          voucherValue: voucherData.value,
          recipientName: voucherData.recipientName,
          recipientEmail: voucherData.recipientEmail,
          message: voucherData.message,
          purchaserName: voucherData.purchaserName,
          purchaserEmail: voucherData.purchaserEmail,
        }),
      });

      const data = await response.json();

      if (response.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setShowPaymentForm(true);
        // Scroll to payment form
        setTimeout(() => {
          const paymentSection = document.getElementById('payment-section');
          if (paymentSection) {
            paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        showToast(data.error || 'Failed to initialize payment', 'error');
      }
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      showToast('Failed to process payment: ' + error.message, 'error');
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Create voucher
      const response = await fetch('/api/vouchers/create-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: businessId,
          voucherValue: voucherData.value,
          recipientName: voucherData.recipientName,
          recipientEmail: voucherData.recipientEmail,
          message: voucherData.message,
          purchaserName: voucherData.purchaserName,
          purchaserEmail: voucherData.purchaserEmail,
          paymentIntentId: paymentIntentId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const isSamePerson = voucherData.recipientEmail === voucherData.purchaserEmail;
        const emailMessage = isSamePerson 
          ? 'Voucher purchased successfully! A confirmation email with your voucher code has been sent to you.'
          : 'Voucher purchased successfully! The recipient and you will both receive confirmation emails.';
        showToast(emailMessage, 'success');
        // Show success message and reset form after delay
        setTimeout(() => {
          setShowPaymentForm(false);
          setClientSecret(null);
          setPaymentIntentId(null);
          setVoucherData({
            value: 25,
            recipientName: '',
            recipientEmail: '',
            message: '',
            purchaserName: '',
            purchaserEmail: '',
          });
          setSendToMyself(false);
        }, 3000);
      } else {
        showToast(data.error || 'Failed to create voucher', 'error');
      }
    } catch (error: any) {
      console.error('Error creating voucher:', error);
      showToast('Payment succeeded but failed to create voucher. Please contact support.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Business Not Found</h1>
          <p className="text-gray-600">The business you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            {businessData.logo && (
              <img 
                src={businessData.logo} 
                alt={businessData.businessName || businessData.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gift Vouchers - {businessData.businessName || businessData.name}
              </h1>
              <p className="text-gray-600">Purchase a gift voucher for someone special</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voucher Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Purchase Gift Voucher</h2>
            
            {!showPaymentForm ? (
              <form onSubmit={handleContinueToPayment} className="space-y-6">
                {/* Voucher Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voucher Value *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[25, 50, 75, 100, 150, 200].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setVoucherData({ ...voucherData, value })}
                        className={`p-3 rounded-lg border-2 font-semibold transition-colors ${
                          voucherData.value === value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{
                          borderColor: voucherData.value === value ? colorScheme.colors.primary : undefined,
                          color: voucherData.value === value ? colorScheme.colors.primary : undefined,
                        }}
                      >
                        {formatPrice(value, businessData.currency || 'GBP')}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <input
                      type="number"
                      value={voucherData.value}
                      onChange={(e) => setVoucherData({ ...voucherData, value: parseFloat(e.target.value) || 0 })}
                      placeholder="Custom amount"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      min="1"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Purchaser Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Your Details</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={voucherData.purchaserName}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setVoucherData({ ...voucherData, purchaserName: newName });
                        // If "send to myself" is checked, update recipient name too
                        if (sendToMyself) {
                          setVoucherData(prev => ({ ...prev, purchaserName: newName, recipientName: newName }));
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="Enter your name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Email *
                    </label>
                    <input
                      type="email"
                      value={voucherData.purchaserEmail}
                      onChange={(e) => {
                        const newEmail = e.target.value;
                        setVoucherData({ ...voucherData, purchaserEmail: newEmail });
                        // If "send to myself" is checked, update recipient email too
                        if (sendToMyself) {
                          setVoucherData(prev => ({ ...prev, purchaserEmail: newEmail, recipientEmail: newEmail }));
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sendToMyself"
                      checked={sendToMyself}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSendToMyself(checked);
                        if (checked) {
                          // Auto-fill recipient with purchaser details
                          setVoucherData(prev => ({
                            ...prev,
                            recipientName: prev.purchaserName,
                            recipientEmail: prev.purchaserEmail,
                          }));
                        } else {
                          // Clear recipient fields
                          setVoucherData(prev => ({
                            ...prev,
                            recipientName: '',
                            recipientEmail: '',
                          }));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                      style={{ accentColor: colorScheme.colors.primary }}
                    />
                    <label htmlFor="sendToMyself" className="ml-2 text-sm text-gray-700">
                      Send voucher to myself
                    </label>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recipient Details</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      value={voucherData.recipientName}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setVoucherData({ ...voucherData, recipientName: newName });
                        // If "send to myself" is checked, update purchaser name too
                        if (sendToMyself) {
                          setVoucherData(prev => ({ ...prev, recipientName: newName, purchaserName: newName }));
                        }
                      }}
                      disabled={sendToMyself}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${
                        sendToMyself ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="Enter recipient's name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient Email *
                    </label>
                    <input
                      type="email"
                      value={voucherData.recipientEmail}
                      onChange={(e) => {
                        const newEmail = e.target.value;
                        setVoucherData({ ...voucherData, recipientEmail: newEmail });
                        // If "send to myself" is checked, update purchaser email too
                        if (sendToMyself) {
                          setVoucherData(prev => ({ ...prev, recipientEmail: newEmail, purchaserEmail: newEmail }));
                        }
                      }}
                      disabled={sendToMyself}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${
                        sendToMyself ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="Enter recipient's email"
                      required
                    />
                    {sendToMyself && (
                      <p className="mt-1 text-xs text-gray-500">
                        Recipient will be the same as purchaser
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personal Message
                    </label>
                    <textarea
                      value={voucherData.message}
                      onChange={(e) => setVoucherData({ ...voucherData, message: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="Add a personal message (optional)"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  type="submit"
                  className="w-full text-white py-4 px-6 rounded-lg font-semibold transition-colors"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorScheme.colors.primaryDark)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorScheme.colors.primary)}
                >
                  Continue to Payment - {formatPrice(voucherData.value, businessData.currency || 'GBP')}
                </button>
              </form>
            ) : (
              <div id="payment-section">
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Payment Details</h3>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p><strong>Recipient:</strong> {voucherData.recipientName}</p>
                    <p><strong>Amount:</strong> {formatPrice(voucherData.value, businessData.currency || 'GBP')}</p>
                  </div>
                </div>
                {clientSecret && (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: colorScheme.colors.primary,
                        },
                      },
                    }}
                  >
                    <PaymentForm
                      amount={voucherData.value}
                      onSuccess={handlePaymentSuccess}
                      voucherData={voucherData}
                      businessData={businessData}
                      colorScheme={colorScheme}
                    />
                  </Elements>
                )}
              </div>
            )}
          </div>

          {/* Business Info & Terms */}
          <div className="space-y-6">
            {/* Business Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About {businessData.businessName || businessData.name}</h3>
              
              {businessData.description && (
                <p className="text-gray-600 mb-4">{businessData.description}</p>
              )}
              
              <div className="space-y-2">
                {businessData.phone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> {businessData.phone}
                  </p>
                )}
                {businessData.email && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Email:</span> {businessData.email}
                  </p>
                )}
                {businessData.address && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Address:</span> {businessData.address}
                  </p>
                )}
              </div>
            </div>

            {/* Voucher Terms */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Voucher Terms</h3>
              
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Vouchers are valid for 12 months from purchase date</li>
                <li>• Vouchers can be used for any service or product</li>
                <li>• Vouchers cannot be exchanged for cash</li>
                <li>• Vouchers can be used in part or full</li>
                <li>• Vouchers are non-refundable</li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-blue-700 text-sm">
                If you have any questions about purchasing vouchers, please contact {businessData.businessName || businessData.name} directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
