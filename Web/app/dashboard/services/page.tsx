'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPrice, getCurrencySymbol } from '@/lib/currency';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useToast } from '@/hooks/useToast';

function ServicesManagementContent() {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('usd');
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    duration: 30,
    price: '',
    description: '',
    depositRequired: false,
    depositPercentage: 30,
    bufferTime: 0,
  });
  const [saving, setSaving] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<Array<{name: string; color: string}>>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{name: string; color: string} | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#8B7355');

  // Default categories with colors
  const defaultCategories = [
    { name: 'Hair Services', color: '#EC4899' },
    { name: 'Nail Services', color: '#F97316' },
    { name: 'Facial & Skincare', color: '#3B82F6' },
    { name: 'Eye Treatments', color: '#14B8A6' },
    { name: 'Massage & Spa', color: '#10B981' },
    { name: 'Makeup', color: '#F43F5E' },
    { name: 'Waxing & Threading', color: '#EF4444' },
    { name: 'Other', color: '#6B7280' },
  ];

  // Fetch services function (moved outside useEffect for reusability)
  const fetchServices = async () => {
    if (!user) return;
    
    try {
      // Fetch business currency and settings
      const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        setCurrency(businessData.currency || 'usd');
        setBusinessSettings(businessData);
        
        // Fetch service categories
        if (businessData.serviceCategories && Array.isArray(businessData.serviceCategories)) {
          setServiceCategories(businessData.serviceCategories);
        } else {
          // Initialize with default categories if none exist
          setServiceCategories(defaultCategories);
          await updateDoc(doc(db, 'businesses', user.uid), {
            serviceCategories: defaultCategories
          });
        }
      }

      const servicesQuery = query(
        collection(db, 'services'),
        where('businessId', '==', user.uid)
      );
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesData = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setServices(servicesData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching services:', error);
      setLoading(false);
    }
  };

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, [user]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate price
    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || priceValue <= 0) {
      showToast('Please enter a valid price greater than 0', 'error');
      return;
    }

    // Validate category
    if (!formData.category) {
      showToast('Please select a category', 'error');
      return;
    }

    setSaving(true);
    try {
      const newService = {
        businessId: user.uid,
        name: formData.name.trim(),
        category: formData.category,
        duration: formData.duration,
        price: priceValue,
        description: formData.description.trim(),
        depositRequired: formData.depositRequired,
        depositPercentage: formData.depositPercentage,
        bufferTime: formData.bufferTime,
        active: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'services'), newService);
      
      // Add to local state with current timestamp
      setServices([...services, { 
        id: docRef.id, 
        ...newService,
        createdAt: new Date() // Use Date for local display
      }]);
      
      // Reset form with business defaults
      setFormData({
        name: '',
        category: '',
        duration: 30,
        price: '',
        description: '',
        depositRequired: businessSettings?.requireDeposit || false,
        depositPercentage: businessSettings?.depositPercentage || 30,
        bufferTime: businessSettings?.bookingBuffer || 0,
      });
      setShowAddModal(false);
      setSaving(false);
    } catch (error: any) {
      console.error('Error adding service:', error);
      showToast('Failed to add service: ' + (error.message || 'Please try again.'), 'error');
      setSaving(false);
    }
  };

  const handleEditClick = (service: any) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      category: service.category,
      duration: service.duration,
      price: service.price.toString(),
      description: service.description || '',
      depositRequired: service.depositRequired || false,
      depositPercentage: service.depositPercentage || 30,
      bufferTime: service.bufferTime || 0,
    });
    setShowEditModal(true);
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedService) return;

    // Validate price
    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || priceValue <= 0) {
      showToast('Please enter a valid price greater than 0', 'error');
      return;
    }

    setSaving(true);
    try {
      const updatedData = {
        name: formData.name.trim(),
        category: formData.category,
        duration: formData.duration,
        price: priceValue,
        description: formData.description.trim(),
        depositRequired: formData.depositRequired,
        depositPercentage: formData.depositPercentage,
        bufferTime: formData.bufferTime,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'services', selectedService.id), updatedData);
      
      setServices(services.map(s => 
        s.id === selectedService.id ? { 
          ...s, 
          ...updatedData,
          updatedAt: new Date() // Use Date for local display
        } : s
      ));
      
      setFormData({
        name: '',
        category: '',
        duration: 30,
        price: '',
        description: '',
        depositRequired: false,
        depositPercentage: 30,
        bufferTime: 0,
      });
      setSelectedService(null);
      setShowEditModal(false);
      setSaving(false);
    } catch (error: any) {
      console.error('Error updating service:', error);
      showToast('Failed to update service: ' + (error.message || 'Please try again.'), 'error');
      setSaving(false);
    }
  };

  const handleDeleteClick = (service: any) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'services', selectedService.id));
      setServices(services.filter(s => s.id !== selectedService.id));
      
      setSelectedService(null);
      setShowDeleteModal(false);
      setSaving(false);
    } catch (error) {
      console.error('Error deleting service:', error);
      showToast('Failed to delete service. Please try again.', 'error');
      setSaving(false);
    }
  };

  const handleToggleActive = async (service: any) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'services', service.id), {
        active: !service.active
      });
      
      // Update local state
      setServices(services.map(s => 
        s.id === service.id ? { ...s, active: !s.active } : s
      ));
      
      setSaving(false);
    } catch (error) {
      console.error('Error toggling service status:', error);
      showToast('Failed to update service status. Please try again.', 'error');
      setSaving(false);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      'Service Name',
      'Category',
      'Duration (minutes)',
      'Price',
      'Description',
      'Deposit Required (true/false)',
      'Deposit Percentage',
      'Buffer Time (minutes)'
    ];
    
    const csvContent = headers.join(',') + '\n' + 
      'Haircut,Styling,30,50.00,Professional haircut and styling,true,30,15\n' +
      'Manicure,Nail Services,45,35.00,Complete nail care and polish,false,0,10\n' +
      'Facial,Skincare,60,80.00,Deep cleansing facial treatment,true,50,20';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'services_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleCSVExport = () => {
    if (services.length === 0) {
      showToast('No services to export', 'error');
      return;
    }

    // Create CSV content
    const headers = [
      'Name',
      'Category', 
      'Duration (minutes)',
      'Price',
      'Description',
      'Deposit Required',
      'Deposit Percentage',
      'Buffer Time (minutes)'
    ];

    const csvContent = [
      headers.join(','),
      ...services.map(service => [
        service.name || '',
        service.category || '',
        service.duration || 30,
        service.price || 0,
        service.description || '',
        service.depositRequired ? 'true' : 'false',
        service.depositPercentage || 30,
        service.bufferTime || 0
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `services_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleJSONExport = () => {
    if (services.length === 0) {
      showToast('No services to export', 'error');
      return;
    }

    // Create JSON content with all service data
    const exportData = {
      exportDate: new Date().toISOString(),
      businessId: user?.uid,
      totalServices: services.length,
      services: services.map(service => ({
        id: service.id,
        name: service.name,
        category: service.category,
        duration: service.duration,
        price: service.price,
        description: service.description,
        depositRequired: service.depositRequired,
        depositPercentage: service.depositPercentage,
        bufferTime: service.bufferTime,
        createdAt: service.createdAt,
        businessId: service.businessId
      }))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);

    // Create and download file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `services_export_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleJSONImport = async (file: File) => {
    if (!user) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.services || !Array.isArray(data.services)) {
        showToast('Invalid JSON format. Expected a services array.', 'error');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Import services to database
      for (const service of data.services) {
        try {
          const serviceData = {
            businessId: user.uid,
            name: service.name,
            category: service.category,
            duration: service.duration || 30,
            price: service.price || 0,
            description: service.description || '',
            depositRequired: service.depositRequired || false,
            depositPercentage: service.depositPercentage || 30,
            bufferTime: service.bufferTime || 0,
            createdAt: serverTimestamp(),
          };

          // Validate required fields
          if (!serviceData.name || !serviceData.category || !serviceData.price) {
            // Service missing required fields, skipping
            errorCount++;
            continue;
          }

          await addDoc(collection(db, 'services'), serviceData);
          successCount++;
        } catch (error) {
          console.error('Error importing service:', error);
          errorCount++;
        }
      }

      showToast(
        `Import complete! ${successCount} services imported successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
        'success'
      );

      setShowImportModal(false);
      fetchServices(); // Refresh the services list
    } catch (error: any) {
      console.error('Error importing JSON:', error);
      showToast('Failed to import JSON: ' + error.message, 'error');
    } finally {
      setImporting(false);
    }
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

      // Map CSV columns to our service fields
      const getColumnValue = (row: string[], columnName: string) => {
        const index = headers.findIndex(h => h.includes(columnName));
        if (index >= 0) {
          let value = row[index]?.trim() || '';
          // Remove surrounding quotes if they exist
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          return value;
        }
        return '';
      };

      const servicesToImport = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        
        try {
          const name = getColumnValue(row, 'service name') || getColumnValue(row, 'name');
          const category = getColumnValue(row, 'category');
          const duration = parseInt(getColumnValue(row, 'duration')) || 30;
          const price = parseFloat(getColumnValue(row, 'price')) || 0;
          const description = getColumnValue(row, 'description');
          const depositRequired = getColumnValue(row, 'deposit required').toLowerCase() === 'true';
          const depositPercentage = parseInt(getColumnValue(row, 'deposit percentage')) || 30;
          const bufferTime = parseInt(getColumnValue(row, 'buffer time')) || 0;

          if (!name) {
            // Skipping row: No service name provided
            errorCount++;
            continue;
          }

          const serviceData = {
            businessId: user.uid,
            name: name,
            category: category || 'General',
            duration: duration,
            price: price,
            description: description || '',
            depositRequired: depositRequired,
            depositPercentage: depositPercentage,
            bufferTime: bufferTime,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          servicesToImport.push(serviceData);
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          errorCount++;
        }
      }

      // Import services to database
      for (const serviceData of servicesToImport) {
        try {
          await addDoc(collection(db, 'services'), serviceData);
          successCount++;
        } catch (error) {
          console.error('Error importing service:', error);
          errorCount++;
        }
      }

      // Refresh services list
      await fetchServices();

      showToast(
        `Import complete! ${successCount} services imported successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
        'success'
      );

      setShowImportModal(false);
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      showToast('Failed to import CSV: ' + error.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Services</h2>
              <p className="text-gray-600">Manage your service catalog and pricing</p>
            </div>
            <div className="flex space-x-3">
              <div className="relative">
                <button 
                  onClick={() => setShowExportModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center"
                >
                  📤 Export Data
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <button 
                onClick={() => setShowImportModal(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                📁 Import CSV
              </button>
              <button 
                onClick={() => {
                  setFormData({
                    name: '',
                    category: '',
                    duration: 30,
                    price: '',
                    description: '',
                    depositRequired: businessSettings?.requireDeposit || false,
                    depositPercentage: businessSettings?.depositPercentage || 30,
                    bufferTime: businessSettings?.bookingBuffer || 0,
                  });
                  setShowAddModal(true);
                }}
                className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                + Add Service
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Total Services</div>
              <div className="text-3xl font-bold text-gray-900">{services.length}</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Categories</div>
              <div className="text-3xl font-bold text-gray-900">{Object.keys(groupedServices).length}</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Avg. Price</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatPrice(services.length > 0 ? services.reduce((sum, s) => sum + s.price, 0) / services.length : 0, currency)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Avg. Duration</div>
              <div className="text-3xl font-bold text-gray-900">
                {services.length > 0 ? Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length) : 0} min
              </div>
            </div>
          </div>

          {/* Category Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Service Categories</h3>
                <p className="text-sm text-gray-600 mt-1">Customize your service categories and assign colors</p>
              </div>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryColor('#8B7355');
                  setShowCategoryModal(true);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Category</span>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {serviceCategories.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="flex-1 text-sm font-medium text-gray-900">{category.name}</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setNewCategoryName(category.name);
                          setNewCategoryColor(category.color);
                          setShowCategoryModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-primary transition-colors"
                        title="Edit category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          // Check if category is in use
                          const isInUse = services.some(s => s.category === category.name);
                          if (isInUse) {
                            showToast(`Cannot delete "${category.name}" - it's being used by services`, 'error');
                            return;
                          }
                          
                          if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
                            try {
                              const updatedCategories = serviceCategories.filter(c => c.name !== category.name);
                              setServiceCategories(updatedCategories);
                              await updateDoc(doc(db, 'businesses', user!.uid), {
                                serviceCategories: updatedCategories
                              });
                              showToast('Category deleted successfully', 'success');
                            } catch (error) {
                              console.error('Error deleting category:', error);
                              showToast('Failed to delete category', 'error');
                            }
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Services List */}
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No services yet</h3>
                <p className="text-gray-600 mb-4">Add your first service to get started</p>
                <button 
                  onClick={() => {
                    setFormData({
                      name: '',
                      category: '',
                      duration: 30,
                      price: '',
                      description: '',
                      depositRequired: businessSettings?.requireDeposit || false,
                      depositPercentage: businessSettings?.depositPercentage || 30,
                      bufferTime: businessSettings?.bookingBuffer || 0,
                    });
                    setShowAddModal(true);
                  }}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                >
                  Add Service
                </button>
              </div>
            ) : (
              Object.entries(groupedServices).map(([category, categoryServices]) => {
                const categoryData = serviceCategories.find(c => c.name === category);
                const categoryColor = categoryData?.color || '#6B7280';
                
                return (
                <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: categoryColor }}
                    />
                    <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(categoryServices as any[]).map((service) => (
                      <div key={service.id} className="p-6 hover:bg-soft-pink/20 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">{service.name}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${service.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {service.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            {service.description && (
                              <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                            )}
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {service.duration} minutes
                              </div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatPrice(service.price, currency)}
                              </div>
                              {service.depositRequired && (
                                <div className="flex items-center text-primary">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {service.depositPercentage}% deposit required
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button 
                              onClick={() => handleToggleActive(service)}
                              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                                service.active 
                                  ? 'text-orange-600 hover:bg-orange-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {service.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button 
                              onClick={() => handleEditClick(service)}
                              className="px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(service)}
                              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Add Service</h3>
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

            <form onSubmit={handleAddService} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="e.g., Hair Cut & Style"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Select category</option>
                    {serviceCategories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
                  <input 
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    required
                    min="15"
                    step="15"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">{getCurrencySymbol(currency)}</span>
                  <input 
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Brief description of the service..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time (minutes)</label>
                <input 
                  type="number"
                  value={formData.bufferTime}
                  onChange={(e) => setFormData({ ...formData, bufferTime: parseInt(e.target.value) || 0 })}
                  min="0"
                  step="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Extra time added after this service (overrides default setting)</p>
              </div>

              <div className="space-y-3 p-4 bg-soft-cream rounded-lg">
                <div className="flex items-start">
                  <input 
                    type="checkbox"
                    checked={formData.depositRequired}
                    onChange={(e) => setFormData({ ...formData, depositRequired: e.target.checked })}
                    className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="ml-3">
                    <label className="font-medium text-gray-900">Require deposit</label>
                    <p className="text-sm text-gray-600">Clients must pay a deposit when booking</p>
                  </div>
                </div>

                {formData.depositRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deposit Percentage</label>
                    <div className="flex items-center space-x-4">
                      <input 
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={formData.depositPercentage}
                        onChange={(e) => setFormData({ ...formData, depositPercentage: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold text-primary w-16">{formData.depositPercentage}%</span>
                    </div>
                  </div>
                )}
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
                  {saving ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Edit Service</h3>
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedService(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateService} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="e.g., Hair Cut & Style"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Select category</option>
                    {serviceCategories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
                  <input 
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    required
                    min="15"
                    step="15"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">{getCurrencySymbol(currency)}</span>
                  <input 
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Brief description of the service..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time (minutes)</label>
                <input 
                  type="number"
                  value={formData.bufferTime}
                  onChange={(e) => setFormData({ ...formData, bufferTime: parseInt(e.target.value) || 0 })}
                  min="0"
                  step="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Extra time added after this service (overrides default setting)</p>
              </div>

              <div className="space-y-3 p-4 bg-soft-cream rounded-lg">
                <div className="flex items-start">
                  <input 
                    type="checkbox"
                    checked={formData.depositRequired}
                    onChange={(e) => setFormData({ ...formData, depositRequired: e.target.checked })}
                    className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="ml-3">
                    <label className="font-medium text-gray-900">Require deposit</label>
                    <p className="text-sm text-gray-600">Clients must pay a deposit when booking</p>
                  </div>
                </div>

                {formData.depositRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deposit Percentage</label>
                    <div className="flex items-center space-x-4">
                      <input 
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={formData.depositPercentage}
                        onChange={(e) => setFormData({ ...formData, depositPercentage: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold text-primary w-16">{formData.depositPercentage}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedService(null);
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
                  {saving ? 'Updating...' : 'Update Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Service</h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <span className="font-semibold">{selectedService.name}</span>? This action cannot be undone.
              </p>

              <div className="flex space-x-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedService(null);
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleDeleteService}
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
                <h3 className="text-2xl font-bold text-gray-900">Import Services</h3>
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
                    <li>Service Name (required)</li>
                    <li>Category</li>
                    <li>Duration (minutes)</li>
                    <li>Price</li>
                    <li>Description</li>
                    <li>Deposit Required (true/false)</li>
                    <li>Deposit Percentage</li>
                    <li>Buffer Time (minutes)</li>
                  </ul>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV or JSON File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        
                        // Add a small delay to prevent hanging
                        setTimeout(() => {
                          if (file.name.endsWith('.json')) {
                            handleJSONImport(file);
                          } else {
                            handleCSVImport(file);
                          }
                        }, 100);
                        
                        // Reset the input
                        e.target.value = '';
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
                  <p className="mt-2 text-sm text-gray-600">Importing services, please wait...</p>
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

      {/* Export Data Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Export Services Data</h3>
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                Choose your preferred export format. You can import the data back using the Import CSV feature.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => {
                    handleCSVExport();
                    setShowExportModal(false);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export as CSV
                </button>
                
                <button
                  onClick={() => {
                    handleJSONExport();
                    setShowExportModal(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Export as JSON
                </button>
              </div>
              
              <div className="mt-6 text-sm text-gray-500">
                <p><strong>CSV:</strong> Best for spreadsheet editing and re-importing</p>
                <p><strong>JSON:</strong> Complete data with all metadata</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setNewCategoryName('');
                    setNewCategoryColor('#8B7355');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user || !newCategoryName.trim()) {
                  showToast('Please enter a category name', 'error');
                  return;
                }

                // Check if name already exists (unless editing the same category)
                const nameExists = serviceCategories.some(
                  c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase() &&
                  (!editingCategory || c.name !== editingCategory.name)
                );
                if (nameExists) {
                  showToast('A category with this name already exists', 'error');
                  return;
                }

                try {
                  let updatedCategories;
                  if (editingCategory) {
                    // Update existing category
                    updatedCategories = serviceCategories.map(c =>
                      c.name === editingCategory.name
                        ? { name: newCategoryName.trim(), color: newCategoryColor }
                        : c
                    );
                    
                    // Update all services using this category
                    const servicesToUpdate = services.filter(s => s.category === editingCategory.name);
                    for (const service of servicesToUpdate) {
                      await updateDoc(doc(db, 'services', service.id), {
                        category: newCategoryName.trim()
                      });
                    }
                  } else {
                    // Add new category
                    updatedCategories = [...serviceCategories, { name: newCategoryName.trim(), color: newCategoryColor }];
                  }

                  setServiceCategories(updatedCategories);
                  await updateDoc(doc(db, 'businesses', user.uid), {
                    serviceCategories: updatedCategories
                  });

                  showToast(editingCategory ? 'Category updated successfully' : 'Category added successfully', 'success');
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryColor('#8B7355');
                  
                  // Refresh services if category was renamed
                  if (editingCategory) {
                    fetchServices();
                  }
                } catch (error) {
                  console.error('Error saving category:', error);
                  showToast('Failed to save category', 'error');
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="e.g., Hair Services"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color *</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-16 h-16 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
                      placeholder="#8B7355"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter a hex color code (e.g., #8B7355)</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { name: 'Pink', color: '#EC4899' },
                    { name: 'Orange', color: '#F97316' },
                    { name: 'Blue', color: '#3B82F6' },
                    { name: 'Teal', color: '#14B8A6' },
                    { name: 'Green', color: '#10B981' },
                    { name: 'Rose', color: '#F43F5E' },
                    { name: 'Red', color: '#EF4444' },
                    { name: 'Gray', color: '#6B7280' },
                    { name: 'Brown', color: '#8B7355' },
                    { name: 'Purple', color: '#A855F7' },
                  ].map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setNewCategoryColor(preset.color)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:border-gray-300 transition-colors flex items-center space-x-2"
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setNewCategoryName('');
                    setNewCategoryColor('#8B7355');
                  }}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
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

export default function ServicesManagement() {
  return (
    <ProtectedRoute>
      <ServicesManagementContent />
    </ProtectedRoute>
  );
}

