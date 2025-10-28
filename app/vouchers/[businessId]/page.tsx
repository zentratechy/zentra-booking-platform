'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPrice } from '@/lib/currency';
import { useToast } from '@/hooks/useToast';

export default function VoucherPurchasePage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { showToast, ToastContainer } = useToast();
  
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
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

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessData) return;

    setPurchasing(true);
    try {
      console.log('Creating checkout session for voucher:', {
        businessId,
        voucherValue: voucherData.value,
        recipientName: voucherData.recipientName,
        recipientEmail: voucherData.recipientEmail,
      });

      // Create Stripe checkout session for voucher purchase
      const response = await fetch('/api/vouchers/create-checkout', {
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
      console.log('Checkout response:', { status: response.status, data });

      if (response.ok && data.url) {
        console.log('Redirecting to Stripe checkout:', data.url);
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        console.error('Checkout failed:', data);
        showToast(data.error || 'Failed to create checkout session', 'error');
        setPurchasing(false);
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      showToast('Failed to process payment: ' + error.message, 'error');
      setPurchasing(false);
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
            
            <form onSubmit={handlePurchase} className="space-y-6">
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
                    onChange={(e) => setVoucherData({ ...voucherData, recipientName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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
                    onChange={(e) => setVoucherData({ ...voucherData, recipientEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Enter recipient's email"
                    required
                  />
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
                    onChange={(e) => setVoucherData({ ...voucherData, purchaserName: e.target.value })}
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
                    onChange={(e) => setVoucherData({ ...voucherData, purchaserEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Purchase Button */}
              <button
                type="submit"
                disabled={purchasing}
                className="w-full bg-primary hover:bg-primary-dark text-white py-4 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchasing ? 'Processing...' : `Purchase Voucher - ${formatPrice(voucherData.value, businessData.currency || 'GBP')}`}
              </button>
            </form>
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
