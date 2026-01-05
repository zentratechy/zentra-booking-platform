'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import DashboardSidebar from '@/components/DashboardSidebar';

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: FormField[];
  isTemplate: boolean;
  createdAt: any;
  updatedAt: any;
}

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

const defaultTemplates: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'COVID-19 Health Agreement',
    description: 'Help keep you, your business and your client safe from the threat of COVID-19 with this comprehensive health screening form.',
    category: 'Health & Safety',
    isTemplate: true,
    fields: [
      { id: '1', type: 'text', label: 'Full Name', required: true },
      { id: '2', type: 'date', label: 'Date of Birth', required: true },
      { id: '3', type: 'text', label: 'Phone Number', required: true },
      { id: '4', type: 'text', label: 'Email Address', required: true },
      { id: '5', type: 'radio', label: 'Have you tested positive for COVID-19 in the last 14 days?', required: true, options: ['Yes', 'No'] },
      { id: '6', type: 'radio', label: 'Have you had any COVID-19 symptoms in the last 14 days?', required: true, options: ['Yes', 'No'] },
      { id: '7', type: 'radio', label: 'Have you been in close contact with someone who has COVID-19?', required: true, options: ['Yes', 'No'] },
      { id: '8', type: 'checkbox', label: 'I agree to follow all safety protocols during my visit', required: true },
      { id: '9', type: 'textarea', label: 'Additional Comments', required: false, placeholder: 'Any additional health information...' }
    ]
  },
  {
    name: 'Wedding Hair and Makeup Trial',
    description: 'Helping your client find their perfect wedding day look is a lot of fun and also a crucial part of the planning process.',
    category: 'Bridal',
    isTemplate: true,
    fields: [
      { id: '1', type: 'text', label: 'Bride\'s Name', required: true },
      { id: '2', type: 'text', label: 'Wedding Date', required: true },
      { id: '3', type: 'text', label: 'Wedding Venue', required: true },
      { id: '4', type: 'select', label: 'Hair Length', required: true, options: ['Short', 'Medium', 'Long', 'Very Long'] },
      { id: '5', type: 'select', label: 'Hair Type', required: true, options: ['Straight', 'Wavy', 'Curly', 'Coily'] },
      { id: '6', type: 'select', label: 'Hair Color', required: true, options: ['Blonde', 'Brunette', 'Red', 'Black', 'Other'] },
      { id: '7', type: 'textarea', label: 'Desired Hairstyle', required: true, placeholder: 'Describe your ideal wedding hairstyle...' },
      { id: '8', type: 'textarea', label: 'Makeup Preferences', required: true, placeholder: 'Describe your makeup style preferences...' },
      { id: '9', type: 'text', label: 'Skin Type', required: true },
      { id: '10', type: 'textarea', label: 'Allergies or Sensitivities', required: false, placeholder: 'List any allergies or skin sensitivities...' },
      { id: '11', type: 'checkbox', label: 'I have tried this look before', required: false },
      { id: '12', type: 'textarea', label: 'Additional Notes', required: false, placeholder: 'Any other important information...' }
    ]
  },
  {
    name: 'Aesthetics Medical History',
    description: 'A detailed medical history is important when creating a treatment plan with your client for safe and effective aesthetic treatments.',
    category: 'Aesthetics',
    isTemplate: true,
    fields: [
      { id: '1', type: 'text', label: 'Full Name', required: true },
      { id: '2', type: 'date', label: 'Date of Birth', required: true },
      { id: '3', type: 'text', label: 'Phone Number', required: true },
      { id: '4', type: 'text', label: 'Email Address', required: true },
      { id: '5', type: 'textarea', label: 'Current Medications', required: true, placeholder: 'List all current medications...' },
      { id: '6', type: 'checkbox', label: 'Medical Conditions', required: false, options: ['Diabetes', 'High Blood Pressure', 'Heart Disease', 'Autoimmune Disorders', 'Skin Conditions', 'Other'] },
      { id: '7', type: 'radio', label: 'Are you pregnant or breastfeeding?', required: true, options: ['Yes', 'No', 'Not Applicable'] },
      { id: '8', type: 'radio', label: 'Have you had any cosmetic procedures in the last 6 months?', required: true, options: ['Yes', 'No'] },
      { id: '9', type: 'textarea', label: 'Previous Treatments', required: false, placeholder: 'List any previous aesthetic treatments...' },
      { id: '10', type: 'textarea', label: 'Allergies', required: true, placeholder: 'List any known allergies...' },
      { id: '11', type: 'textarea', label: 'Skin Concerns', required: true, placeholder: 'Describe your main skin concerns...' },
      { id: '12', type: 'checkbox', label: 'I consent to treatment and understand the risks', required: true }
    ]
  },
  {
    name: 'Comprehensive Hair Consultation',
    description: 'Use this comprehensive form to get a detailed picture of a new client\'s hair history, preferences, and goals.',
    category: 'Hair',
    isTemplate: true,
    fields: [
      { id: '1', type: 'text', label: 'Client Name', required: true },
      { id: '2', type: 'date', label: 'Consultation Date', required: true },
      { id: '3', type: 'select', label: 'Hair Length', required: true, options: ['Pixie', 'Short', 'Medium', 'Long', 'Very Long'] },
      { id: '4', type: 'select', label: 'Hair Type', required: true, options: ['Straight', 'Wavy', 'Curly', 'Coily'] },
      { id: '5', type: 'select', label: 'Current Hair Color', required: true, options: ['Natural', 'Colored', 'Highlights', 'Balayage', 'Ombre', 'Other'] },
      { id: '6', type: 'textarea', label: 'Hair History', required: true, placeholder: 'Describe recent hair treatments, coloring, etc...' },
      { id: '7', type: 'textarea', label: 'Hair Goals', required: true, placeholder: 'What would you like to achieve?' },
      { id: '8', type: 'text', label: 'Hair Care Routine', required: true, placeholder: 'How often do you wash your hair?' },
      { id: '9', type: 'textarea', label: 'Products Used', required: false, placeholder: 'List current hair products...' },
      { id: '10', type: 'checkbox', label: 'Hair Concerns', required: false, options: ['Damage', 'Thinning', 'Dryness', 'Oiliness', 'Frizz', 'Color Fading', 'Other'] },
      { id: '11', type: 'textarea', label: 'Lifestyle Factors', required: false, placeholder: 'Swimming, heat styling, etc...' },
      { id: '12', type: 'textarea', label: 'Allergies or Sensitivities', required: false, placeholder: 'Any known allergies to hair products...' }
    ]
  },
  {
    name: 'Facial Consultation',
    description: 'With all the options for skincare treatments and products it\'s vital to understand your client\'s skin and goals.',
    category: 'Skincare',
    isTemplate: true,
    fields: [
      { id: '1', type: 'text', label: 'Client Name', required: true },
      { id: '2', type: 'date', label: 'Consultation Date', required: true },
      { id: '3', type: 'select', label: 'Skin Type', required: true, options: ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'] },
      { id: '4', type: 'select', label: 'Skin Concerns', required: true, options: ['Acne', 'Aging', 'Hyperpigmentation', 'Sensitivity', 'Dehydration', 'Texture', 'Other'] },
      { id: '5', type: 'textarea', label: 'Current Skincare Routine', required: true, placeholder: 'Describe your daily skincare routine...' },
      { id: '6', type: 'textarea', label: 'Products Currently Used', required: false, placeholder: 'List all skincare products...' },
      { id: '7', type: 'radio', label: 'How often do you exfoliate?', required: true, options: ['Daily', '2-3 times per week', 'Weekly', 'Rarely', 'Never'] },
      { id: '8', type: 'radio', label: 'Do you wear sunscreen daily?', required: true, options: ['Yes', 'No', 'Sometimes'] },
      { id: '9', type: 'textarea', label: 'Previous Treatments', required: false, placeholder: 'List any previous facial treatments...' },
      { id: '10', type: 'textarea', label: 'Allergies or Sensitivities', required: false, placeholder: 'Any known skin allergies...' },
      { id: '11', type: 'textarea', label: 'Medications', required: false, placeholder: 'Any medications that might affect skin...' },
      { id: '12', type: 'textarea', label: 'Treatment Goals', required: true, placeholder: 'What would you like to achieve?' }
    ]
  },
  {
    name: 'Massage Consultation',
    description: 'Everyone loves a good massage, and as any good masseur will tell you it can be so much more than just relaxation.',
    category: 'Wellness',
    isTemplate: true,
    fields: [
      { id: '1', type: 'text', label: 'Client Name', required: true },
      { id: '2', type: 'date', label: 'Date of Birth', required: true },
      { id: '3', type: 'text', label: 'Phone Number', required: true },
      { id: '4', type: 'text', label: 'Email Address', required: true },
      { id: '5', type: 'select', label: 'Massage Type Preferred', required: true, options: ['Swedish', 'Deep Tissue', 'Hot Stone', 'Aromatherapy', 'Prenatal', 'Sports', 'Other'] },
      { id: '6', type: 'radio', label: 'Have you had a massage before?', required: true, options: ['Yes', 'No'] },
      { id: '7', type: 'textarea', label: 'Areas of Tension/Pain', required: true, placeholder: 'Describe areas that need attention...' },
      { id: '8', type: 'select', label: 'Pressure Preference', required: true, options: ['Light', 'Medium', 'Firm', 'Very Firm'] },
      { id: '9', type: 'checkbox', label: 'Medical Conditions', required: false, options: ['High Blood Pressure', 'Diabetes', 'Heart Disease', 'Pregnancy', 'Recent Surgery', 'Other'] },
      { id: '10', type: 'textarea', label: 'Current Medications', required: false, placeholder: 'List any current medications...' },
      { id: '11', type: 'textarea', label: 'Allergies', required: false, placeholder: 'Any allergies to oils, lotions, or scents...' },
      { id: '12', type: 'textarea', label: 'Goals for This Session', required: true, placeholder: 'What would you like to achieve?' }
    ]
  },
  {
    name: 'Waxing Consultation',
    description: 'For many salons, facial and body waxing is a core service. This consultation ensures safe and effective treatments.',
    category: 'Hair Removal',
    isTemplate: true,
    fields: [
      { id: '1', type: 'text', label: 'Client Name', required: true },
      { id: '2', type: 'date', label: 'Date of Birth', required: true },
      { id: '3', type: 'text', label: 'Phone Number', required: true },
      { id: '4', type: 'text', label: 'Email Address', required: true },
      { id: '5', type: 'select', label: 'Treatment Area', required: true, options: ['Eyebrows', 'Upper Lip', 'Chin', 'Full Face', 'Underarms', 'Arms', 'Legs', 'Bikini', 'Brazilian', 'Back', 'Chest', 'Other'] },
      { id: '6', type: 'radio', label: 'Have you had waxing before?', required: true, options: ['Yes', 'No'] },
      { id: '7', type: 'select', label: 'Hair Length', required: true, options: ['Very Short', 'Short', 'Medium', 'Long'] },
      { id: '8', type: 'select', label: 'Hair Thickness', required: true, options: ['Fine', 'Medium', 'Thick', 'Very Thick'] },
      { id: '9', type: 'checkbox', label: 'Skin Conditions', required: false, options: ['Sensitive Skin', 'Acne', 'Eczema', 'Psoriasis', 'Moles', 'Other'] },
      { id: '10', type: 'textarea', label: 'Current Medications', required: false, placeholder: 'List any medications that might affect skin...' },
      { id: '11', type: 'textarea', label: 'Allergies', required: false, placeholder: 'Any known allergies to wax or products...' },
      { id: '12', type: 'radio', label: 'Are you pregnant or breastfeeding?', required: true, options: ['Yes', 'No', 'Not Applicable'] },
      { id: '13', type: 'textarea', label: 'Previous Waxing Experience', required: false, placeholder: 'Describe any previous waxing treatments...' },
      { id: '14', type: 'checkbox', label: 'I consent to treatment and understand the risks', required: true }
    ]
  }
];

