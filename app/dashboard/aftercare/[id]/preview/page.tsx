'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';

interface AftercareTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  isTemplate: boolean;
  createdAt: any;
  updatedAt: any;
}

export default function PreviewAftercarePage() {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<AftercareTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (templateId && user) {
      fetchTemplate();
    }
  }, [templateId, user]);

  const fetchTemplate = async () => {
    try {
      const templateDoc = await getDoc(doc(db, 'aftercareTemplates', templateId));
      if (templateDoc.exists()) {
        const templateData = { id: templateDoc.id, ...templateDoc.data() } as AftercareTemplate;
        setTemplate(templateData);
      } else {
        showToast('Template not found', 'error');
        router.push('/dashboard/aftercare');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      showToast('Failed to fetch template', 'error');
      router.push('/dashboard/aftercare');
    } finally {
      setLoading(false);
    }
  };

  const formatContent = (content: string) => {
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-900 mb-3 mt-5">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-gray-900 mb-2 mt-4">$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-6 mb-1 list-none">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-6 mb-1 list-none">$1</li>')
      .replace(/\n\n/gim, '</p><p class="mb-3 text-gray-700 leading-relaxed">')
      .replace(/^(?!<[h|l])/gim, '<p class="mb-3 text-gray-700 leading-relaxed">')
      .replace(/(<li.*<\/li>)/gim, '<ul class="ml-4 mb-4 list-none">$1</ul>');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Template not found</h1>
          <p className="text-gray-600 mb-4">The template you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard/aftercare')}
            className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90"
            style={{ backgroundColor: colorScheme.colors.primary }}
          >
            Back to Aftercare
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
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/dashboard/aftercare')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Aftercare
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/dashboard/aftercare/${templateId}`)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Edit Template
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: colorScheme.colors.primary }}
              >
                Print
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aftercare Preview</h1>
          <p className="text-gray-600">Preview how your aftercare document will look to clients</p>
        </div>

        {/* Template Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{template.name}</h2>
              <p className="text-gray-600 mb-3">{template.description}</p>
              <div className="flex items-center gap-2">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                  {template.category}
                </span>
                {template.isTemplate && (
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    Template
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Created: {template.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
              <p>Updated: {template.updatedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{
              __html: formatContent(template.content)
            }}
          />
        </div>

        {/* Client View Simulation */}
        <div className="mt-8 bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">📱 Client View</h3>
          <p className="text-blue-800 text-sm">
            This is how your aftercare document will appear when sent to clients. 
            They'll receive this as a beautifully formatted email or can view it in their client portal.
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
