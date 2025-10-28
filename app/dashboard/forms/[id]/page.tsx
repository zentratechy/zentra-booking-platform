'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';

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

const fieldTypes = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'select', label: 'Dropdown', icon: '📋' },
  { value: 'checkbox', label: 'Checkboxes', icon: '☑️' },
  { value: 'radio', label: 'Radio Buttons', icon: '🔘' },
  { value: 'date', label: 'Date Picker', icon: '📅' },
  { value: 'number', label: 'Number Input', icon: '🔢' }
];

const categories = ['Health & Safety', 'Bridal', 'Aesthetics', 'Hair', 'Skincare', 'Wellness', 'Hair Removal', 'General'];

export default function EditFormPage() {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<FormTemplate | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [fields, setFields] = useState<FormField[]>([]);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        
        // Ensure all fields have proper options arrays
        const processedFields = formData.fields.map(field => {
          if ((field.type === 'select' || field.type === 'checkbox' || field.type === 'radio') && !field.options) {
            return { ...field, options: ['Option 1', 'Option 2'] };
          }
          return field;
        });
        
        setForm(formData);
        setFormName(formData.name);
        setFormDescription(formData.description);
        setFormCategory(formData.category);
        setFields(processedFields);
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

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: '',
      required: false,
      options: type === 'select' || type === 'checkbox' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
      placeholder: ''
    };

    setFields([...fields, newField]);
    setEditingField(newField);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
    
    if (editingField?.id === fieldId) {
      setEditingField({ ...editingField, ...updates });
    }
  };

  const deleteField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
    if (editingField?.id === fieldId) {
      setEditingField(null);
    }
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = fields.findIndex(field => field.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];
    setFields(newFields);
  };

  const addOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    const newOptions = [...field.options, `Option ${field.options.length + 1}`];
    updateField(fieldId, { options: newOptions });
  };

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    const newOptions = [...field.options];
    newOptions[optionIndex] = value;
    updateField(fieldId, { options: newOptions });
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options || field.options.length <= 1) return;

    const newOptions = field.options.filter((_, index) => index !== optionIndex);
    updateField(fieldId, { options: newOptions });
  };

  const saveForm = async () => {
    if (!formName.trim()) {
      showToast('Please enter a form name', 'error');
      return;
    }

    if (fields.length === 0) {
      showToast('Please add at least one field', 'error');
      return;
    }

    // Validate fields
    for (const field of fields) {
      if (!field.label.trim()) {
        showToast('All fields must have a label', 'error');
        return;
      }
      if ((field.type === 'select' || field.type === 'checkbox' || field.type === 'radio')) {
        if (!field.options || field.options.length === 0) {
          showToast(`Field "${field.label}" must have at least one option`, 'error');
          return;
        }
        
        // Check if all options are empty or whitespace
        const validOptions = field.options.filter(option => option && option.trim());
        
        if (validOptions.length === 0) {
          showToast(`Field "${field.label}" must have at least one valid option (not empty)`, 'error');
          return;
        }
        
        // Additional check: ensure no duplicate options
        const uniqueOptions = [...new Set(validOptions)];
        if (uniqueOptions.length !== validOptions.length) {
          showToast(`Field "${field.label}" has duplicate options. Please remove duplicates.`, 'error');
          return;
        }
      }
    }

    setSaving(true);

    try {
      await updateDoc(doc(db, 'consultationForms', formId), {
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory,
        fields,
        updatedAt: new Date()
      });

      showToast('Form updated successfully!', 'success');
      router.push('/dashboard/forms');
    } catch (error) {
      console.error('Error updating form:', error);
      showToast('Failed to update form', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
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
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/dashboard/forms')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Forms
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Form</h1>
          <p className="text-gray-600">Modify your consultation form</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Form Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter form name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe what this form is for..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Form Fields</h2>
                <span className="text-sm text-gray-500">{fields.length} fields</span>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Add your first field to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-500">#{index + 1}</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {field.label || 'Untitled Field'}
                            </div>
                            <div className="text-sm text-gray-500 capitalize">
                              {field.type} {field.required && '(Required)'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingField(field)}
                            className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => moveField(field.id, 'up')}
                            disabled={index === 0}
                            className="px-2 py-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveField(field.id, 'down')}
                            disabled={index === fields.length - 1}
                            className="px-2 py-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => deleteField(field.id)}
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Add Fields */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Field</h3>
              <div className="space-y-2">
                {fieldTypes.map(fieldType => (
                  <button
                    key={fieldType.value}
                    onClick={() => addField(fieldType.value as FormField['type'])}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xl">{fieldType.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{fieldType.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={saveForm}
                  disabled={saving || !formName.trim() || fields.length === 0}
                  className="w-full px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => router.push('/dashboard/forms')}
                  className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Field Editor Modal */}
        {editingField && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Edit Field</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Field Label</label>
                  <input
                    type="text"
                    value={editingField.label}
                    onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                    placeholder="Enter field label..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Field Type</label>
                  <select
                    value={editingField.type}
                    onChange={(e) => setEditingField({ ...editingField, type: e.target.value as FormField['type'] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {fieldTypes.map(fieldType => (
                      <option key={fieldType.value} value={fieldType.value}>
                        {fieldType.icon} {fieldType.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Placeholder</label>
                  <input
                    type="text"
                    value={editingField.placeholder || ''}
                    onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                    placeholder="Enter placeholder text..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="required"
                    checked={editingField.required}
                    onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="required" className="ml-2 text-sm font-medium text-gray-700">
                    Required field
                  </label>
                </div>

                {/* Options for select, checkbox, radio */}
                {(editingField.type === 'select' || editingField.type === 'checkbox' || editingField.type === 'radio') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                    <div className="space-y-2">
                      {editingField.options?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(editingField.options || [])];
                              newOptions[index] = e.target.value;
                              setEditingField({ ...editingField, options: newOptions });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => removeOption(editingField.id, index)}
                            className="px-2 py-1 text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addOption(editingField.id)}
                        className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setEditingField(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateField(editingField.id, editingField);
                    setEditingField(null);
                  }}
                  className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                >
                  Save Field
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
