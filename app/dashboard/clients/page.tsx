'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardSidebar from '@/components/DashboardSidebar';
import { formatPrice } from '@/lib/currency';
import { useToast } from '@/hooks/useToast';

function ClientsManagementContent() {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showOptions, setShowOptions] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [businessCurrency, setBusinessCurrency] = useState('usd');
  const [clientConsultations, setClientConsultations] = useState<any[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthday: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Calculate client stats from appointments
  const calculateClientStats = async (clientsData: any[]) => {
    if (!user) return;
    
    try {
      // Fetch all appointments for this business
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('businessId', '==', user.uid)
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointments = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Calculate stats for each client
      const clientsWithStats = clientsData.map(client => {
        const clientAppointments = appointments.filter(apt => apt.clientId === client.id);
        
        
        // Calculate total spent from confirmed/completed appointments
        const totalSpent = clientAppointments
          .filter(apt => apt.status === 'completed' || apt.status === 'confirmed')
          .reduce((sum, apt) => {
            // For confirmed/completed appointments, use the price regardless of payment status
            // This represents the total value of services received
            return sum + (apt.price || 0);
          }, 0);

        // Calculate total paid (only paid appointments)
        const totalPaid = clientAppointments
          .filter(apt => (apt.status === 'completed' || apt.status === 'confirmed') && apt.payment?.status === 'paid')
          .reduce((sum, apt) => sum + (apt.payment?.amount || apt.price || 0), 0);

        // Calculate outstanding balance (pending payments)
        const outstandingBalance = clientAppointments
          .filter(apt => (apt.status === 'completed' || apt.status === 'confirmed') && apt.payment?.status === 'pending')
          .reduce((sum, apt) => sum + (apt.price || 0), 0);

        // Calculate total visits (confirmed/completed appointments)
        const totalVisits = clientAppointments.filter(apt => apt.status === 'completed' || apt.status === 'confirmed').length;

        // Get last visit date
        const completedAppointments = clientAppointments.filter(apt => apt.status === 'completed' || apt.status === 'confirmed');
        const lastVisit = completedAppointments.length > 0 
          ? completedAppointments
              .map(apt => apt.date?.toDate ? apt.date.toDate() : new Date(apt.date))
              .sort((a, b) => b.getTime() - a.getTime())[0]
          : null;

        return {
          ...client,
          totalSpent,
          totalPaid,
          outstandingBalance,
          totalVisits,
          lastVisit
        };
      });

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error calculating client stats:', error);
      // Fallback to original data if calculation fails
      setClients(clientsData);
    }
  };

  // Fetch clients and business data
  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch clients data via API
      const response = await fetch(`/api/clients/data?businessId=${user.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch clients data');
      }
      
      const result = await response.json();
      const { clients: clientsData, business: businessData } = result.data;
      
      // Set business currency
      if (businessData) {
        setBusinessCurrency(businessData.currency || 'usd');
      }

      // Calculate stats from appointments
      await calculateClientStats(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const email = formData.email.trim().toLowerCase();
      
      // Check if email already exists
      const existingClientQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', user.uid),
        where('email', '==', email)
      );
      const existingClientSnapshot = await getDocs(existingClientQuery);
      
      if (!existingClientSnapshot.empty) {
        showToast('A client with this email address already exists. Please use a different email address.', 'error');
        setSaving(false);
        return;
      }

      const newClient = {
        businessId: user.uid,
        name: formData.name.trim(),
        email: email,
        phone: formData.phone.trim(),
        birthday: formData.birthday || null,
        notes: formData.notes.trim(),
        loyaltyPoints: 0,
        membershipLevel: 'bronze',
        totalVisits: 0,
        totalSpent: 0,
        lastVisit: null,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'clients'), newClient);
      
      setClients([...clients, { 
        id: docRef.id, 
        ...newClient,
        createdAt: new Date()
      }]);
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        birthday: '',
        notes: '',
      });
      setShowAddModal(false);
      setSaving(false);
      showToast('Client added successfully!', 'success');
    } catch (error: any) {
      console.error('Error adding client:', error);
      showToast('Failed to add client: ' + (error.message || 'Please try again.'), 'error');
      setSaving(false);
    }
  };

  const handleEditClick = (client: any) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      birthday: client.birthday || '',
      notes: client.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClient) return;

    setSaving(true);
    try {
      const email = formData.email.trim().toLowerCase();
      
      // Check if email already exists (excluding the current client)
      if (email !== selectedClient.email.toLowerCase()) {
        const existingClientQuery = query(
          collection(db, 'clients'),
          where('businessId', '==', user.uid),
          where('email', '==', email)
        );
        const existingClientSnapshot = await getDocs(existingClientQuery);
        
        if (!existingClientSnapshot.empty) {
          showToast('A client with this email address already exists. Please use a different email address.', 'error');
          setSaving(false);
          return;
        }
      }

      const updatedData = {
        name: formData.name.trim(),
        email: email,
        phone: formData.phone.trim(),
        birthday: formData.birthday || null,
        notes: formData.notes.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'clients', selectedClient.id), updatedData);
      
      setClients(clients.map(c => 
        c.id === selectedClient.id ? { 
          ...c, 
          ...updatedData,
          updatedAt: new Date()
        } : c
      ));
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        birthday: '',
        notes: '',
      });
      setSelectedClient(null);
      setShowEditModal(false);
      setSaving(false);
      showToast('Client updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating client:', error);
      showToast('Failed to update client: ' + (error.message || 'Please try again.'), 'error');
      setSaving(false);
    }
  };

  const handleDeleteClick = (client: any) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'clients', selectedClient.id));
      setClients(clients.filter(c => c.id !== selectedClient.id));
      
      setSelectedClient(null);
      setShowDeleteModal(false);
      setSaving(false);
      showToast('Client deleted successfully!', 'success');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      showToast('Failed to delete client: ' + (error.message || 'Please try again.'), 'error');
      setSaving(false);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      'Full name',
      'Mobile',
      'Phone', 
      'Email address',
      'Address 1',
      'Address 2',
      'Suburb',
      'Last appt. date',
      'Date added',
      '# of appts.',
      'Date of birth'
    ];
    
    const csvContent = headers.join(',') + '\n' + 
      'John Smith,555-1234,,john@example.com,123 Main St,Apt 1,City,2024-01-15,2024-01-01,5,1990-05-20';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'client_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleCSVImport = async (file: File) => {
    if (!user) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        showToast('CSV file must have at least a header row and one data row', 'error');
        return;
      }

      // Parse header row
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Map Timely columns to our client fields
      const getColumnValue = (row: string[], columnName: string) => {
        const index = headers.findIndex(h => h.includes(columnName));
        return index >= 0 ? row[index]?.trim() : '';
      };

      // Get existing clients to check for duplicates
      const existingClientsQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', user.uid)
      );
      const existingClientsSnapshot = await getDocs(existingClientsQuery);
      const existingClients = existingClientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const existingEmails = new Set(existingClients.map(client => (client as any).email?.toLowerCase().trim()).filter(Boolean));

      const clientsToImport = [];
      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        
        try {
          const name = getColumnValue(row, 'full name') || getColumnValue(row, 'name');
          const email = getColumnValue(row, 'email address') || getColumnValue(row, 'email');
          const phone = getColumnValue(row, 'mobile') || getColumnValue(row, 'phone');
          const address1 = getColumnValue(row, 'address 1');
          const address2 = getColumnValue(row, 'address 2');
          const suburb = getColumnValue(row, 'suburb');
          const dateOfBirth = getColumnValue(row, 'date of birth');

          if (!name) {
            // Skipping row: No name provided
            errorCount++;
            continue;
          }

          // Check for duplicate email
          const emailLower = email?.toLowerCase().trim();
          if (emailLower && existingEmails.has(emailLower)) {
            // Skipping row: Email already exists
            duplicateCount++;
            continue;
          }

          // Combine address fields
          const address = [address1, address2, suburb].filter(Boolean).join(', ');

          // Parse date of birth
          let birthday = '';
          if (dateOfBirth) {
            try {
              const dob = new Date(dateOfBirth);
              if (!isNaN(dob.getTime())) {
                birthday = dob.toISOString().split('T')[0];
              }
            } catch (e) {
              // Invalid date of birth
            }
          }

          const clientData = {
            businessId: user.uid,
            name: name,
            email: email || '',
            phone: phone || '',
            address: address,
            birthday: birthday,
            notes: `Imported from Timely - Last appt: ${getColumnValue(row, 'last appt. date') || 'Unknown'}, Total appts: ${getColumnValue(row, '# of appts.') || '0'}`,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          clientsToImport.push(clientData);
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          errorCount++;
        }
      }

      // Import clients to database
      for (const clientData of clientsToImport) {
        try {
          await addDoc(collection(db, 'clients'), clientData);
          successCount++;
        } catch (error) {
          console.error('Error importing client:', error);
          errorCount++;
        }
      }

      // Refresh clients list
      await fetchData();

      let message = `Import complete! ${successCount} clients imported successfully`;
      if (duplicateCount > 0) message += `, ${duplicateCount} duplicates skipped`;
      if (errorCount > 0) message += `, ${errorCount} errors`;
      
      showToast(message, successCount > 0 ? 'success' : 'error');

      setShowImportModal(false);
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      showToast('Failed to import CSV: ' + error.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleViewDetails = async (client: any) => {
    setSelectedClient(client);
    
    // Fetch consultations for this client
    try {
      const consultationsQuery = query(
        collection(db, 'consultations'),
        where('clientId', '==', client.id)
      );
      const consultationsSnapshot = await getDocs(consultationsQuery);
      const consultationsData = consultationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientConsultations(consultationsData);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      setClientConsultations([]);
    }
    
    // Fetch loyalty transactions for this client
    setLoadingTransactions(true);
    try {
      const transactionsQuery = query(
        collection(db, 'clients', client.id, 'loyaltyTransactions'),
        orderBy('createdAt', 'desc'),
        limit(50) // Get last 50 transactions
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLoyaltyTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching loyalty transactions:', error);
      setLoyaltyTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
    
    setShowDetailsModal(true);
  };

  // Filter clients by search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  // Calculate stats
  const totalLoyaltyPoints = clients.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  const totalSpent = clients.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const goldMembers = clients.filter(c => c.membershipLevel === 'gold').length;

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-16 lg:top-0 z-30 -mx-4 lg:mx-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 lg:gap-4">
            <div className="flex-1 min-w-0 pl-4 lg:pl-0">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1 lg:mb-0">Clients</h2>
              <p className="text-sm lg:text-base text-gray-600 hidden lg:block">Manage your client relationships</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-2 lg:space-x-3 lg:flex-nowrap w-full lg:w-auto px-4 lg:px-0">
              <button 
                onClick={() => setShowImportModal(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 lg:px-6 py-3 lg:py-2 rounded-lg font-semibold transition-colors text-sm lg:text-base min-h-[44px] w-full lg:w-auto"
              >
                📁 Import CSV
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-primary hover:bg-primary-dark text-white px-4 lg:px-6 py-3 lg:py-2 rounded-lg font-semibold transition-colors text-sm lg:text-base min-h-[44px] w-full lg:w-auto"
              >
                + Add Client
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Total Clients</div>
              <div className="text-3xl font-bold text-gray-900">{clients.length}</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Gold Members</div>
              <div className="text-3xl font-bold text-gray-900">{goldMembers}</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Total Loyalty Points</div>
              <div className="text-3xl font-bold text-gray-900">{totalLoyaltyPoints.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Total Revenue</div>
              <div className="text-3xl font-bold text-gray-900">{formatPrice(totalSpent, businessCurrency)}</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients by name, email, or phone..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Clients List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-12 text-center">
                {searchTerm ? (
                  <>
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
                    <p className="text-gray-600">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
                    <p className="text-gray-600 mb-4">Add your first client to get started</p>
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                    >
                      Add Client
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredClients.map((client) => (
                    <div key={client.id} className="p-4 lg:p-6 hover:bg-soft-pink/20 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start space-x-4 flex-1 min-w-0">
                          <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-primary/20 to-secondary/40 rounded-full flex items-center justify-center text-lg lg:text-xl font-bold text-primary flex-shrink-0">
                            {client.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2 gap-2">
                              <h3 className="text-base lg:text-lg font-semibold text-gray-900 truncate">{client.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium self-start ${
                                client.membershipLevel === 'gold' ? 'bg-primary text-white' :
                                client.membershipLevel === 'silver' ? 'bg-gray-300 text-gray-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {client.membershipLevel?.toUpperCase() || 'BRONZE'}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-600 mb-2 gap-1 sm:gap-0">
                              <span className="truncate">{client.email}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate">{client.phone}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm text-gray-600">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{client.loyaltyPoints || 0} points</span>
                              </div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{client.totalVisits || 0} visits</span>
                              </div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="truncate">
                                  {formatPrice(client.totalSpent || 0, businessCurrency)} total
                                  {client.outstandingBalance > 0 && (
                                    <span className="text-red-600 ml-1">
                                      ({formatPrice(client.outstandingBalance, businessCurrency)} pending)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Desktop buttons */}
                        <div className="hidden lg:flex space-x-2">
                          <button 
                            onClick={() => handleViewDetails(client)}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleEditClick(client)}
                            className="px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(client)}
                            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                        {/* Mobile options button */}
                        <div className="lg:hidden relative">
                          <button
                            onClick={() => setShowOptions(showOptions === client.id ? null : client.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Options"
                          >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {showOptions === client.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowOptions(null)}
                              />
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                                <button
                                  onClick={() => {
                                    handleViewDetails(client);
                                    setShowOptions(null);
                                  }}
                                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditClick(client);
                                    setShowOptions(null);
                                  }}
                                  className="w-full px-4 py-3 text-left text-sm text-primary hover:bg-primary/10 transition-colors flex items-center"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteClick(client);
                                    setShowOptions(null);
                                  }}
                                  className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-none lg:rounded-2xl max-w-2xl w-full h-full lg:h-auto max-h-full lg:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Add Client</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="client@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="(123) 456-7890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birthday (optional)</label>
                <input 
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <p className="text-sm text-gray-600 mt-1">For birthday rewards and special offers</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Any important notes about this client..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                  className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Edit Client</h3>
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedClient(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="client@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="(123) 456-7890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birthday (optional)</label>
                <input 
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Any important notes about this client..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedClient(null);
                  }}
                  disabled={saving}
                  className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/40 rounded-full flex items-center justify-center text-2xl font-bold text-primary">
                    {selectedClient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedClient.name}</h3>
                    <p className="text-gray-600">{selectedClient.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedClient(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-soft-cream rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Phone</div>
                    <div className="font-medium text-gray-900">{selectedClient.phone}</div>
                  </div>
                  <div className="p-4 bg-soft-cream rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Email</div>
                    <div className="font-medium text-gray-900">{selectedClient.email}</div>
                  </div>
                  {selectedClient.birthday && (
                    <div className="p-4 bg-soft-cream rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Birthday</div>
                      <div className="font-medium text-gray-900">
                        {new Date(selectedClient.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-soft-cream rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Member Since</div>
                    <div className="font-medium text-gray-900">
                      {selectedClient.createdAt ? new Date(selectedClient.createdAt.toDate ? selectedClient.createdAt.toDate() : selectedClient.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Loyalty Stats */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Loyalty & Stats</h4>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="p-4 bg-primary/10 rounded-lg text-center">
                    <div className="text-3xl font-bold text-primary mb-1">{selectedClient.loyaltyPoints || 0}</div>
                    <div className="text-sm text-gray-600">Points</div>
                  </div>
                  <div className="p-4 bg-soft-cream rounded-lg text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">{selectedClient.totalVisits || 0}</div>
                    <div className="text-sm text-gray-600">Visits</div>
                  </div>
                  <div className="p-4 bg-soft-cream rounded-lg text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">{formatPrice(selectedClient.totalSpent || 0, businessCurrency)}</div>
                    <div className="text-sm text-gray-600">Total Value</div>
                    {selectedClient.outstandingBalance > 0 && (
                      <div className="text-sm text-red-600 mt-1">
                        {formatPrice(selectedClient.outstandingBalance, businessCurrency)} pending
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-soft-cream rounded-lg text-center">
                    <div className="text-xl font-bold text-gray-900 mb-1 uppercase">{selectedClient.membershipLevel || 'Bronze'}</div>
                    <div className="text-sm text-gray-600">Tier</div>
                  </div>
                </div>
              </div>

              {/* Loyalty Transaction History */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Point History</h4>
                {loadingTransactions ? (
                  <div className="p-6 bg-gray-50 rounded-lg text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Loading transactions...</p>
                  </div>
                ) : loyaltyTransactions.length === 0 ? (
                  <div className="p-6 bg-gray-50 rounded-lg text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-600 text-sm">No transaction history yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loyaltyTransactions.map((transaction) => {
                      const transactionDate = transaction.createdAt?.toDate 
                        ? transaction.createdAt.toDate() 
                        : transaction.date?.toDate 
                        ? transaction.date.toDate() 
                        : transaction.createdAt 
                        ? new Date(transaction.createdAt) 
                        : new Date();
                      
                      const isEarned = transaction.type === 'earned';
                      const points = Math.abs(transaction.points || 0);
                      
                      return (
                        <div 
                          key={transaction.id} 
                          className={`p-4 rounded-lg border ${
                            isEarned 
                              ? 'bg-green-50 border-green-200' 
                              : transaction.type === 'expired'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-orange-50 border-orange-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  isEarned 
                                    ? 'bg-green-100 text-green-700' 
                                    : transaction.type === 'expired'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {isEarned ? 'Earned' : transaction.type === 'expired' ? 'Expired' : 'Redeemed'}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {isEarned ? '+' : '-'}{points} points
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{transaction.reason || 'Loyalty transaction'}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {transactionDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Notes</h4>
                  <div className="p-4 bg-soft-cream rounded-lg">
                    <p className="text-gray-700">{selectedClient.notes}</p>
                  </div>
                </div>
              )}

              {/* Consultations */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Consultations</h4>
                  <button
                    onClick={() => {
                      window.location.href = '/dashboard/consultations';
                    }}
                    className="px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    + New Consultation
                  </button>
                </div>
                
                {clientConsultations.length === 0 ? (
                  <div className="p-6 bg-gray-50 rounded-lg text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600 text-sm">No consultations yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientConsultations.map((consultation) => (
                      <div key={consultation.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              consultation.consultationType === 'initial' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {consultation.consultationType === 'initial' ? 'Initial' : 'Follow-up'}
                            </span>
                            <span className="text-xs text-gray-600">
                              {consultation.createdAt?.toDate ? 
                                consultation.createdAt.toDate().toLocaleDateString() : 
                                'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        {consultation.skinType && (
                          <div className="text-sm mb-2">
                            <span className="font-medium text-gray-700">Skin Type:</span>
                            <span className="text-gray-900 ml-2 capitalize">{consultation.skinType}</span>
                          </div>
                        )}
                        
                        {consultation.skinConcerns?.length > 0 && (
                          <div className="text-sm mb-2">
                            <span className="font-medium text-gray-700">Concerns:</span>
                            <span className="text-gray-900 ml-2">{consultation.skinConcerns.join(', ')}</span>
                          </div>
                        )}
                        
                        {consultation.allergies && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-sm mt-2">
                            <span className="font-medium text-red-700">⚠️ Allergies:</span>
                            <span className="text-red-900 ml-2">{consultation.allergies}</span>
                          </div>
                        )}
                        
                        {consultation.recommendedTreatments && (
                          <div className="text-sm mt-2">
                            <span className="font-medium text-gray-700">Recommended:</span>
                            <p className="text-gray-900 mt-1">{consultation.recommendedTreatments}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end space-x-3">
              <button 
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClient(null);
                }}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEditClick(selectedClient);
                }}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors"
              >
                Edit Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Client</h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <span className="font-semibold">{selectedClient.name}</span>? All their appointment history and loyalty points will be lost. This action cannot be undone.
              </p>

              <div className="flex space-x-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedClient(null);
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleDeleteClient}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Import Clients from CSV</h3>
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-gray-900">CSV Format</h4>
                  <button
                    onClick={downloadCSVTemplate}
                    className="text-primary hover:text-primary-dark text-sm font-medium flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Template</span>
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                  <p className="mb-2">Expected columns:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Full name (required)</li>
                    <li>Mobile / Phone</li>
                    <li>Email address</li>
                    <li>Address 1, Address 2, Suburb</li>
                    <li>Date of birth</li>
                    <li>Last appt. date</li>
                    <li># of appts.</li>
                  </ul>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleCSVImport(file);
                      }
                    }}
                    disabled={importing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
                  />
                  {importing && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
                {importing && (
                  <p className="mt-2 text-sm text-gray-600">Importing clients, please wait...</p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

export default function ClientsManagement() {
  return (
    <ProtectedRoute>
      <ClientsManagementContent />
    </ProtectedRoute>
  );
}

