'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { formatPrice } from '@/lib/currency';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useToast } from '@/hooks/useToast';

export default function VouchersPage() {
  return (
    <ProtectedRoute>
      <VouchersContent />
    </ProtectedRoute>
  );
}

function VouchersContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [currency, setCurrency] = useState('GBP');
  const [businessName, setBusinessName] = useState('');
  const [businessData, setBusinessData] = useState<any>(null);
  const [voucherSystemActive, setVoucherSystemActive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'redeemed' | 'expired'>('all');
  const [voucherData, setVoucherData] = useState({
    code: '',
    value: 0,
    expiryDate: '',
    recipientName: '',
    recipientEmail: '',
    message: '',
    purchaserName: '',
    purchaserEmail: '',
  });
  const [saving, setSaving] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    if (user) {
      fetchVouchers();
    }
  }, [user]);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      
      // Fetch business data
      const businessQuery = query(collection(db, 'businesses'), where('__name__', '==', user!.uid));
      const businessSnapshot = await getDocs(businessQuery);
      if (!businessSnapshot.empty) {
        const businessData = businessSnapshot.docs[0].data();
        setCurrency(businessData.currency || 'GBP');
        setBusinessName(businessData.businessName || '');
        setBusinessData(businessData);
        // Check if voucher system is active (default to false)
        setVoucherSystemActive(businessData.voucherSystem?.active ?? false);
      }

      // Fetch vouchers
      const vouchersQuery = query(
        collection(db, 'vouchers'),
        where('businessId', '==', user!.uid)
      );
      const vouchersSnapshot = await getDocs(vouchersQuery);
      const vouchersData = vouchersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      setVouchers(vouchersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      setLoading(false);
    }
  };

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSendVoucherEmail = async (voucher: any) => {
    try {
      const response = await fetch('/api/email/send-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: voucher.recipientEmail,
          recipientName: voucher.recipientName,
          voucherCode: voucher.code,
          voucherValue: voucher.originalValue,
          currency: currency,
          message: voucher.message,
          purchaserName: voucher.purchaserName,
          expiryDate: voucher.expiryDate?.toDate ? voucher.expiryDate.toDate().toISOString().split('T')[0] : null,
          businessName: businessName,
          businessId: user?.uid,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      showToast('Voucher email sent successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to send voucher email:', error);
      showToast(`Failed to send voucher email: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!voucherSystemActive) {
      showToast('Please enable the voucher system first', 'error');
      return;
    }

    setSaving(true);
    try {
      const code = voucherData.code || generateVoucherCode();
      const expiryDate = voucherData.expiryDate ? new Date(voucherData.expiryDate) : null;

      const newVoucher = {
        businessId: user.uid,
        code: code,
        value: voucherData.value,
        originalValue: voucherData.value,
        balance: voucherData.value,
        recipientName: voucherData.recipientName,
        recipientEmail: voucherData.recipientEmail,
        message: voucherData.message,
        purchaserName: voucherData.purchaserName,
        purchaserEmail: voucherData.purchaserEmail,
        expiryDate: expiryDate ? Timestamp.fromDate(expiryDate) : null,
        status: 'active',
        redeemed: false,
        redeemedAmount: 0,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'vouchers'), newVoucher);

      // Send voucher email if enabled
      if (sendEmail && voucherData.recipientEmail) {
        try {
          const response = await fetch('/api/email/send-voucher', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientEmail: voucherData.recipientEmail,
              recipientName: voucherData.recipientName,
              voucherCode: code,
              voucherValue: voucherData.value,
              currency: currency,
              message: voucherData.message,
              purchaserName: voucherData.purchaserName,
              expiryDate: voucherData.expiryDate,
              businessName: businessName,
              businessId: user?.uid,
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          showToast('Gift voucher created and email sent successfully!', 'success');
        } catch (emailError: any) {
          console.error('Failed to send voucher email:', emailError);
          showToast(`Voucher created but failed to send email: ${emailError.message || 'Unknown error'}`, 'error');
        }
      } else {
        showToast('Gift voucher created successfully!', 'success');
      }

      setShowCreateModal(false);
      setVoucherData({
        code: '',
        value: 0,
        expiryDate: '',
        recipientName: '',
        recipientEmail: '',
        message: '',
        purchaserName: '',
        purchaserEmail: '',
      });
      fetchVouchers();
    } catch (error: any) {
      console.error('Error creating voucher:', error);
      showToast('Failed to create voucher: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Check if payment provider is connected
  const hasPaymentProvider = () => {
    if (!businessData) return false;
    const stripeConnected = businessData.paymentConfig?.stripe?.accountId;
    const squareConnected = businessData.paymentConfig?.square?.accessToken;
    return !!(stripeConnected || squareConnected);
  };

  const handleToggleVoucherSystem = async () => {
    if (!user) return;

    // If trying to activate, check payment provider
    if (!voucherSystemActive && !hasPaymentProvider()) {
      showToast('Please connect a payment provider (Stripe or Square) in Settings to enable vouchers', 'error');
      return;
    }

    try {
      const newStatus = !voucherSystemActive;
      await updateDoc(doc(db, 'businesses', user.uid), {
        'voucherSystem.active': newStatus,
      });
      setVoucherSystemActive(newStatus);
      showToast(
        newStatus 
          ? 'Voucher system enabled' 
          : 'Voucher system disabled',
        'success'
      );
    } catch (error: any) {
      console.error('Error toggling voucher system:', error);
      showToast('Failed to update voucher system: ' + error.message, 'error');
    }
  };

  const filteredVouchers = vouchers.filter(v => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'active') return v.status === 'active' && v.balance > 0;
    if (selectedFilter === 'redeemed') return v.balance === 0;
    if (selectedFilter === 'expired') {
      if (!v.expiryDate) return false;
      const expiry = v.expiryDate?.toDate ? v.expiryDate.toDate() : new Date(v.expiryDate);
      return expiry < new Date();
    }
    return true;
  });

  // Calculate stats
  const totalValue = vouchers.reduce((sum, v) => sum + (v.originalValue || 0), 0);
  const activeBalance = vouchers.filter(v => v.status === 'active').reduce((sum, v) => sum + (v.balance || 0), 0);
  const redeemedAmount = vouchers.reduce((sum, v) => sum + (v.redeemedAmount || 0), 0);
  const activeCount = vouchers.filter(v => v.status === 'active' && v.balance > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vouchers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      
      <div className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Gift Vouchers</h1>
                <p className="text-gray-600">Create and manage gift vouchers for your business</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Voucher System:</span>
                  <button
                    onClick={handleToggleVoucherSystem}
                    disabled={!voucherSystemActive && !hasPaymentProvider()}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      voucherSystemActive ? 'bg-primary' : 'bg-gray-300'
                    } ${!voucherSystemActive && !hasPaymentProvider() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      voucherSystemActive ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className={`text-sm font-medium ${voucherSystemActive ? 'text-green-600' : 'text-gray-600'}`}>
                    {voucherSystemActive ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={!voucherSystemActive}
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Voucher</span>
                </button>
              </div>
            </div>
            {!voucherSystemActive && !hasPaymentProvider() && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Connect a payment provider (Stripe or Square) in Settings to enable the voucher system
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Sold</p>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalValue, currency)}</p>
              <p className="text-xs text-gray-500 mt-1">{vouchers.length} vouchers</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Active Balance</p>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatPrice(activeBalance, currency)}</p>
              <p className="text-xs text-gray-500 mt-1">{activeCount} active</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Redeemed</p>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-600">{formatPrice(redeemedAmount, currency)}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Outstanding</p>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{formatPrice(activeBalance, currency)}</p>
              <p className="text-xs text-gray-500 mt-1">Yet to be used</p>
            </div>
          </div>

          {/* Voucher Purchase Link */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Share Voucher Purchase Link</h2>
                  <p className="text-sm text-gray-600">Let customers purchase vouchers directly from your website or social media</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/vouchers/${user?.uid}`}
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/vouchers/${user?.uid}`);
                    showToast('Voucher purchase link copied!', 'success');
                  }}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                >
                  Copy Link
                </button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">How to use this link:</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Add to your website footer or contact page</li>
                      <li>• Share on social media posts and stories</li>
                      <li>• Include in email signatures and newsletters</li>
                      <li>• Send directly to customers who want to buy vouchers</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="p-6">
              <div className="flex space-x-2">
                {(['all', 'active', 'redeemed', 'expired'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedFilter === filter
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vouchers List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Vouchers ({filteredVouchers.length})
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher) => {
                  const isExpired = voucher.expiryDate && (voucher.expiryDate?.toDate ? voucher.expiryDate.toDate() : new Date(voucher.expiryDate)) < new Date();
                  const isFullyRedeemed = voucher.balance === 0;
                  
                  return (
                    <div key={voucher.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-mono font-bold text-lg">
                              {voucher.code}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isExpired ? 'bg-red-100 text-red-700' :
                              isFullyRedeemed ? 'bg-gray-100 text-gray-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {isExpired ? 'Expired' : isFullyRedeemed ? 'Fully Redeemed' : 'Active'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-gray-600">Recipient</p>
                              <p className="font-medium text-gray-900">{voucher.recipientName}</p>
                              <p className="text-xs text-gray-500">{voucher.recipientEmail}</p>
                            </div>
                            {voucher.purchaserName && (
                              <div>
                                <p className="text-sm text-gray-600">Purchased by</p>
                                <p className="font-medium text-gray-900">{voucher.purchaserName}</p>
                                <p className="text-xs text-gray-500">{voucher.purchaserEmail}</p>
                              </div>
                            )}
                          </div>

                          {voucher.message && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                              <p className="text-sm text-gray-700 italic">"{voucher.message}"</p>
                            </div>
                          )}

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div>
                              Created: {voucher.createdAt?.toDate ? voucher.createdAt.toDate().toLocaleDateString() : 'N/A'}
                            </div>
                            {voucher.expiryDate && (
                              <div>
                                Expires: {voucher.expiryDate?.toDate ? voucher.expiryDate.toDate().toLocaleDateString() : 'N/A'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right ml-6">
                          <div className="text-sm text-gray-600 mb-1">Balance</div>
                          <div className="text-3xl font-bold text-gray-900 mb-1">
                            {formatPrice(voucher.balance || 0, currency)}
                          </div>
                          <div className="text-xs text-gray-500">
                            of {formatPrice(voucher.originalValue || 0, currency)}
                          </div>
                          {voucher.redeemedAmount > 0 && (
                            <div className="text-xs text-blue-600 mt-2">
                              Used: {formatPrice(voucher.redeemedAmount, currency)}
                            </div>
                          )}
                          
                          {/* Send Email Button */}
                          {voucher.recipientEmail && (
                            <button
                              onClick={() => handleSendVoucherEmail(voucher)}
                              className="mt-2 w-full px-3 py-1 text-xs bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                            >
                              📧 Send Email
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No vouchers found</h3>
                  <p className="text-gray-600 mb-4">Create your first gift voucher</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                  >
                    + Create Voucher
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Voucher Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Create Gift Voucher</h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateVoucher} className="p-6 space-y-4">
              {/* Voucher Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Value *</label>
                <input
                  type="number"
                  value={voucherData.value || ''}
                  onChange={(e) => setVoucherData({ ...voucherData, value: parseFloat(e.target.value) })}
                  required
                  min="1"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="50.00"
                />
                <p className="text-xs text-gray-600 mt-1">Amount the voucher is worth</p>
              </div>

              {/* Custom Code (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voucher Code (Optional)
                </label>
                <input
                  type="text"
                  value={voucherData.code}
                  onChange={(e) => setVoucherData({ ...voucherData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono"
                  placeholder="Leave blank to auto-generate"
                  maxLength={20}
                />
                <p className="text-xs text-gray-600 mt-1">Auto-generates if left blank</p>
              </div>

              {/* Recipient Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Name *</label>
                  <input
                    type="text"
                    value={voucherData.recipientName}
                    onChange={(e) => setVoucherData({ ...voucherData, recipientName: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email *</label>
                  <input
                    type="email"
                    value={voucherData.recipientEmail}
                    onChange={(e) => setVoucherData({ ...voucherData, recipientEmail: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              {/* Purchaser Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchaser Name</label>
                  <input
                    type="text"
                    value={voucherData.purchaserName}
                    onChange={(e) => setVoucherData({ ...voucherData, purchaserName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Gift giver (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchaser Email</label>
                  <input
                    type="email"
                    value={voucherData.purchaserEmail}
                    onChange={(e) => setVoucherData({ ...voucherData, purchaserEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="gifter@example.com"
                  />
                </div>
              </div>

              {/* Personal Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Personal Message (Optional)</label>
                <textarea
                  value={voucherData.message}
                  onChange={(e) => setVoucherData({ ...voucherData, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Happy Birthday! Enjoy your spa day..."
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={voucherData.expiryDate}
                  onChange={(e) => setVoucherData({ ...voucherData, expiryDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-600 mt-1">Leave blank for no expiry</p>
              </div>

              {/* Send Email Toggle */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="sendEmail" className="ml-3 text-sm font-medium text-gray-700">
                    Send beautiful voucher email to recipient
                  </label>
                </div>
                <p className="text-xs text-gray-600 mt-1 ml-7">
                  The recipient will receive a beautifully designed email with their voucher details
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}




