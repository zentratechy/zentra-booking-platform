'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { signOutUser } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import DashboardSidebar from '@/components/DashboardSidebar';
import { formatPrice } from '@/lib/currency';

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [businessData, setBusinessData] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('usd');

  const handleLogout = async () => {
    const { error } = await signOutUser();
    if (!error) {
      router.push('/login');
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch business data
        const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
        if (businessDoc.exists()) {
          const data = businessDoc.data();
          setBusinessData(data);
          setCurrency(data.currency || 'usd');
        }

        // Fetch all appointments for stats
        const allAppointmentsQuery = query(
          collection(db, 'appointments'),
          where('businessId', '==', user.uid)
        );
        const allAppointmentsSnapshot = await getDocs(allAppointmentsQuery);
        const allAppointmentsData = allAppointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        setAllAppointments(allAppointmentsData);

        // Fetch today's appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAppointments = allAppointmentsData.filter((apt: any) => {
          const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate.getTime() === today.getTime();
        });
        
        setAppointments(todayAppointments);

        // Fetch clients
        const clientsQuery = query(
          collection(db, 'clients'),
          where('businessId', '==', user.uid)
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientsData);

        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate real stats
  const todayRevenue = appointments.reduce((sum, apt) => {
    if (apt.payment?.status === 'paid') {
      return sum + (apt.payment?.amount || apt.price || 0);
    } else if (apt.payment?.status === 'partial') {
      return sum + (apt.payment?.amount || 0);
    }
    return sum;
  }, 0);

  const totalRevenue = allAppointments.reduce((sum, apt) => {
    if (apt.payment?.status === 'paid') {
      return sum + (apt.payment?.amount || apt.price || 0);
    } else if (apt.payment?.status === 'partial') {
      return sum + (apt.payment?.amount || 0);
    }
    return sum;
  }, 0);

  // New clients this month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newClientsThisMonth = clients.filter(client => {
    const createdAt = client.createdAt?.toDate ? client.createdAt.toDate() : new Date(client.createdAt);
    return createdAt >= firstDayOfMonth;
  }).length;

  // Outstanding payments
  const outstandingPayments = allAppointments.reduce((sum, apt) => {
    if (apt.payment?.status === 'partial') {
      return sum + (apt.payment?.remainingBalance || 0);
    } else if (apt.payment?.status === 'pending') {
      return sum + (apt.price || 0);
    }
    return sum;
  }, 0);

  const stats = [
    { label: 'Today\'s Appointments', value: appointments.length.toString(), icon: 'calendar' },
    { label: 'Today\'s Revenue', value: formatPrice(todayRevenue, currency), icon: 'money' },
    { label: 'Total Clients', value: clients.length.toString(), icon: 'users' },
    { label: 'Outstanding', value: formatPrice(outstandingPayments, currency), icon: 'alert' },
  ];

  return (
    <div className="min-h-screen bg-soft-cream">
      <ToastContainer />
      <DashboardSidebar />

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {businessData?.businessName || 'Loading...'}
                  </div>
                  <div className="text-xs text-gray-600">Admin</div>
                </div>
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                  {businessData?.businessName ? businessData.businessName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <div className={`p-2 rounded-lg ${
                    stat.icon === 'calendar' ? 'bg-primary/10' :
                    stat.icon === 'money' ? 'bg-green-100' :
                    stat.icon === 'users' ? 'bg-blue-100' :
                    'bg-red-100'
                  }`}>
                    {stat.icon === 'calendar' && (
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {stat.icon === 'money' && (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {stat.icon === 'users' && (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    {stat.icon === 'alert' && (
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Booking Link */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/30 rounded-xl p-6 shadow-sm border border-primary/20 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Booking Page</h3>
            <p className="text-sm text-gray-600 mb-3">Share this link with clients to accept online bookings:</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/book/${user?.uid}`}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/book/${user?.uid}`);
                  showToast('Link copied to clipboard!', 'success');
                }}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              <Link
                href={`/book/${user?.uid}`}
                target="_blank"
                className="px-4 py-2 bg-white hover:bg-gray-50 border-2 border-primary text-primary rounded-lg font-medium transition-colors"
              >
                Preview
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => router.push('/dashboard/calendar')}
                className="flex flex-col items-center p-4 hover:bg-soft-pink rounded-lg transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">New Appointment</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard/clients')}
                className="flex flex-col items-center p-4 hover:bg-soft-pink rounded-lg transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Add Client</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard/staff')}
                className="flex flex-col items-center p-4 hover:bg-soft-pink rounded-lg transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Add Staff</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard/payments')}
                className="flex flex-col items-center p-4 hover:bg-soft-pink rounded-lg transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">View Payments</span>
              </button>
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Today's Appointments</h3>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => router.push('/dashboard/calendar')}
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                  >
                    + New Appointment
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading appointments...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="p-12 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments today</h3>
                  <p className="text-gray-600 mb-4">Your schedule is clear for today</p>
                  <button 
                    onClick={() => router.push('/dashboard/calendar')}
                    className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                  >
                    Create Appointment
                  </button>
                </div>
              ) : (
                appointments.map((apt) => (
                  <div key={apt.id} className="p-6 hover:bg-soft-pink/30 transition-colors cursor-pointer" onClick={() => router.push('/dashboard/calendar')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-center min-w-[80px]">
                          <div className="text-lg font-bold text-primary">{apt.time}</div>
                          <div className="text-xs text-gray-600">{apt.duration} min</div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{apt.clientName || 'Client Name'}</h4>
                          <p className="text-sm text-gray-600">{apt.serviceName || 'Service'}</p>
                          <p className="text-xs text-gray-500 mt-1">with {apt.staffName || 'Staff Member'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{formatPrice(apt.price || 0, currency)}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              apt.status === 'completed' ? 'bg-green-100 text-green-700' : 
                              apt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {apt.status || 'pending'}
                            </span>
                            {apt.payment?.status === 'paid' ? (
                              <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                                ✓ Paid
                              </span>
                            ) : apt.payment?.status === 'partial' ? (
                              <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                                Deposit
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                                Unpaid
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

