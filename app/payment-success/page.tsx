'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { formatPrice } from '@/lib/currency';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointmentId');
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    if (appointmentId) {
      updatePayment();
    }
  }, [appointmentId]);

  const updatePayment = async () => {
    try {
      // Fetch appointment
      const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId!));
      if (appointmentDoc.exists()) {
        const aptData = { id: appointmentDoc.id, ...appointmentDoc.data() } as any;
        
        // Update payment status
        const previousAmount = aptData.payment?.amount || 0;
        const paidAmount = aptData.payment?.remainingBalance || 0;
        const totalPaid = previousAmount + paidAmount;

        await updateDoc(doc(db, 'appointments', appointmentId!), {
          'payment.status': 'paid',
          'payment.amount': totalPaid,
          'payment.remainingBalance': 0,
          'payment.paidViaLink': true,
          'payment.paidAt': serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Update client's totalSpent
        if (aptData.clientId) {
          await updateDoc(doc(db, 'clients', aptData.clientId), {
            totalSpent: increment(paidAmount),
            updatedAt: serverTimestamp(),
          });
        }

        setAppointment(aptData);

        // Fetch business
        const businessDoc = await getDoc(doc(db, 'businesses', aptData.businessId));
        if (businessDoc.exists()) {
          setBusiness({ id: businessDoc.id, ...businessDoc.data() });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error updating payment:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Processing payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for your payment.
        </p>

        {appointment && business && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-2">
              Your appointment with <strong>{business.name}</strong> is now fully paid.
            </p>
            <div className="text-2xl font-bold text-green-600 mt-3">
              {formatPrice(appointment.payment?.remainingBalance || 0, business.currency)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Payment received</p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-6">
          A confirmation email has been sent to {appointment?.clientEmail}
        </p>

        <button
          onClick={() => router.push('/')}
          className="w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}







