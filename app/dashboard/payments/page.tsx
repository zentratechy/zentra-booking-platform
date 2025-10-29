'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardSidebar from '@/components/DashboardSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, updateDoc, doc, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPrice, getCurrencySymbol } from '@/lib/currency';
import Toast from '@/components/Toast';

// Helper function to safely format dates from Firestore
function formatAppointmentDate(dateValue: any): string {
  try {
    let date: Date;
    
    if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
      // Firestore Timestamp
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      // Already a Date object
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      // ISO string or date string
      date = new Date(dateValue);
    } else if (typeof dateValue === 'number') {
      // Unix timestamp
      date = new Date(dateValue);
    } else if (dateValue?.seconds) {
      // Firestore Timestamp format (seconds + nanoseconds)
      date = new Date(dateValue.seconds * 1000);
    } else {
      console.warn('Invalid date format:', dateValue);
      return 'Invalid Date';
    }

    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value');
      return 'Invalid Date';
    }

    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

function PaymentsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'paid' | 'pending' | 'partial'>('all');
  const [currency, setCurrency] = useState('usd');
  const [businessData, setBusinessData] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [paymentData, setPaymentData] = useState({
    method: 'cash',
    amount: 0,
    notes: '',
    voucherCode: '',
  });

  useEffect(() => {
    if (!user) return;

    const fetchPayments = async () => {
      try {
        // Fetch payments data via API
        const response = await fetch(`/api/payments/data?businessId=${user.uid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch payments data');
        }
        
        const result = await response.json();
        const { appointments: appointmentsData, business: fetchedBusinessData } = result.data;
        
        // Set business data and currency
        if (fetchedBusinessData) {
          setBusinessData(fetchedBusinessData);
          setCurrency(fetchedBusinessData.currency || 'usd');
        }
        
        setAppointments(appointmentsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching payments:', error);
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user]);

  const handleProcessPayment = async () => {
    if (!selectedPayment) return;

    setProcessing(true);
    try {
      const previousAmount = selectedPayment.payment?.amount || 0;
      const totalPaid = previousAmount + paymentData.amount;
      const totalPrice = selectedPayment.price;
      
      let paymentStatus = 'paid';
      let remainingBalance = 0;
      
      if (totalPaid < totalPrice) {
        paymentStatus = 'partial';
        remainingBalance = totalPrice - totalPaid;
      }

      const appointmentRef = doc(db, 'appointments', selectedPayment.id);
      await updateDoc(appointmentRef, {
        'payment.status': paymentStatus,
        'payment.method': paymentData.method,
        'payment.amount': totalPaid,
        'payment.remainingBalance': remainingBalance,
        'payment.lastPaymentAmount': paymentData.amount,
        'payment.lastPaymentMethod': paymentData.method,
        'payment.notes': paymentData.notes,
        updatedAt: serverTimestamp(),
      });

      // Update client's totalSpent if payment is fully paid
      if (paymentStatus === 'paid' && selectedPayment.clientId) {
        const clientRef = doc(db, 'clients', selectedPayment.clientId);
        await updateDoc(clientRef, {
          totalSpent: increment(paymentData.amount),
          updatedAt: serverTimestamp(),
        });
      }

      // Update local state
      setAppointments(appointments.map(apt =>
        apt.id === selectedPayment.id
          ? {
              ...apt,
              payment: {
                ...(apt.payment ? Object.fromEntries(
                  Object.entries(apt.payment).filter(([_, value]) => value !== undefined)
                ) : {}),
                status: paymentStatus,
                method: paymentData.method,
                amount: totalPaid,
                remainingBalance: remainingBalance,
              },
            }
          : apt
      ));

      setToast({ message: 'Payment recorded successfully!', type: 'success' });
      setShowPaymentModal(false);
      setSelectedPayment(null);
      setProcessing(false);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setToast({ message: 'Failed to process payment: ' + error.message, type: 'error' });
      setProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedPayment || refundAmount <= 0) {
      return;
    }

    setProcessing(true);
    try {
      const appointmentRef = doc(db, 'appointments', selectedPayment.id);
      const paidAmount = selectedPayment.payment?.amount || 0;
      const newPaidAmount = Math.max(0, paidAmount - refundAmount);
      const totalPrice = selectedPayment.price || 0;

      // Process payment provider refund if applicable
      let refundId = null;
      const paymentMethod = selectedPayment.payment?.method;
      
      // Stripe refund
      if (paymentMethod === 'card' && selectedPayment.payment?.stripePaymentIntentId) {
        try {
          const refundResponse = await fetch('/api/stripe/create-refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: selectedPayment.payment.stripePaymentIntentId,
              amount: refundAmount,
              reason: refundReason,
            }),
          });

          const refundData = await refundResponse.json();
          
          if (!refundResponse.ok) {
            throw new Error(refundData.error || 'Failed to process refund');
          }
          
          if (refundData.success) {
            refundId = refundData.refund.id;
          } else {
            throw new Error(refundData.error || 'Refund was not successful');
          }
        } catch (error: any) {
          console.error('Error processing Stripe refund:', error);
          setToast({ 
            message: `Stripe refund failed: ${error.message || 'Please try again or contact support'}`, 
            type: 'error' 
          });
          setProcessing(false);
          return; // Stop processing if Stripe refund fails
        }
      }
      
      // Square refund
      if (paymentMethod === 'card' && selectedPayment.payment?.squarePaymentId) {
        try {
          const refundResponse = await fetch('/api/square/create-refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: user!.uid,
              paymentId: selectedPayment.payment.squarePaymentId,
              amount: refundAmount,
              reason: refundReason,
            }),
          });

          const refundData = await refundResponse.json();
          if (refundData.success) {
            refundId = refundData.refund.id;
          }
        } catch (error) {
          console.error('Error processing Square refund:', error);
        }
      }

      // Update appointment with refund
      await updateDoc(appointmentRef, {
        payment: {
          ...(selectedPayment.payment ? Object.fromEntries(
            Object.entries(selectedPayment.payment).filter(([_, value]) => value !== undefined)
          ) : {}),
          amount: newPaidAmount,
          status: newPaidAmount === 0 ? 'refunded' : newPaidAmount < totalPrice ? 'partial' : 'paid',
          remainingBalance: totalPrice - newPaidAmount,
          refunded: true,
          refundAmount: (selectedPayment.payment?.refundAmount || 0) + refundAmount,
          refundReason: refundReason,
          refundDate: new Date().toISOString(),
          refundId: refundId, // Works for both Stripe and Square
          stripeRefundId: selectedPayment.payment?.stripePaymentIntentId ? refundId : null,
          squareRefundId: selectedPayment.payment?.squarePaymentId ? refundId : null,
        },
        updatedAt: serverTimestamp(),
      });

      // Update client's totalSpent (ensure it doesn't go below zero)
      if (selectedPayment.clientId) {
        const clientRef = doc(db, 'clients', selectedPayment.clientId);
        const clientDoc = await getDoc(clientRef);
        const currentTotalSpent = clientDoc.data()?.totalSpent || 0;
        const newTotalSpent = Math.max(0, currentTotalSpent - refundAmount);
        
        await updateDoc(clientRef, {
          totalSpent: newTotalSpent,
          updatedAt: serverTimestamp(),
        });
      }

      // Update local state
      setAppointments(appointments.map(apt =>
        apt.id === selectedPayment.id
          ? {
              ...apt,
              payment: {
                ...(apt.payment ? Object.fromEntries(
                  Object.entries(apt.payment).filter(([_, value]) => value !== undefined)
                ) : {}),
                amount: newPaidAmount,
                status: newPaidAmount === 0 ? 'refunded' : newPaidAmount < totalPrice ? 'partial' : 'paid',
                remainingBalance: totalPrice - newPaidAmount,
                refunded: true,
                refundAmount: (apt.payment?.refundAmount || 0) + refundAmount,
                refundReason: refundReason,
                refundDate: new Date().toISOString(),
                refundId: refundId,
                stripeRefundId: apt.payment?.stripePaymentIntentId ? refundId : null,
                squareRefundId: apt.payment?.squarePaymentId ? refundId : null,
              },
              updatedAt: new Date(),
            }
          : apt
      ));

      const message = refundId 
        ? `Refund of ${formatPrice(refundAmount, currency)} processed successfully!`
        : `Refund of ${formatPrice(refundAmount, currency)} recorded. ${selectedPayment.payment?.method === 'card' ? 'Please process the card refund manually.' : ''}`;
      
      setToast({ message, type: 'success' });
      setShowRefundModal(false);
      setShowDetailsModal(false);
      setRefundAmount(0);
      setRefundReason('');
      setProcessing(false);
    } catch (error: any) {
      console.error('Error processing refund:', error);
      setToast({ message: 'Failed to process refund: ' + (error.message || 'Please try again.'), type: 'error' });
      setProcessing(false);
    }
  };

  // Filter appointments by payment status
  const filteredAppointments = appointments.filter(apt => {
    if (selectedFilter === 'all') return true;
    return apt.payment?.status === selectedFilter;
  });

  // Calculate stats
  const totalRevenue = appointments.reduce((sum, apt) => {
    if (apt.payment?.status === 'paid') {
      return sum + (apt.payment?.amount || apt.price || 0);
    } else if (apt.payment?.status === 'partial') {
      return sum + (apt.payment?.amount || 0);
    }
    return sum;
  }, 0);
  
  const totalPotentialRevenue = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
  const paidAppointments = appointments.filter(apt => apt.payment?.status === 'paid');
  const pendingPayments = appointments.filter(apt => apt.payment?.status === 'pending');
  const depositsPaid = appointments.filter(apt => apt.payment?.status === 'partial');
  
  const outstandingBalance = appointments.reduce((sum, apt) => {
    if (apt.payment?.status === 'partial') {
      return sum + (apt.payment?.remainingBalance || 0);
    } else if (apt.payment?.status === 'pending') {
      return sum + (apt.price || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4">
            <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
            <p className="text-gray-600">Track payments and transaction history</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Revenue Collected</div>
              <div className="text-3xl font-bold text-green-600">{formatPrice(totalRevenue, currency)}</div>
              <div className="text-xs text-gray-500 mt-1">of {formatPrice(totalPotentialRevenue, currency)} potential</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Fully Paid</div>
              <div className="text-3xl font-bold text-green-600">{paidAppointments.length}</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Outstanding</div>
              <div className="text-3xl font-bold text-red-600">{formatPrice(outstandingBalance, currency)}</div>
              <div className="text-xs text-gray-500 mt-1">{pendingPayments.length + depositsPaid.length} appointments</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Deposits Paid</div>
              <div className="text-3xl font-bold text-blue-600">{depositsPaid.length}</div>
            </div>
          </div>

          {/* Quick Summary */}
          <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Payment Overview</h3>
                <p className="text-primary-light">
                  {outstandingBalance > 0 ? 
                    `You have ${formatPrice(outstandingBalance, currency)} in outstanding payments` :
                    'All payments are up to date!'
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{formatPrice(totalRevenue, currency)}</div>
                <div className="text-primary-light">Collected Revenue</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFilter('paid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Paid
              </button>
              <button
                onClick={() => setSelectedFilter('partial')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'partial' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Deposits
              </button>
              <button
                onClick={() => setSelectedFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Pending
              </button>
            </div>
          </div>

          {/* Payments List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payments...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
                <p className="text-gray-600">
                  {selectedFilter === 'all' ? 'No transactions yet' : `No ${selectedFilter} payments`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAppointments.map((apt) => {
                  // Format date using helper function
                  const formattedDate = formatAppointmentDate(apt.date);

                  return (
                    <div key={apt.id} className="p-6 hover:bg-soft-pink/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{apt.clientName}</h4>
                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                              apt.payment?.status === 'paid' ? 'bg-green-100 text-green-700' :
                              apt.payment?.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {apt.payment?.status === 'paid' ? 'Fully Paid' :
                               apt.payment?.status === 'partial' ? 'Deposit Paid' :
                               'Not Paid'}
                            </span>
                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                              apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                              apt.status === 'arrived' ? 'bg-blue-100 text-blue-700' :
                              apt.status === 'started' ? 'bg-yellow-100 text-yellow-700' :
                              apt.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                              apt.status === 'did_not_show' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {apt.status === 'completed' ? 'Completed' :
                               apt.status === 'arrived' ? 'Arrived' :
                               apt.status === 'started' ? 'Started' :
                               apt.status === 'cancelled' ? 'Cancelled' :
                               apt.status === 'did_not_show' ? 'No Show' :
                               'Confirmed'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{apt.serviceName}</span>
                            <span>•</span>
                            <span>{formattedDate}</span>
                            <span>•</span>
                            <span>{apt.time || 'N/A'}</span>
                          </div>
                          {apt.payment?.method && (
                            <div className="text-sm text-gray-600 mt-1">
                              Payment method: {apt.payment.method.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">{formatPrice(apt.price || 0, currency)}</div>
                            {apt.payment?.status === 'partial' && (
                              <div className="text-sm space-y-1">
                                <div className="text-blue-600">
                                  Paid: {formatPrice(apt.payment?.amount || 0, currency)}
                                </div>
                                <div className="text-red-600 font-medium">
                                  Balance: {formatPrice(apt.payment?.remainingBalance || 0, currency)}
                                </div>
                              </div>
                            )}
                            {apt.payment?.status === 'paid' && (
                              <div className="text-sm text-green-600">
                                ✓ Fully Paid
                              </div>
                            )}
                            {apt.payment?.status === 'pending' && (
                              <div className="text-sm text-yellow-600">
                                Not Paid
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedPayment(apt);
                                setShowDetailsModal(true);
                              }}
                              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => router.push('/dashboard/calendar')}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View in Calendar"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                            {(apt.payment?.status === 'pending' || apt.payment?.status === 'partial') && (
                              <button
                                onClick={async () => {
                                  // If appointment doesn't have clientEmail, try to fetch it from client document
                                  let appointmentWithEmail = { ...apt };
                                  
                                  if (!apt.clientEmail && apt.clientId) {
                                    try {
                                      const clientDoc = await getDoc(doc(db, 'clients', apt.clientId));
                                      if (clientDoc.exists()) {
                                        appointmentWithEmail.clientEmail = clientDoc.data().email;
                                      }
                                    } catch (error) {
                                      console.error('Error fetching client email:', error);
                                    }
                                  }
                                  
                                  setSelectedPayment(appointmentWithEmail);
                                  const remainingBalance = apt.payment?.remainingBalance || apt.price;
                                  setPaymentData({
                                    method: 'cash',
                                    amount: remainingBalance,
                                    notes: '',
                                    voucherCode: '',
                                  });
                                  setShowPaymentModal(true);
                                }}
                                className="px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Collect Payment"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="mt-6 flex justify-end">
            <button className="px-6 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold transition-colors flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Transaction Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Appointment Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Appointment Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Client:</span>
                      <p className="font-medium text-gray-900">{selectedPayment.clientName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Service:</span>
                      <p className="font-medium text-gray-900">{selectedPayment.serviceName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <p className="font-medium text-gray-900">
                        {formatAppointmentDate(selectedPayment.date)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Time:</span>
                      <p className="font-medium text-gray-900">{selectedPayment.time}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Staff:</span>
                      <p className="font-medium text-gray-900">{selectedPayment.staffName || 'Any Staff'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="font-medium text-gray-900 capitalize">{selectedPayment.status}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Payment Information</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Price:</span>
                      <span className="font-medium text-gray-900">{formatPrice(selectedPayment.price, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-semibold text-green-600">
                        {formatPrice(selectedPayment.payment?.amount || 0, currency)}
                      </span>
                    </div>
                    {selectedPayment.payment?.remainingBalance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining Balance:</span>
                        <span className="font-semibold text-red-600">
                          {formatPrice(selectedPayment.payment?.remainingBalance || 0, currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium text-gray-900 capitalize">
                        {selectedPayment.payment?.method || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className={`font-semibold capitalize ${
                        selectedPayment.payment?.status === 'paid' ? 'text-green-600' :
                        selectedPayment.payment?.status === 'partial' ? 'text-blue-600' :
                        'text-yellow-600'
                      }`}>
                        {selectedPayment.payment?.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                {(selectedPayment.payment?.notes || selectedPayment.clientEmail || selectedPayment.clientPhone) && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Additional Details</h4>
                    <div className="space-y-2 text-sm">
                      {selectedPayment.clientEmail && (
                        <div>
                          <span className="text-gray-600">Email:</span>
                          <p className="font-medium text-gray-900">{selectedPayment.clientEmail}</p>
                        </div>
                      )}
                      {selectedPayment.clientPhone && (
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <p className="font-medium text-gray-900">{selectedPayment.clientPhone}</p>
                        </div>
                      )}
                      {selectedPayment.payment?.notes && (
                        <div>
                          <span className="text-gray-600">Notes:</span>
                          <p className="font-medium text-gray-900">{selectedPayment.payment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transaction Dates */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Transaction History</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium text-gray-900">
                        {(() => {
                          try {
                            let createDate: Date;
                            if (selectedPayment.createdAt?.toDate && typeof selectedPayment.createdAt.toDate === 'function') {
                              createDate = selectedPayment.createdAt.toDate();
                            } else if (selectedPayment.createdAt instanceof Date) {
                              createDate = selectedPayment.createdAt;
                            } else if (typeof selectedPayment.createdAt === 'string') {
                              createDate = new Date(selectedPayment.createdAt);
                            } else if (selectedPayment.createdAt?.seconds) {
                              createDate = new Date(selectedPayment.createdAt.seconds * 1000);
                            } else {
                              return 'N/A';
                            }
                            
                            if (isNaN(createDate.getTime())) {
                              return 'N/A';
                            }
                            
                            return createDate.toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch (error) {
                            return 'N/A';
                          }
                        })()}
                      </span>
                    </div>
                    {selectedPayment.updatedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium text-gray-900">
                          {(() => {
                            try {
                              let updateDate: Date;
                              if (selectedPayment.updatedAt?.toDate && typeof selectedPayment.updatedAt.toDate === 'function') {
                                updateDate = selectedPayment.updatedAt.toDate();
                              } else if (selectedPayment.updatedAt instanceof Date) {
                                updateDate = selectedPayment.updatedAt;
                              } else if (typeof selectedPayment.updatedAt === 'string') {
                                updateDate = new Date(selectedPayment.updatedAt);
                              } else if (selectedPayment.updatedAt?.seconds) {
                                updateDate = new Date(selectedPayment.updatedAt.seconds * 1000);
                              } else {
                                return 'N/A';
                              }
                              
                              if (isNaN(updateDate.getTime())) {
                                return 'N/A';
                              }
                              
                              return updateDate.toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            } catch (error) {
                              return 'N/A';
                            }
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                {(selectedPayment.payment?.status === 'paid' || selectedPayment.payment?.status === 'partial') && (
                  <button
                    onClick={() => {
                      // Default to service price, but don't exceed what was actually paid
                      const servicePrice = selectedPayment.price || 0;
                      const paidAmount = selectedPayment.payment?.amount || 0;
                      // Default to the minimum of service price or paid amount
                      setRefundAmount(Math.min(servicePrice, paidAmount));
                      setShowRefundModal(true);
                    }}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                    </svg>
                    Issue Refund
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Issue Refund</h3>
              <p className="text-gray-600 text-center mb-6">
                Refund for <span className="font-semibold">{selectedPayment.clientName}</span>
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">Service Total:</span>
                  <span className="font-semibold text-gray-900">{formatPrice(selectedPayment.price || 0, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Amount Paid:</span>
                  <span className="font-semibold text-gray-900">{formatPrice(selectedPayment.payment?.amount || 0, currency)}</span>
                </div>
                {(selectedPayment.payment?.amount || 0) > (selectedPayment.price || 0) && (
                  <div className="mt-2 pt-2 border-t border-blue-300">
                    <p className="text-xs text-orange-700">
                      ⚠️ Note: Amount paid exceeds service total. This may indicate a deposit or multiple payments.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Refund Amount *</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                    max={Math.max(selectedPayment.payment?.amount || 0, selectedPayment.price || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum: {formatPrice(selectedPayment.payment?.amount || 0, currency)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Refund *</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={3}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Customer request, service issue, etc."
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Note:</p>
                      <p>This will update the payment record. If paid via Stripe, process the refund separately in your Stripe dashboard.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button 
                  type="button"
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundAmount(0);
                    setRefundReason('');
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleRefund}
                  disabled={processing || refundAmount <= 0 || !refundReason || refundAmount > (selectedPayment.payment?.amount || 0)}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Process Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {/* Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Collect Payment</h3>
              <p className="text-gray-600 text-center mb-4">
                Payment for <span className="font-semibold">{selectedPayment.clientName}</span>
              </p>
              
              {selectedPayment.payment?.remainingBalance > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm">
                      <div className="font-medium text-yellow-800">Remaining Balance Due</div>
                      <div className="text-yellow-700">{formatPrice(selectedPayment.payment?.remainingBalance || 0, currency)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Send Payment Link Option */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <svg className="w-6 h-6 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="font-semibold text-gray-900">Payment Link</div>
                    <div className="text-xs text-gray-600">Customer pays online securely</div>
                  </div>
                </div>
                <div className={`grid gap-3 ${selectedPayment.clientEmail ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {selectedPayment.clientEmail && (
                    <button
                      type="button"
                      onClick={async () => {
                        setProcessing(true);
                        try {
                          const paymentLink = `${window.location.origin}/pay/${selectedPayment.id}`;
                          
                          const amountToPay = selectedPayment.payment?.remainingBalance || selectedPayment.price || 0;
                          
                          const response = await fetch('/api/email/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              to: selectedPayment.clientEmail,
                              subject: `Payment Required - ${selectedPayment.serviceName}`,
                              type: 'payment_link',
                              businessId: user?.uid,
                              paymentData: {
                                clientName: selectedPayment.clientName,
                                serviceName: selectedPayment.serviceName,
                                amount: amountToPay,
                                currency: currency,
                                paymentLink: paymentLink,
                              },
                            }),
                          });

                          if (response.ok) {
                            setToast({ message: `✅ Payment link sent to ${selectedPayment.clientEmail}!`, type: 'success' });
                          } else {
                            throw new Error('Failed to send email');
                          }
                        } catch (error: any) {
                          setToast({ message: 'Failed to send email: ' + error.message, type: 'error' });
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      disabled={processing}
                      className="py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {processing ? 'Sending...' : 'Email Link'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const paymentLink = `${window.location.origin}/pay/${selectedPayment.id}`;
                      navigator.clipboard.writeText(paymentLink);
                      setToast({ message: `✅ Payment link copied!`, type: 'success' });
                    }}
                    className={`py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center ${!selectedPayment.clientEmail ? 'w-full' : ''}`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Copy Link
                  </button>
                </div>
                {!selectedPayment.clientEmail && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
                    <p className="text-xs text-yellow-700">
                      ⚠️ No email available - copy link to send manually
                    </p>
                  </div>
                )}
                <p className="text-xs text-center text-gray-500 mt-3">
                  Amount: {formatPrice(selectedPayment.payment?.remainingBalance || selectedPayment.price || 0, currency)} • Or record manual payment below
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentData.method}
                    onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card (In-Person Terminal)</option>
                    <option value="bank_transfer">Bank Transfer (BACS)</option>
                    <option value="check">Check/Cheque</option>
                    <option value="voucher">Gift Voucher</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{getCurrencySymbol(currency)}</span>
                    <input
                      type="number"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      step="0.01"
                      min="0"
                      max={selectedPayment.price}
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    <div>Total due: {formatPrice(selectedPayment.price || 0, currency)}</div>
                    {selectedPayment.payment?.amount > 0 && (
                      <div>Already paid: {formatPrice(selectedPayment.payment?.amount || 0, currency)}</div>
                    )}
                    {selectedPayment.payment?.remainingBalance > 0 && (
                      <div className="text-red-600 font-medium">Remaining: {formatPrice(selectedPayment.payment?.remainingBalance || 0, currency)}</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Payment reference, notes..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button 
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={processing || paymentData.amount <= 0}
                  className="flex-1 px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function Payments() {
  return (
    <ProtectedRoute>
      <PaymentsContent />
    </ProtectedRoute>
  );
}

