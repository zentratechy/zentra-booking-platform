'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, getDocs, orderBy, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { signOutUser } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';

const ADMIN_EMAIL = 'james@zentrabooking.com';

function AdminDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    openTickets: 0,
    newBusinessesThisMonth: 0,
  });
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'businesses' | 'tickets'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [businessStats, setBusinessStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        router.push('/admin/login');
        return;
      }
      fetchData();
    } else {
      router.push('/admin/login');
    }
  }, [user, router]);

  const fetchBusinessStats = async (businessId: string) => {
    try {
      const [appointmentsSnapshot, clientsSnapshot, staffSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'appointments'), where('businessId', '==', businessId))),
        getDocs(query(collection(db, 'clients'), where('businessId', '==', businessId))),
        getDocs(query(collection(db, 'staff'), where('businessId', '==', businessId))),
      ]);

      const appointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalRevenue = appointments.reduce((sum: number, apt: any) => sum + (apt.payment?.amount || apt.price || 0), 0);
      const completedAppointments = appointments.filter((apt: any) => apt.status === 'completed').length;

      setBusinessStats({
        totalAppointments: appointments.length,
        completedAppointments,
        totalClients: clientsSnapshot.size,
        totalStaff: staffSnapshot.size,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching business stats:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch businesses
      const businessesQuery = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'));
      const businessesSnapshot = await getDocs(businessesQuery);
      const businessesData = businessesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setBusinesses(businessesData);

      // Fetch tickets
      const ticketsQuery = query(
        collection(db, 'supportTickets'),
        orderBy('createdAt', 'desc')
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const ticketsData = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setTickets(ticketsData);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const activeSubscriptions = businessesData.filter(b => b.subscriptionStatus === 'active').length;
      const openTicketsCount = ticketsData.filter(t => t.status === 'open' || t.status === 'in_progress').length;
      const newBusinessesThisMonth = businessesData.filter(b => {
        const createdAt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return createdAt >= startOfMonth;
      }).length;

      // Calculate total revenue (sum of all business revenue)
      const totalRevenue = businessesData.reduce((sum, business) => {
        return sum + (business.totalRevenue || 0);
      }, 0);

      setStats({
        totalBusinesses: businessesData.length,
        activeSubscriptions,
        totalRevenue,
        openTickets: openTicketsCount,
        newBusinessesThisMonth,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    router.push('/admin/login');
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString();
    }
    return new Date(timestamp).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const handleViewBusiness = async (business: any) => {
    setSelectedBusiness(business);
    await fetchBusinessStats(business.id);
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      showToast('Ticket status updated', 'success');
      fetchData();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      showToast('Failed to update ticket status', 'error');
    }
  };

  const filteredBusinesses = businesses.filter(business => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (business.businessName || business.name || '').toLowerCase().includes(search) ||
      (business.email || '').toLowerCase().includes(search) ||
      (business.phone || '').toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Zentra Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Administrative Control Panel</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`px-6 py-4 font-medium transition-colors ${
                selectedTab === 'overview'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('businesses')}
              className={`px-6 py-4 font-medium transition-colors ${
                selectedTab === 'businesses'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Businesses ({stats.totalBusinesses})
            </button>
            <button
              onClick={() => setSelectedTab('tickets')}
              className={`px-6 py-4 font-medium transition-colors ${
                selectedTab === 'tickets'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Support Tickets ({stats.openTickets} open)
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Businesses</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalBusinesses}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{stats.newBusinessesThisMonth} new this month</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Subscriptions</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.totalBusinesses > 0 
                    ? `${Math.round((stats.activeSubscriptions / stats.totalBusinesses) * 100)}% active`
                    : '0% active'}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Across all businesses</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Open Tickets</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.openTickets}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{tickets.length} total tickets</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Businesses */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Businesses</h2>
                <div className="space-y-3">
                  {businesses.slice(0, 5).map((business) => (
                    <div key={business.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{business.businessName || business.name || 'Unnamed Business'}</p>
                        <p className="text-sm text-gray-600">{business.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatDate(business.createdAt)}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          business.subscriptionStatus === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {business.subscriptionStatus || 'inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Tickets */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Support Tickets</h2>
                <div className="space-y-3">
                  {tickets.slice(0, 5).map((ticket) => {
                    const statusColors: { [key: string]: string } = {
                      open: 'bg-red-100 text-red-800',
                      in_progress: 'bg-yellow-100 text-yellow-800',
                      resolved: 'bg-green-100 text-green-800',
                      closed: 'bg-gray-100 text-gray-800',
                    };
                    return (
                      <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium text-gray-900 text-sm">{ticket.subject}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status] || statusColors.open}`}>
                            {ticket.status?.replace('_', ' ').toUpperCase() || 'OPEN'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{ticket.name} &lt;{ticket.email}&gt;</p>
                        <p className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Businesses Tab */}
        {selectedTab === 'businesses' && (
          <div className="space-y-6">
            {selectedBusiness ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedBusiness.businessName || selectedBusiness.name || 'Unnamed Business'}</h2>
                    <p className="text-gray-600">{selectedBusiness.email}</p>
                    {selectedBusiness.phone && <p className="text-gray-600">{selectedBusiness.phone}</p>}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBusiness(null);
                      setBusinessStats(null);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                  >
                    Back to List
                  </button>
                </div>

                {businessStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
                      <p className="text-2xl font-bold text-gray-900">{businessStats.totalAppointments}</p>
                      <p className="text-xs text-gray-500 mt-1">{businessStats.completedAppointments} completed</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{businessStats.totalClients}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Staff</p>
                      <p className="text-2xl font-bold text-gray-900">{businessStats.totalStaff}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(businessStats.totalRevenue)}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Subscription Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <p className="font-medium text-gray-900">{selectedBusiness.subscriptionStatus || 'inactive'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Plan</p>
                          <p className="font-medium text-gray-900">{selectedBusiness.subscriptionPlan || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Business Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Created</p>
                          <p className="font-medium text-gray-900">{formatDate(selectedBusiness.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Onboarding</p>
                          <p className="font-medium text-gray-900">{selectedBusiness.onboardingComplete ? 'Complete' : 'In Progress'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">All Businesses</h2>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search businesses..."
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBusinesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewBusiness(business)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{business.businessName || business.name || 'Unnamed'}</div>
                        {business.phone && <div className="text-sm text-gray-500">{business.phone}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{business.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          business.subscriptionStatus === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : business.subscriptionStatus === 'trial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {business.subscriptionStatus || 'inactive'}
                        </span>
                        {business.subscriptionPlan && (
                          <div className="text-xs text-gray-500 mt-1">{business.subscriptionPlan}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(business.totalRevenue || 0)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(business.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          business.onboardingComplete 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {business.onboardingComplete ? 'Active' : 'Setup'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </div>
            )}
          </div>
        )}

        {/* Tickets Tab */}
        {selectedTab === 'tickets' && (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const statusColors: { [key: string]: string } = {
                open: 'bg-red-100 text-red-800 border-red-200',
                in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                resolved: 'bg-green-100 text-green-800 border-green-200',
                closed: 'bg-gray-100 text-gray-800 border-gray-200',
              };

              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-xl shadow-sm border-2 p-6"
                  style={{ borderColor: ticket.status === 'open' ? '#ef4444' : '#e5e7eb' }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{ticket.subject}</h3>
                      <p className="text-sm text-gray-600 mb-1">{ticket.name} &lt;{ticket.email}&gt;</p>
                      {ticket.businessName && (
                        <p className="text-sm text-gray-500 mb-1">Business: {ticket.businessName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={ticket.status || 'open'}
                        onChange={(e) => handleUpdateTicketStatus(ticket.id, e.target.value)}
                        className="px-3 py-1 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      <span>Ticket #{ticket.id.slice(0, 8)}</span>
                      <span className="mx-2">•</span>
                      <span>Created: {formatDate(ticket.createdAt)}</span>
                    </div>
                    <a
                      href={`mailto:${ticket.email}?subject=Re: [Ticket #${ticket.id}] ${ticket.subject}`}
                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      Reply
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default function AdminDashboard() {
  return <AdminDashboardContent />;
}

