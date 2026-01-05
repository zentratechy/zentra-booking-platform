'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getColorScheme, type ColorScheme } from '@/lib/colorSchemes';

interface ThemeContextType {
  colorScheme: ColorScheme;
  colorSchemeId: string;
  refreshTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [colorSchemeId, setColorSchemeId] = useState('classic');
  const colorScheme = getColorScheme(colorSchemeId);

  const fetchTheme = async () => {
    if (!user) return;
    
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
      if (businessDoc.exists()) {
        const data = businessDoc.data();
        setColorSchemeId(data.colorScheme || 'classic');
      }
    } catch (error) {
      console.error('Error fetching theme:', error);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, [user]);

  // Update CSS variables when color scheme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', colorScheme.colors.primary);
      document.documentElement.style.setProperty('--color-primary-dark', colorScheme.colors.primaryDark);
      document.documentElement.style.setProperty('--color-secondary', colorScheme.colors.secondary);
      document.documentElement.style.setProperty('--color-accent', colorScheme.colors.accent);
    }
  }, [colorScheme]);

  return (
    <ThemeContext.Provider value={{ colorScheme, colorSchemeId, refreshTheme: fetchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
















