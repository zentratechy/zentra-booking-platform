'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: 'business' | 'customer' | null;
  businessId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: null,
  businessId: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'business' | 'customer' | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user);
      
      if (user) {
        // Determine user role by checking if they exist in businesses or clients collection
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          if (!db) {
            console.warn('Firestore is not initialized');
            setLoading(false);
            return;
          }
          
          // Check if user is a business owner
          const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
          if (businessDoc.exists()) {
            setUserRole('business');
            setBusinessId(user.uid);
          } else {
            // Check if user is a customer
            const clientDoc = await getDoc(doc(db, 'clients', user.uid));
            if (clientDoc.exists()) {
              setUserRole('customer');
              setBusinessId(null);
            } else {
              // User exists in auth but not in either collection - treat as customer
              setUserRole('customer');
              setBusinessId(null);
            }
          }
        } catch (error) {
          console.error('Error determining user role:', error);
          setUserRole(null);
          setBusinessId(null);
        }
      } else {
        setUserRole(null);
        setBusinessId(null);
      }
      
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userRole, businessId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


