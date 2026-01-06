'use client';

import { ReactNode } from 'react';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Modal component that's full-screen on mobile, normal size on desktop
 * Keeps desktop layout exactly as it was
 */
export default function MobileModal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md'
}: MobileModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full'
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 lg:p-4"
      onClick={onClose}
    >
      <div 
        className={`
          bg-white rounded-2xl lg:rounded-2xl
          w-full lg:w-auto
          h-full lg:h-auto
          max-h-full lg:max-h-[90vh]
          ${sizeClasses[size]}
          overflow-y-auto
          modal-container
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900">{title}</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 -mr-2"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