export default function FormsPage() {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', 'Health & Safety', 'Bridal', 'Aesthetics', 'Hair', 'Skincare', 'Wellness', 'Hair Removal'];

  useEffect(() => {
    if (user) {
      fetchForms();
    }
  }, [user]);

  const fetchForms = async () => {
    try {
      const formsQuery = query(
        collection(db, 'consultationForms'),
        where('businessId', '==', user!.uid),
        orderBy('createdAt', 'desc')
      );
      const formsSnapshot = await getDocs(formsQuery);
      const formsData = formsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FormTemplate[];

      setForms(formsData);
    } catch (error) {
      console.error('Error fetching forms:', error);
      showToast('Failed to fetch forms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createFormFromTemplate = async (template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newForm = {
        ...template,
        businessId: user!.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'consultationForms'), newForm);
      showToast('Form created successfully!', 'success');
      fetchForms();
    } catch (error) {
      console.error('Error creating form:', error);
      showToast('Failed to create form', 'error');
    }
  };

  const deleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      await deleteDoc(doc(db, 'consultationForms', formId));
      showToast('Form deleted successfully!', 'success');
      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      showToast('Failed to delete form', 'error');
    }
  };

  const filteredForms = forms.filter(form => {
    const matchesCategory = selectedCategory === 'All' || form.category === selectedCategory;
    const matchesSearch = form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream">
        <DashboardSidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading forms...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Library</h1>
          <p className="text-gray-600">Create and manage consultation forms for your clients</p>
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: selectedCategory === category ? colorScheme.colors.primary : undefined
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Template Forms */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Form Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {defaultTemplates.map((template, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {template.category}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{template.fields.length} fields</span>
                  <button
                    onClick={() => createFormFromTemplate(template)}
                    className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: colorScheme.colors.primary }}
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Forms */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Forms</h2>
            <Link
              href="/dashboard/forms/create"
              className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colorScheme.colors.primary }}
            >
              Create New Form
            </Link>
          </div>

          {filteredForms.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
              <p className="text-gray-600 mb-4">Create your first consultation form or use one of our templates</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredForms.map((form) => (
                <div key={form.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{form.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{form.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                        {form.category}
                      </span>
                      {form.isTemplate && (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Template
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{form.fields.length} fields</span>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/forms/${form.id}/preview`}
                        className="px-3 py-1 text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Preview
                      </Link>
                      <Link
                        href={`/dashboard/forms/${form.id}`}
                        className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteForm(form.id)}
                        className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
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
      <ToastContainer />
    </div>
  );
}
