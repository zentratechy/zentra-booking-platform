'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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

const categories = ['Facial', 'Hair', 'Hair Removal', 'Wellness', 'Nails', 'Eyelashes', 'General'];

export default function EditAftercarePage() {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<AftercareTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'General',
    content: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setFormData({
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          content: templateData.content
        });
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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('Please enter a template name', 'error');
      return;
    }

    if (!formData.content.trim()) {
      showToast('Please enter template content', 'error');
      return;
    }

    setSaving(true);

    try {
      await updateDoc(doc(db, 'aftercareTemplates', templateId), {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        content: formData.content.trim(),
        updatedAt: new Date()
      });

      showToast('Template updated successfully!', 'success');
      router.push('/dashboard/aftercare');
    } catch (error) {
      console.error('Error updating template:', error);
      showToast('Failed to update template', 'error');
    } finally {
      setSaving(false);
    }
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
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/dashboard/aftercare')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Aftercare
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Aftercare Template</h1>
          <p className="text-gray-600">Modify your aftercare template</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Template Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter template name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this aftercare template is for..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Aftercare Content</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Markdown Formatting Help</h3>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>Headers:</strong> # Main Title, ## Section Title, ### Subsection</p>
                    <p><strong>Bold:</strong> **bold text**</p>
                    <p><strong>Italic:</strong> *italic text*</p>
                    <p><strong>Lists:</strong> - Item 1, - Item 2</p>
                    <p><strong>Numbered Lists:</strong> 1. First, 2. Second</p>
                  </div>
                </div>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter your aftercare instructions using Markdown formatting..."
                  rows={20}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
              <div className="prose prose-sm max-w-none">
                {formData.content ? (
                  <div 
                    className="text-sm text-gray-700 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: formData.content
                        .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-gray-900 mb-2">$1</h1>')
                        .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold text-gray-900 mb-2">$1</h2>')
                        .replace(/^### (.*$)/gim, '<h3 class="text-base font-medium text-gray-900 mb-1">$1</h3>')
                        .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
                        .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
                        .replace(/^- (.*$)/gim, '<li class="ml-4 list-none">• $1</li>')
                        .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-none">$1</li>')
                        .replace(/\n\n/gim, '</p><p class="mb-2">')
                        .replace(/^(?!<[h|l])/gim, '<p class="mb-2">')
                        .replace(/(<li.*<\/li>)/gim, '<ul class="ml-4 mb-2 list-none">$1</ul>')
                    }}
                  />
                ) : (
                  <p className="text-gray-500 italic">Start typing to see a preview...</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim() || !formData.content.trim()}
                  className="w-full px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => router.push('/dashboard/aftercare')}
                  className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Tips</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>• Use clear, simple language that clients can easily understand</p>
                <p>• Include specific timeframes (e.g., "first 24 hours")</p>
                <p>• Mention what to expect and when to contact you</p>
                <p>• Include product recommendations when appropriate</p>
                <p>• Use headers to organize different sections</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
