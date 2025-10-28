'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { formatPrice } from '@/lib/currency';
import { getColorScheme } from '@/lib/colorSchemes';
import { awardLoyaltyPoints } from '@/lib/loyalty';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useToast } from '@/hooks/useToast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function isValidClientSecret(secret: string | null | undefined): boolean {
  if (!secret) return false;
  return typeof secret === 'string' && secret.startsWith('pi_') && secret.includes('_secret_');
}

function PaymentForm({ appointment, onSuccess, colorScheme, remainingBalance, business }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?appointmentId=${appointment.id}`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setLoading(false);
      } else {
        await onSuccess();
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
        className="w-full text-white py-4 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: colorScheme.colors.primary }}
      >
        {loading ? 'Processing...' : `Pay ${formatPrice(remainingBalance, appointment.currency || business.currency)}`}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;
  const { showToast, ToastContainer } = useToast();

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [colorScheme, setColorScheme] = useState<any>(null);
  const [paid, setPaid] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      
      // Fetch appointment
      const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
      
      if (!appointmentDoc.exists()) {
        setLoading(false);
        return;
      }

      const aptData = { id: appointmentDoc.id, ...appointmentDoc.data() } as any;
      setAppointment(aptData);

      // Fetch business
      const businessDoc = await getDoc(doc(db, 'businesses', aptData.businessId));
      if (businessDoc.exists()) {
        const businessData = { id: businessDoc.id, ...businessDoc.data() } as any;
        setBusiness(businessData);
        
        const scheme = getColorScheme(businessData.colorScheme || 'purple-elegance');
        setColorScheme(scheme);
        
        // Apply CSS variables
        document.documentElement.style.setProperty('--color-primary', scheme.colors.primary);
        document.documentElement.style.setProperty('--color-primary-dark', scheme.colors.primaryDark);
      }

      // Calculate remaining balance if not set
      const totalPrice = aptData.price || 0;
      const paidAmount = aptData.payment?.amount || 0;
      const remainingBalance = aptData.payment?.remainingBalance ?? (totalPrice - paidAmount);
      
      // Check if there's a remaining balance
      if (remainingBalance > 0) {
        // Create payment intent for remaining balance
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: aptData.businessId,
            serviceId: aptData.serviceId,
            amount: remainingBalance,
            isDeposit: false,
            customerEmail: aptData.clientEmail,
            customerName: aptData.clientName,
            metadata: {
              appointmentId: appointmentId,
              clientName: aptData.clientName,
              type: 'remaining_balance',
            },
          }),
        });

        const data = await response.json();
        console.log('Payment intent response:', { 
          hasClientSecret: !!data.clientSecret, 
          error: data.error,
          status: response.status,
          clientSecretPreview: data.clientSecret ? data.clientSecret.substring(0, 50) + '...' : null
        });
        
        if (data.clientSecret && isValidClientSecret(data.clientSecret)) {
          setClientSecret(data.clientSecret);
        } else if (data.error) {
          console.error('Error creating payment intent:', data.error);
          // Don't show toast here, let the user see the error message instead
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      const previousAmount = appointment.payment?.amount || 0;
      const totalPaid = previousAmount + (appointment.payment?.remainingBalance ?? (appointment.price - previousAmount));

      await updateDoc(doc(db, 'appointments', appointmentId), {
        'payment.status': 'paid',
        'payment.amount': totalPaid,
        'payment.remainingBalance': 0,
        'payment.paidViaLink': true,
        'payment.voucherCode': appliedVoucher?.code,
        'payment.voucherDiscount': voucherDiscount,
        updatedAt: serverTimestamp(),
      });

      // Update client's totalSpent
      if (appointment.clientId) {
        await updateDoc(doc(db, 'clients', appointment.clientId), {
          totalSpent: increment(appointment.payment?.remainingBalance ?? (appointment.price - (appointment.payment?.amount || 0))),
          updatedAt: serverTimestamp(),
        });
      }

      // Award loyalty points for the remaining balance payment
      if (appointment.clientId && appointment.clientEmail) {
        try {
          const remainingAmount = appointment.payment?.remainingBalance ?? (appointment.price - (appointment.payment?.amount || 0));
          const pointsAwarded = await awardLoyaltyPoints(
            appointment.businessId,
            appointment.clientId,
            appointment.clientEmail,
            remainingAmount
          );
          
          if (pointsAwarded) {
          }
        } catch (loyaltyError) {
          console.error('Failed to award loyalty points for remaining balance:', loyaltyError);
          // Don't fail the payment if loyalty points fail
        }
      }

      // If voucher was used, update its status
      if (appliedVoucher) {
        try {
          const { doc: voucherDocRef, getDoc: getVoucherDoc, updateDoc: updateVoucherDoc } = await import('firebase/firestore');
          const voucherDoc = await getVoucherDoc(voucherDocRef(db, 'vouchers', appliedVoucher.id));
          if (voucherDoc.exists()) {
            const voucherData = voucherDoc.data();
            const newBalance = voucherData.balance - voucherDiscount;
            await updateVoucherDoc(voucherDocRef(db, 'vouchers', appliedVoucher.id), {
              balance: newBalance,
              redeemedAmount: (voucherData.redeemedAmount || 0) + voucherDiscount,
              redeemed: newBalance <= 0,
              status: newBalance <= 0 ? 'redeemed' : 'active',
              updatedAt: serverTimestamp(),
            });
          }
        } catch (voucherError) {
          console.error('Failed to update voucher:', voucherError);
        }
      }

      setPaid(true);
    } catch (error: any) {
      console.error('Error updating payment:', error);
      showToast('Payment successful but failed to update records. Please contact the business.', 'error');
    }
  };

  const handleVoucherApply = async () => {
    if (!voucherCode.trim()) {
      showToast('Please enter a voucher code', 'error');
      return;
    }

    try {
      const totalPrice = appointment.price || 0;
      const paidAmount = appointment.payment?.amount || 0;
      const currentRemaining = totalPrice - paidAmount;

      const response = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherCode.toUpperCase(),
          businessId: appointment.businessId,
          amount: currentRemaining
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        // Apply voucher discount
        const discount = Math.min(Number(data.voucher.balance), currentRemaining);
        console.log('Voucher Debug:', {
          voucherBalance: data.voucher.balance,
          currentRemaining,
          discount,
          voucherData: data.voucher
        });
        setAppliedVoucher(data.voucher);
        setVoucherDiscount(discount);
        showToast(`Voucher applied! Discount: ${formatPrice(discount, appointment.currency || business.currency)}`, 'success');
      } else {
        showToast(data.error || 'Invalid voucher code', 'error');
      }
    } catch (error) {
      console.error('Error applying voucher:', error);
      showToast('Failed to apply voucher. Please try again.', 'error');
    }
  };

  const handleVoucherRemove = () => {
    setVoucherCode('');
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    showToast('Voucher removed', 'info');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment || !business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Found</h2>
          <p className="text-gray-600">This payment link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (appointment.payment?.status === 'paid' || paid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Payment Complete!</h2>
          <p className="text-gray-600 mb-4">Thank you for your payment.</p>
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              Your appointment with <strong>{business.name}</strong> is confirmed and fully paid.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate remaining balance for display
  const totalPrice = appointment.price || 0;
  const paidAmount = appointment.payment?.amount || 0;
  const baseRemainingBalance = appointment.payment?.remainingBalance ?? (totalPrice - paidAmount);
  const remainingBalance = Math.max(0, baseRemainingBalance - voucherDiscount);
  
  // Debug logging to help identify the issue
  console.log('Payment Debug:', {
    appointmentId,
    totalPrice,
    paidAmount,
    baseRemainingBalance,
    voucherDiscount,
    remainingBalance,
    paymentStatus: appointment.payment?.status,
    paymentData: appointment.payment
  });
  
  // Check if payment is already completed
  if (appointment.payment?.status === 'paid' || paid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Payment Complete!</h2>
          <p className="text-gray-600 mb-4">Thank you for your payment.</p>
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              Your appointment with <strong>{business.name}</strong> is confirmed and fully paid.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Only show "No Payment Required" if there's truly no remaining balance AND no payment is needed
  if (remainingBalance <= 0 && appointment.payment?.status !== 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Payment Required</h2>
          <p className="text-gray-600">This appointment has been fully paid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colorScheme?.colors.primary }}>
                {business.name}
              </h1>
              <p className="text-sm text-gray-600 mt-1">Complete Your Payment</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Powered by</div>
              <div className="text-xl font-bold" style={{ color: colorScheme?.colors.primary }}>Zentra</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: colorScheme?.colors.primary + '20' }}>
              <svg className="w-8 h-8" style={{ color: colorScheme?.colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Required</h2>
            <p className="text-gray-600">Complete payment for your appointment</p>
          </div>

          {/* Appointment Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Appointment Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-medium">{appointment.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {appointment.date?.toDate ? appointment.date.toDate().toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{appointment.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client:</span>
                <span className="font-medium">{appointment.clientName}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Service Price:</span>
                <span className="font-medium">{formatPrice(appointment.price, appointment.currency || business.currency)}</span>
              </div>
              {appointment.payment?.amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Already Paid (Deposit):</span>
                  <span className="font-medium">-{formatPrice(appointment.payment.amount, appointment.currency || business.currency)}</span>
                </div>
              )}
              <div className="border-t border-purple-200 pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Amount Due:</span>
                <span className="text-2xl font-bold" style={{ color: colorScheme?.colors.primary }}>
                  {formatPrice(remainingBalance, appointment.currency || business.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Voucher Code Input */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Have a Gift Voucher?</h3>
            {!appliedVoucher ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Enter voucher code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleVoucherApply}
                  className="px-6 py-2 rounded-lg font-medium transition-colors"
                  style={{ 
                    backgroundColor: colorScheme?.colors.primary,
                    color: 'white'
                  }}
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 border-2 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Voucher Applied</p>
                    <p className="font-semibold text-green-700">{voucherCode}</p>
                    <p className="text-xs text-gray-500">Discount: {formatPrice(voucherDiscount, appointment.currency || business.currency)}</p>
                  </div>
                  <button
                    onClick={handleVoucherRemove}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Form */}
          {clientSecret && remainingBalance > 0 && isValidClientSecret(clientSecret) ? (
            <Elements 
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: colorScheme?.colors.primary || '#9333ea',
                  },
                },
              }}
            >
              <PaymentForm 
                appointment={appointment}
                onSuccess={handlePaymentSuccess}
                colorScheme={colorScheme}
                remainingBalance={remainingBalance}
                business={business}
              />
            </Elements>
          ) : remainingBalance > 0 && (!clientSecret || !isValidClientSecret(clientSecret)) ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 mb-4">
              <p className="font-semibold mb-1">Payment processing unavailable</p>
              <p className="text-sm">The business may not have completed payment setup yet.</p>
              <p className="text-sm mt-2">Please contact {business.name} directly to complete your payment of {formatPrice(remainingBalance, appointment.currency || business.currency)}.</p>
            </div>
          ) : null}

          <p className="text-xs text-center text-gray-500 mt-4">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

