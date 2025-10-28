'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useToast } from '@/hooks/useToast';
import { useSubscription } from '@/hooks/useSubscription';

function StaffManagementContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { isLimitReached, limits, trialStatus } = useSubscription();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    locationId: '',
    workingHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: true },
    },
    breaks: [] as string[],
    services: [] as string[],
    sendInvite: true,
    photoURL: '',
    isBackOfHouse: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Fetch staff and business data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch staff members
        const staffQuery = query(collection(db, 'staff'), where('businessId', '==', user.uid));
        const staffSnapshot = await getDocs(staffQuery);
        const staffData = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStaffMembers(staffData);

        // Fetch locations
        const locationsQuery = query(collection(db, 'locations'), where('businessId', '==', user.uid));
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocations(locationsData);

        // Fetch services
        const servicesQuery = query(collection(db, 'services'), where('businessId', '==', user.uid));
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(servicesData);

        // Fetch business data
        const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
        if (businessDoc.exists()) {
          setBusinessData(businessDoc.data());
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const handleSelectAllServices = () => {
    setFormData(prev => ({
      ...prev,
      services: services.map(service => service.id)
    }));
  };

  const handleClearAllServices = () => {
    setFormData(prev => ({
      ...prev,
      services: []
    }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast("Invalid file type. Please upload an image file (e.g., JPG, PNG).", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      showToast("File too large. Please upload an image smaller than 2MB.", "error");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check staff limit based on subscription
    if (isLimitReached('staff', staffMembers.length)) {
      setShowLimitModal(true);
      return;
    }

    setSaving(true);
    try {
      const staffData = {
        businessId: user.uid,
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        locationId: formData.locationId || (locations.length === 1 ? locations[0].id : null),
        workingHours: formData.workingHours,
        breaks: formData.breaks,
        services: formData.services,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        photoURL: '',
        isBackOfHouse: formData.isBackOfHouse,
        joinDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        appointments: 0,
        revenue: 0,
      };

      const docRef = await addDoc(collection(db, 'staff'), staffData);
      
      // Upload photo if selected
      if (photoFile) {
        setUploadingPhoto(true);
        const photoURL = await uploadPhoto(docRef.id);
        if (photoURL) {
          await updateDoc(docRef, { photoURL });
        }
        setUploadingPhoto(false);
      }

      // Add to local state
      setStaffMembers([...staffMembers, { id: docRef.id, ...staffData }]);
      
      // Reset form
      setFormData({
        firstName: '', lastName: '', email: '', phone: '', role: '', locationId: '',
        workingHours: {
          monday: { open: '09:00', close: '17:00', closed: false }, tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false }, thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false }, saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { open: '09:00', close: '17:00', closed: true },
        },
        breaks: [], services: [], sendInvite: true, photoURL: '', isBackOfHouse: false,
      });
      setPhotoFile(null);
      setPhotoPreview('');
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding staff:', error);
      showToast('Failed to add staff member. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStaff) return;

    setSaving(true);
    try {
      const updatedData: any = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        locationId: formData.locationId || (locations.length === 1 ? locations[0].id : null),
        workingHours: formData.workingHours,
        breaks: formData.breaks,
        services: formData.services,
        updatedAt: serverTimestamp(),
        isBackOfHouse: formData.isBackOfHouse,
      };

      if (photoFile) {
        setUploadingPhoto(true);
        const photoURL = await uploadPhoto(selectedStaff.id);
        if (photoURL) {
          updatedData.photoURL = photoURL;
        }
        setUploadingPhoto(false);
      } else if (photoPreview === '') {
        // If photo was removed
        updatedData.photoURL = '';
      }

      await updateDoc(doc(db, 'staff', selectedStaff.id), updatedData);

      setStaffMembers(staffMembers.map(s =>
        s.id === selectedStaff.id ? { id: s.id, ...s, ...updatedData } : s
      ));
      showToast('Staff member updated successfully!', 'success');
      setFormData({
        firstName: '', lastName: '', email: '', phone: '', role: '', locationId: '',
        workingHours: {
          monday: { open: '09:00', close: '17:00', closed: false }, tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false }, thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false }, saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { open: '09:00', close: '17:00', closed: true },
        },
        breaks: [], services: [], sendInvite: true, photoURL: '', isBackOfHouse: false,
      });
      setPhotoFile(null);
      setPhotoPreview('');
      setSelectedStaff(null);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating staff:', error);
      showToast('Failed to update staff member. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (staffId: string): Promise<string | null> => {
    if (!photoFile || !user) return null;

    try {
      const storageRef = ref(storage, `staff/${user.uid}/${staffId}/${photoFile.name}`);
      await uploadBytes(storageRef, photoFile);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'staff', selectedStaff.id));
      setStaffMembers(staffMembers.filter(s => s.id !== selectedStaff.id));
      setSelectedStaff(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting staff:', error);
      showToast('Failed to delete staff member. Please try again.', 'error');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream">
        <DashboardSidebar />
        <div className="ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading staff members...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />

      {/* Main Content */}
      <div className="ml-64 min-h-screen px-4 py-6">
        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
              <p className="text-gray-600">Manage your team members and their schedules</p>
            </div>
              <button 
                onClick={() => {
                  // Check staff limit based on subscription
                  if (isLimitReached('staff', staffMembers.length)) {
                    setShowLimitModal(true);
                    return;
                  }
                  setShowAddModal(true);
                }}
                className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
              + Add Staff Member
            </button>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="mt-6">
          {staffMembers.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg shadow-sm">
              <p className="text-gray-600 mb-4">No staff members added yet.</p>
              <button
                onClick={() => {
                  // Check staff limit based on subscription
                  if (isLimitReached('staff', staffMembers.length)) {
                    setShowLimitModal(true);
                    return;
                  }
                  setShowAddModal(true);
                }}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
              >
                Add Staff Member
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {staffMembers.map(staff => (
                <div key={staff.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center text-center">
                           <div className="relative w-16 h-16 mb-3">
                             {staff.photoURL ? (
                               <img
                                 src={staff.photoURL}
                                 alt={staff.name}
                                 className="w-full h-full object-cover rounded-full border-2 border-primary"
                               />
                             ) : (
                               <div className="w-full h-full bg-primary-light rounded-full border-2 border-primary flex items-center justify-center">
                                 <span className="text-primary font-bold text-lg">
                                   {staff.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                 </span>
                               </div>
                             )}
                           </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">{staff.name}</h3>
                  <p className="text-primary-dark text-xs mb-1">{staff.role}</p>
                  <p className="text-gray-600 text-xs mb-1">{staff.email}</p>
                  <p className="text-gray-600 text-xs mb-3">{staff.phone}</p>
                  <div className="flex space-x-2 mt-auto">
                    <button
                      onClick={() => {
                        setSelectedStaff(staff);
                        const [firstName, lastName] = staff.name.split(' ');
                        setFormData({
                          firstName: firstName || '',
                          lastName: lastName || '',
                          email: staff.email,
                          phone: staff.phone,
                          role: staff.role,
                          locationId: staff.locationId || '',
                          workingHours: staff.workingHours,
                          breaks: staff.breaks || [],
                          services: staff.services || [],
                          sendInvite: false,
                          photoURL: staff.photoURL || '',
                          isBackOfHouse: staff.isBackOfHouse || false,
                        });
                        setPhotoPreview(staff.photoURL || '');
                        setPhotoFile(null);
                        setShowEditModal(true);
                      }}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStaff(staff);
                        setShowDeleteModal(true);
                      }}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Add New Staff Member</h3>
            <form onSubmit={handleAddStaff}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="locationId" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    id="locationId"
                    name="locationId"
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="">Select Location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">Staff Photo</label>
                <input
                  type="file"
                  id="photo"
                  name="photo"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhotoFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPhotoPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary-lighter"
                />
                {photoPreview && (
                  <div className="mt-4">
                    <img src={photoPreview} alt="Photo Preview" className="w-24 h-24 object-cover rounded-full" />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingPhoto}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Staff Member</h3>
            <form onSubmit={handleUpdateStaff}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label htmlFor="editFirstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    id="editFirstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="editLastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    id="editLastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    id="editEmail"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="editPhone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    id="editPhone"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="editRole" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    id="editRole"
                    name="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="editLocationId" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    id="editLocationId"
                    name="locationId"
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="">Select Location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered</label>
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                  {services.map(service => (
                    <div key={service.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`edit-service-${service.id}`}
                        checked={formData.services.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                      />
                      <label htmlFor={`edit-service-${service.id}`} className="ml-2 text-sm text-gray-900">{service.name}</label>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex space-x-2">
                  <button type="button" onClick={handleSelectAllServices} className="text-sm text-blue-600 hover:underline">Select All</button>
                  <button type="button" onClick={handleClearAllServices} className="text-sm text-red-600 hover:underline">Clear All</button>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="editPhoto" className="block text-sm font-medium text-gray-700 mb-1">Staff Photo</label>
                <input
                  type="file"
                  id="editPhoto"
                  name="photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary-lighter"
                />
                {photoPreview && (
                  <div className="mt-2 flex items-center space-x-3">
                    <img src={photoPreview} alt="Photo Preview" className="w-16 h-16 object-cover rounded-full" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview('')}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Remove Photo
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingPhoto}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete {selectedStaff?.name}? This action cannot be undone.</p>
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Staff Limit Reached</h3>
            <p className="text-gray-600 mb-6">
              {trialStatus?.active ? (
                <>
                  You've reached the staff limit for your trial plan. You can add up to <strong>{limits?.staff === -1 ? 'unlimited' : limits?.staff} staff member{limits?.staff !== 1 ? 's' : ''}</strong> during your trial.
                  <br /><br />
                  Your trial ends in <strong>{trialStatus.daysRemaining} days</strong>. Subscribe to a plan to add more staff.
                </>
              ) : (
                <>
                  You've reached the staff limit for your current plan. You can add up to <strong>{limits?.staff === -1 ? 'unlimited' : limits?.staff} staff member{limits?.staff !== 1 ? 's' : ''}</strong>.
                </>
              )}
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => {
                  setShowLimitModal(false);
                  router.push('/dashboard/subscription');
                }}
                className="w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors"
              >
                {trialStatus?.active ? 'Subscribe Now' : 'Upgrade Plan'}
              </button>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffManagement() {
  return (
    <ProtectedRoute>
      <StaffManagementContent />
    </ProtectedRoute>
  );
}