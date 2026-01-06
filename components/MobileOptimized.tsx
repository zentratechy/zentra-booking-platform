'use client';

import { ReactNode } from 'react';

interface MobileOptimizedProps {
  children: ReactNode;
  mobileClassName?: string;
  desktopClassName?: string;
}

/**
 * Component that renders different content/styles for mobile vs desktop
 * Desktop layout remains unchanged, mobile gets optimized version
 */
export default function MobileOptimized({ 
  children, 
  mobileClassName = '',
  desktopClassName = '' 
}: MobileOptimizedProps) {
  return (
    <>
      {/* Desktop version - unchanged */}
      <div className={`hidden lg:block ${desktopClassName}`}>
        {children}
      </div>
      
      {/* Mobile version - optimized */}
      <div className={`lg:hidden ${mobileClassName}`}>
        {children}
      </div>
    </>
  );
}

/**
 * Hook to detect if we're on mobile
 */
export function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024; // lg breakpoint
}

