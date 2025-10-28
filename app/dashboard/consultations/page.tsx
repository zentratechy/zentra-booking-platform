'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from '@/components/DashboardSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/useToast';

function ConsultationsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    consultationType: 'initial',
    selectedFormId: '',
    selectedFormName: '',
    formResponses: {} as Record<string, any>,
    skinType: '',
    skinConcerns: [] as string[],
    allergies: '',
    medicalConditions: '',
    currentSkincare: '',
    previousTreatments: '',
    lifestyle: {
      sunExposure: '',
      smoking: false,
      alcohol: '',
      water: '',
      sleep: '',
    },
    preferences: {
      productPreferences: '',
      sensitiveAreas: '',
      painTolerance: '',
    },
    contraindications: '',
    recommendedTreatments: '',
    recommendedProducts: '',
    homecarePlan: '',
    notes: '',
    nextReviewDate: '',
  });

  const skinConcernOptions = [
    'Acne', 'Aging', 'Dark Spots', 'Dryness', 'Fine Lines', 'Hyperpigmentation',
    'Large Pores', 'Oiliness', 'Redness', 'Scarring', 'Sensitivity', 'Wrinkles'
  ];

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch consultations
      const consultationsQuery = query(
        collection(db, 'consultations'),
        where('businessId', '==', user?.uid)
      );
      const consultationsSnapshot = await getDocs(consultationsQuery);
      const consultationsData = consultationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConsultations(consultationsData);

      // Fetch clients for dropdown
      const clientsQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', user?.uid)
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsData = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);

      // Fetch forms for dropdown
      const formsQuery = query(
        collection(db, 'consultationForms'),
        where('businessId', '==', user?.uid)
      );
      const formsSnapshot = await getDocs(formsQuery);
      const formsData = formsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setForms(formsData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const consultationData = {
        ...formData,
        businessId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (selectedConsultation) {
        // Update existing
        await updateDoc(doc(db, 'consultations', selectedConsultation.id), consultationData);
        setConsultations(consultations.map(c =>
          c.id === selectedConsultation.id ? { ...c, ...consultationData, updatedAt: new Date() } : c
        ));
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'consultations'), {
          ...consultationData,
          createdAt: serverTimestamp(),
        });
        setConsultations([...consultations, { id: docRef.id, ...consultationData, createdAt: new Date() }]);
      }

      setShowModal(false);
      resetForm();
      setSaving(false);
    } catch (error: any) {
      console.error('Error saving consultation:', error);
      showToast('Failed to save consultation: ' + (error.message || 'Please try again.'), 'error');
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      clientName: '',
      consultationType: 'initial',
      selectedFormId: '',
      selectedFormName: '',
      formResponses: {},
      skinType: '',
      skinConcerns: [],
      allergies: '',
      medicalConditions: '',
      currentSkincare: '',
      previousTreatments: '',
      lifestyle: {
        sunExposure: '',
        smoking: false,
        alcohol: '',
        water: '',
        sleep: '',
      },
      preferences: {
        productPreferences: '',
        sensitiveAreas: '',
        painTolerance: '',
      },
      contraindications: '',
      recommendedTreatments: '',
      recommendedProducts: '',
      homecarePlan: '',
      notes: '',
      nextReviewDate: '',
    });
    setSelectedConsultation(null);
  };

  const handleEdit = (consultation: any) => {
    setSelectedConsultation(consultation);
    setFormData({
      clientId: consultation.clientId || '',
      clientName: consultation.clientName || '',
      consultationType: consultation.consultationType || 'initial',
      selectedFormId: consultation.selectedFormId || '',
      selectedFormName: consultation.selectedFormName || '',
      formResponses: consultation.formResponses || {},
      skinType: consultation.skinType || '',
      skinConcerns: consultation.skinConcerns || [],
      allergies: consultation.allergies || '',
      medicalConditions: consultation.medicalConditions || '',
      currentSkincare: consultation.currentSkincare || '',
      previousTreatments: consultation.previousTreatments || '',
      lifestyle: consultation.lifestyle || {
        sunExposure: '',
        smoking: false,
        alcohol: '',
        water: '',
        sleep: '',
      },
      preferences: consultation.preferences || {
        productPreferences: '',
        sensitiveAreas: '',
        painTolerance: '',
      },
      contraindications: consultation.contraindications || '',
      recommendedTreatments: consultation.recommendedTreatments || '',
      recommendedProducts: consultation.recommendedProducts || '',
      homecarePlan: consultation.homecarePlan || '',
      notes: consultation.notes || '',
      nextReviewDate: consultation.nextReviewDate || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this consultation?')) return;

    try {
      await deleteDoc(doc(db, 'consultations', id));
      setConsultations(consultations.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting consultation:', error);
      showToast('Failed to delete consultation', 'error');
    }
  };

  const toggleSkinConcern = (concern: string) => {
    if (formData.skinConcerns.includes(concern)) {
      setFormData({
        ...formData,
        skinConcerns: formData.skinConcerns.filter(c => c !== concern)
      });
    } else {
      setFormData({
        ...formData,
        skinConcerns: [...formData.skinConcerns, concern]
      });
    }
  };

  const filteredConsultations = consultations.filter(consultation =>
    consultation.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-pink via-white to-soft-lavender">
      <DashboardSidebar />
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Consultations</h1>
            <p className="text-gray-600">Track detailed client consultations and treatment plans</p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Total Consultations</div>
              <div className="text-3xl font-bold text-primary">{consultations.length}</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Initial Consultations</div>
              <div className="text-3xl font-bold text-blue-600">
                {consultations.filter(c => c.consultationType === 'initial').length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Follow-ups</div>
              <div className="text-3xl font-bold text-green-600">
                {consultations.filter(c => c.consultationType === 'followup').length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">This Month</div>
              <div className="text-3xl font-bold text-purple-600">
                {consultations.filter(c => {
                  const date = c.createdAt?.toDate ? c.createdAt.toDate() : new Date();
                  return date.getMonth() === new Date().getMonth();
                }).length}
              </div>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search by client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="ml-4 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Consultation
              </button>
            </div>
          </div>

          {/* Consultations List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading consultations...</p>
              </div>
            ) : filteredConsultations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-4">No consultations yet</p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors"
                >
                  Create First Consultation
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConsultations.map((consultation) => (
                  <div key={consultation.id} className="p-6 hover:bg-soft-pink/20 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{consultation.clientName}</h3>
                          <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                            consultation.consultationType === 'initial' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {consultation.consultationType === 'initial' ? 'Initial' : 'Follow-up'}
                          </span>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4 mb-3">
                          {consultation.skinType && (
                            <div>
                              <span className="text-xs text-gray-500">Skin Type:</span>
                              <p className="text-sm font-medium text-gray-900 capitalize">{consultation.skinType}</p>
                            </div>
                          )}
                          {consultation.skinConcerns?.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-500">Main Concerns:</span>
                              <p className="text-sm font-medium text-gray-900">{consultation.skinConcerns.join(', ')}</p>
                            </div>
                          )}
                          {consultation.createdAt && (
                            <div>
                              <span className="text-xs text-gray-500">Date:</span>
                              <p className="text-sm font-medium text-gray-900">
                                {consultation.createdAt?.toDate ? 
                                  consultation.createdAt.toDate().toLocaleDateString() : 
                                  'N/A'}
                              </p>
                            </div>
                          )}
                        </div>

                        {consultation.recommendedTreatments && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                            <span className="text-xs font-medium text-blue-700">Recommended Treatments:</span>
                            <p className="text-sm text-blue-900 mt-1">{consultation.recommendedTreatments}</p>
                          </div>
                        )}

                        {consultation.allergies && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <span className="text-xs font-medium text-red-700">⚠️ Allergies:</span>
                            <p className="text-sm text-red-900 mt-1">{consultation.allergies}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(consultation)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(consultation.id)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Consultation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-8">
            <form onSubmit={handleSubmit}>
              <div className="p-6 max-h-[85vh] overflow-y-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  {selectedConsultation ? 'Edit Consultation' : 'New Consultation'}
                </h3>

                {/* Client Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        clientId: e.target.value,
                        clientName: client?.name || ''
                      });
                    }}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Select a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                {/* Form Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Form (Optional)</label>
                  <select
                    value={formData.selectedFormId}
                    onChange={(e) => {
                      const form = forms.find(f => f.id === e.target.value);
                      setFormData({
                        ...formData,
                        selectedFormId: e.target.value,
                        selectedFormName: form?.name || '',
                        formResponses: {} // Reset form responses when changing form
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">No form selected</option>
                    {forms.map(form => (
                      <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                  </select>
                  {formData.selectedFormId && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {formData.selectedFormName}
                    </p>
                  )}
                </div>

                {/* Form Responses */}
                {formData.selectedFormId && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Form Responses</h4>
                    <div className="space-y-4">
                      {forms.find(f => f.id === formData.selectedFormId)?.fields.map((field: any) => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {field.type === 'text' || field.type === 'number' ? (
                            <input
                              type={field.type}
                              value={formData.formResponses[field.id] || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                formResponses: {
                                  ...formData.formResponses,
                                  [field.id]: e.target.value
                                }
                              })}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          ) : field.type === 'textarea' ? (
                            <textarea
                              value={formData.formResponses[field.id] || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                formResponses: {
                                  ...formData.formResponses,
                                  [field.id]: e.target.value
                                }
                              })}
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={formData.formResponses[field.id] || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                formResponses: {
                                  ...formData.formResponses,
                                  [field.id]: e.target.value
                                }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="">Select an option</option>
                              {field.options?.map((option: string, index: number) => (
                                <option key={index} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : field.type === 'radio' ? (
                            <div className="space-y-2">
                              {field.options?.map((option: string, index: number) => (
                                <label key={index} className="flex items-center">
                                  <input
                                    type="radio"
                                    name={field.id}
                                    value={option}
                                    checked={formData.formResponses[field.id] === option}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      formResponses: {
                                        ...formData.formResponses,
                                        [field.id]: e.target.value
                                      }
                                    })}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <div className="space-y-2">
                              {field.options?.map((option: string, index: number) => (
                                <label key={index} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    value={option}
                                    checked={Array.isArray(formData.formResponses[field.id]) && formData.formResponses[field.id].includes(option)}
                                    onChange={(e) => {
                                      const currentValues = Array.isArray(formData.formResponses[field.id]) ? formData.formResponses[field.id] : [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          formResponses: {
                                            ...formData.formResponses,
                                            [field.id]: [...currentValues, option]
                                          }
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          formResponses: {
                                            ...formData.formResponses,
                                            [field.id]: currentValues.filter((v: any) => v !== option)
                                          }
                                        });
                                      }
                                    }}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : field.type === 'date' ? (
                            <input
                              type="date"
                              value={formData.formResponses[field.id] || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                formResponses: {
                                  ...formData.formResponses,
                                  [field.id]: e.target.value
                                }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consultation Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Type *</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="initial"
                        checked={formData.consultationType === 'initial'}
                        onChange={(e) => setFormData({ ...formData, consultationType: e.target.value })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Initial Consultation</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="followup"
                        checked={formData.consultationType === 'followup'}
                        onChange={(e) => setFormData({ ...formData, consultationType: e.target.value })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Follow-up</span>
                    </label>
                  </div>
                </div>

                {/* Skin Analysis */}
                <div className="mb-6 bg-blue-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Skin Analysis</h4>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Skin Type</label>
                      <select
                        value={formData.skinType}
                        onChange={(e) => setFormData({ ...formData, skinType: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="normal">Normal</option>
                        <option value="dry">Dry</option>
                        <option value="oily">Oily</option>
                        <option value="combination">Combination</option>
                        <option value="sensitive">Sensitive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Skin Concerns</label>
                    <div className="grid grid-cols-3 gap-2">
                      {skinConcernOptions.map(concern => (
                        <label key={concern} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.skinConcerns.includes(concern)}
                            onChange={() => toggleSkinConcern(concern)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{concern}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Medical History */}
                <div className="mb-6 bg-red-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Medical History</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                      <textarea
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="Any known allergies to products, ingredients, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
                      <textarea
                        value={formData.medicalConditions}
                        onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="Eczema, rosacea, diabetes, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contraindications</label>
                      <textarea
                        value={formData.contraindications}
                        onChange={(e) => setFormData({ ...formData, contraindications: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="Any treatments to avoid"
                      />
                    </div>
                  </div>
                </div>

                {/* Current Routine */}
                <div className="mb-6 bg-purple-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Current Routine & History</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Skincare Routine</label>
                      <textarea
                        value={formData.currentSkincare}
                        onChange={(e) => setFormData({ ...formData, currentSkincare: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="Products they're currently using..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Previous Treatments</label>
                      <textarea
                        value={formData.previousTreatments}
                        onChange={(e) => setFormData({ ...formData, previousTreatments: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="Botox, fillers, laser, peels, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Lifestyle Factors */}
                <div className="mb-6 bg-green-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Lifestyle Factors</h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sun Exposure</label>
                      <select
                        value={formData.lifestyle.sunExposure}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          lifestyle: { ...formData.lifestyle, sunExposure: e.target.value }
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="minimal">Minimal</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Water Intake</label>
                      <select
                        value={formData.lifestyle.water}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          lifestyle: { ...formData.lifestyle, water: e.target.value }
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="low">Low (&lt;4 glasses/day)</option>
                        <option value="moderate">Moderate (4-6 glasses/day)</option>
                        <option value="high">High (6+ glasses/day)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Quality</label>
                      <select
                        value={formData.lifestyle.sleep}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          lifestyle: { ...formData.lifestyle, sleep: e.target.value }
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="poor">Poor (&lt;5 hours)</option>
                        <option value="fair">Fair (5-7 hours)</option>
                        <option value="good">Good (7+ hours)</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.lifestyle.smoking}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            lifestyle: { ...formData.lifestyle, smoking: e.target.checked }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Smoker</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="mb-6 bg-yellow-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Recommendations & Treatment Plan</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recommended Treatments</label>
                      <textarea
                        value={formData.recommendedTreatments}
                        onChange={(e) => setFormData({ ...formData, recommendedTreatments: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="Facial, chemical peel, microneedling, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recommended Products</label>
                      <textarea
                        value={formData.recommendedProducts}
                        onChange={(e) => setFormData({ ...formData, recommendedProducts: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="Serums, moisturizers, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Homecare Plan</label>
                      <textarea
                        value={formData.homecarePlan}
                        onChange={(e) => setFormData({ ...formData, homecarePlan: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="Daily routine instructions..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Next Review Date</label>
                      <input
                        type="date"
                        value={formData.nextReviewDate}
                        onChange={(e) => setFormData({ ...formData, nextReviewDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Any other relevant information..."
                  />
                </div>
              </div>

              <div className="border-t px-6 py-4 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                  className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving || !formData.clientId}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : selectedConsultation ? 'Update Consultation' : 'Save Consultation'}
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

export default function Consultations() {
  return (
    <ProtectedRoute>
      <ConsultationsContent />
    </ProtectedRoute>
  );
}
