'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { collection, query, orderBy, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/useToast';

// Admin emails - you can move this to environment variables or Firestore config
const ADMIN_EMAILS = ['support@zentrabooking.com', 'admin@zentrabooking.com'];

function TicketsContent() {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      // Check if user is admin
      const checkAdmin = () => {
        if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
          setIsAdmin(true);
          fetchTickets();
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      };
      checkAdmin();
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      const ticketsQuery = query(
        collection(db, 'supportTickets'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(ticketsQuery);
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      showToast('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      showToast('Ticket status updated', 'success');
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      showToast('Failed to update ticket status', 'error');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(ticket => ticket.status === statusFilter);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <DashboardSidebar />
        <div className="ml-64 flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />
      
      <div className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Support Tickets</h1>
              <p className="text-gray-600">Manage and respond to customer support tickets</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="all">All Tickets</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={fetchTickets}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-600">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-600">No tickets found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tickets List */}
              <div className="lg:col-span-2 space-y-4">
                {filteredTickets.map((ticket) => {
                  const statusColors: { [key: string]: string } = {
                    open: 'bg-red-100 text-red-800 border-red-200',
                    in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    resolved: 'bg-green-100 text-green-800 border-green-200',
                    closed: 'bg-gray-100 text-gray-800 border-gray-200',
                  };

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
                        selectedTicket?.id === ticket.id ? '' : 'border-gray-200'
                      }`}
                      style={selectedTicket?.id === ticket.id ? {
                        borderColor: colorScheme.colors.primary
                      } : undefined}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{ticket.subject}</h3>
                          <p className="text-sm text-gray-600 mb-2">{ticket.name} &lt;{ticket.email}&gt;</p>
                          {ticket.businessName && (
                            <p className="text-sm text-gray-500 mb-2">Business: {ticket.businessName}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[ticket.status] || statusColors.open}`}>
                          {ticket.status?.replace('_', ' ').toUpperCase() || 'OPEN'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">{ticket.message}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Ticket #{ticket.id.slice(0, 8)}</span>
                        <span>{formatDate(ticket.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ticket Details */}
              <div className="lg:col-span-1">
                {selectedTicket ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">Ticket Details</h2>
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={selectedTicket.status || 'open'}
                          onChange={(e) => handleStatusUpdate(selectedTicket.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                          style={{ 
                            borderColor: selectedTicket.status ? undefined : '#d1d5db'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = colorScheme.colors.primary;
                            e.currentTarget.style.boxShadow = `0 0 0 2px ${colorScheme.colors.primary}33`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.boxShadow = '';
                          }}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ticket ID</label>
                        <p className="text-sm text-gray-600 font-mono">{selectedTicket.id}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <p className="text-sm text-gray-600">{selectedTicket.name}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <a
                          href={`mailto:${selectedTicket.email}`}
                          className="text-sm hover:underline"
                          style={{ color: colorScheme.colors.primary }}
                        >
                          {selectedTicket.email}
                        </a>
                      </div>

                      {selectedTicket.businessName && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Business</label>
                          <p className="text-sm text-gray-600">{selectedTicket.businessName}</p>
                        </div>
                      )}

                      {selectedTicket.businessId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Business ID</label>
                          <p className="text-sm text-gray-600 font-mono">{selectedTicket.businessId}</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <p className="text-sm text-gray-600">{selectedTicket.subject}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.message}</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                        <p className="text-sm text-gray-600">{formatDate(selectedTicket.createdAt)}</p>
                      </div>

                      {selectedTicket.updatedAt && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                          <p className="text-sm text-gray-600">{formatDate(selectedTicket.updatedAt)}</p>
                        </div>
                      )}

                      <div className="pt-4 border-t border-gray-200">
                        <a
                          href={`mailto:${selectedTicket.email}?subject=Re: [Ticket #${selectedTicket.id}] ${selectedTicket.subject}`}
                          className="block w-full px-4 py-2 text-white rounded-lg font-medium text-center transition-colors"
                          style={{ backgroundColor: colorScheme.colors.primary }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                        >
                          Reply via Email
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                    <p className="text-gray-500">Select a ticket to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default function TicketsPage() {
  return (
    <ProtectedRoute>
      <TicketsContent />
    </ProtectedRoute>
  );
}

