'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

export default function VoucherSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(true);
  const [voucherData, setVoucherData] = useState<any>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      // The webhook should have already processed the payment and created the voucher
      // We can show a success message
      setLoading(false);
      showToast('Voucher purchased successfully! Check your email for the voucher details.', 'success');
    } else {
      setLoading(false);
    }
  }, [searchParams, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your voucher purchase...</p>
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
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Voucher Purchased!</h2>
        <p className="text-gray-600 mb-6">
          Your gift voucher has been successfully purchased and sent to the recipient.
        </p>
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            The voucher details have been sent to both you and the recipient via email.
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="w-full bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-lg font-semibold transition-colors"
        >
          Return Home
        </button>
      </div>
      <ToastContainer />
    </div>
  );
}




