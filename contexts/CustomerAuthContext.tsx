'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Customer {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  name?: string; // For backward compatibility
  loyaltyPoints?: number;
  lastVisit?: any;
  verified?: boolean;
}

interface CustomerAuthContextType {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, phone: string) => Promise<boolean>;
  logout: () => void;
  verifyPhone: (email: string, phone: string, verificationCode: string) => Promise<boolean>;
  sendVerificationCode: (phone: string) => Promise<boolean>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if customer is already logged in (from sessionStorage)
    const savedCustomer = sessionStorage.getItem('customer');
    if (savedCustomer) {
      try {
        setCustomer(JSON.parse(savedCustomer));
      } catch (error) {
        console.error('Error parsing saved customer:', error);
        sessionStorage.removeItem('customer');
      }
    }
    setLoading(false);
  }, []);

  const sendVerificationCode = async (phone: string): Promise<boolean> => {
    try {
      // Generate a 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the code temporarily
      sessionStorage.setItem('verificationCode', code);
      sessionStorage.setItem('verificationPhone', phone);
      
      // Send SMS via our API
      const response = await fetch('/api/sms/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('SMS API error:', errorData);
        
        // Fallback: log to console if SMS fails (for development)
        console.log(`📱 Verification code for ${phone}: ${code} (SMS failed, using console fallback)`);
        return true; // Still return true for development
      }

      console.log(`📱 SMS verification code sent to ${phone}`);
      return true;
    } catch (error) {
      console.error('Error sending verification code:', error);
      
      // Fallback: log to console if SMS fails (for development)
      const code = sessionStorage.getItem('verificationCode');
      if (code) {
        console.log(`📱 Verification code for ${phone}: ${code} (SMS failed, using console fallback)`);
      }
      
      return true; // Still return true for development
    }
  };

  const verifyPhone = async (email: string, phone: string, verificationCode: string): Promise<boolean> => {
    try {
      const storedCode = sessionStorage.getItem('verificationCode');
      const storedPhone = sessionStorage.getItem('verificationPhone');
      
      if (storedCode !== verificationCode || storedPhone !== phone) {
        return false;
      }
      
      // Clear the stored code
      sessionStorage.removeItem('verificationCode');
      sessionStorage.removeItem('verificationPhone');
      
      // Look up customer by email
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Customer doesn't exist, create new one
        const newCustomerData = {
          email,
          phone,
          firstName: '',
          lastName: '',
          name: '', // For backward compatibility
          loyaltyPoints: 0,
          verified: true,
          createdAt: serverTimestamp(),
          lastVisit: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'clients'), newCustomerData);
        const newCustomer = { id: docRef.id, ...newCustomerData };
        setCustomer(newCustomer);
        sessionStorage.setItem('customer', JSON.stringify(newCustomer));
        return true;
      } else {
        // Customer exists, update phone and verification status
        const customerDoc = querySnapshot.docs[0];
        const customerData = { id: customerDoc.id, ...customerDoc.data() } as Customer;
        
        // Update customer with new phone and verification
        await updateDoc(doc(db, 'clients', customerDoc.id), {
          phone,
          verified: true,
          lastVisit: serverTimestamp()
        });
        
        const updatedCustomer = { ...customerData, phone, verified: true };
        setCustomer(updatedCustomer);
        sessionStorage.setItem('customer', JSON.stringify(updatedCustomer));
        return true;
      }
    } catch (error) {
      console.error('Error verifying phone:', error);
      return false;
    }
  };

  const login = async (email: string, phone: string): Promise<boolean> => {
    try {
      // First, send verification code
      const codeSent = await sendVerificationCode(phone);
      if (!codeSent) {
        return false;
      }
      
      // Store email for verification step
      sessionStorage.setItem('pendingEmail', email);
      sessionStorage.setItem('pendingPhone', phone);
      
      return true;
    } catch (error) {
      console.error('Error in login:', error);
      return false;
    }
  };

  const logout = () => {
    setCustomer(null);
    sessionStorage.removeItem('customer');
    sessionStorage.removeItem('pendingEmail');
    sessionStorage.removeItem('pendingPhone');
    sessionStorage.removeItem('verificationCode');
    sessionStorage.removeItem('verificationPhone');
  };

  const value = {
    customer,
    loading,
    login,
    logout,
    verifyPhone,
    sendVerificationCode
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};
