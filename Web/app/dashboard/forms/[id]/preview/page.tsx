'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import FormViewer from '@/components/FormViewer';

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

export default function FormPreviewPage() {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (formId && user) {
      fetchForm();
    }
  }, [formId, user]);

  const fetchForm = async () => {
    try {
      const formDoc = await getDoc(doc(db, 'consultationForms', formId));
      if (formDoc.exists()) {
        const formData = { id: formDoc.id, ...formDoc.data() } as FormTemplate;
        setForm(formData);
      } else {
        showToast('Form not found', 'error');
        router.push('/dashboard/forms');
      }
    } catch (error) {
      console.error('Error fetching form:', error);
      showToast('Failed to fetch form', 'error');
      router.push('/dashboard/forms');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (data: Record<string, any>) => {
    showToast('Form submitted successfully! (This is a preview)', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form preview...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form not found</h1>
          <p className="text-gray-600 mb-4">The form you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard/forms')}
            className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90"
            style={{ backgroundColor: colorScheme.colors.primary }}
          >
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Preview</h1>
              <p className="text-gray-600">Preview how your form will look to clients</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push(`/dashboard/forms/${formId}`)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Edit Form
              </button>
              <button
                onClick={() => router.push('/dashboard/forms')}
                className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90"
                style={{ backgroundColor: colorScheme.colors.primary }}
              >
                Back to Forms
              </button>
            </div>
          </div>
        </div>

        {/* Form Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 text-sm">
                This is a preview of how your form will appear to clients. You can test the form functionality here.
              </p>
            </div>
          </div>

          <FormViewer
            form={form}
            onSubmit={handleFormSubmit}
          />
        </div>

        {/* Form Info */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Form Name:</span>
              <p className="text-gray-900">{form.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Category:</span>
              <p className="text-gray-900">{form.category}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Total Fields:</span>
              <p className="text-gray-900">{form.fields.length}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Required Fields:</span>
              <p className="text-gray-900">{form.fields.filter(f => f.required).length}</p>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}








