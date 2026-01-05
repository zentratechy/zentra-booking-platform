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
  lastVisit?: Date | string | any; // Can be Date, ISO string, or Firestore Timestamp
  createdAt?: Date | string | any; // Can be Date, ISO string, or Firestore Timestamp
  verified?: boolean;
}

interface CustomerAuthContextType {
  customer: Customer | null;
  loading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  verifyEmail: (email: string, verificationCode: string) => Promise<boolean>;
  sendVerificationCode: (email: string) => Promise<boolean>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

// Helper function to safely convert any date-like value to a Date object
const convertToDate = (value: any): Date | null => {
  if (!value) return null;
  
  // Already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  // Firestore Timestamp with toDate method
  if (value && typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
    try {
      const date = value.toDate();
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  
  // Firestore Timestamp format from JSON (has seconds property)
  if (value && typeof value === 'object' && value.seconds && typeof value.seconds === 'number') {
    try {
      const date = new Date(value.seconds * 1000);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  
  // String (including ISO date strings from JSON.stringify)
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      // Check if it's a valid date string
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch {
      return null;
    }
  }
  
  // Number (timestamp)
  if (typeof value === 'number') {
    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  
  return null;
};

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if customer is already logged in (from sessionStorage)
    const savedCustomer = sessionStorage.getItem('customer');
    if (savedCustomer) {
      try {
        const parsed = JSON.parse(savedCustomer);
        // Convert all date fields to proper Date objects
        const convertedDate = convertToDate(parsed.lastVisit);
        const convertedCreatedAt = convertToDate(parsed.createdAt);
        
        // Only set dates if conversion was successful, otherwise remove them
        // Ensure dates are proper Date objects (not strings from JSON)
        const cleanedCustomer: Customer = {
          ...parsed,
          lastVisit: convertedDate || undefined,
          createdAt: convertedCreatedAt || undefined
        };
        
        setCustomer(cleanedCustomer);
      } catch (error) {
        console.error('Error parsing saved customer:', error);
        sessionStorage.removeItem('customer');
      }
    }
    setLoading(false);
  }, []);

  const sendVerificationCode = async (email: string): Promise<boolean> => {
    try {
      // Generate a 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the code temporarily
      sessionStorage.setItem('verificationCode', code);
      sessionStorage.setItem('verificationEmail', email);
      
      // Send email via our API
      const response = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Email API error:', errorData);
        return false;
      }

      console.log(`📧 Verification code email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending verification code:', error);
      return false;
    }
  };

  const verifyEmail = async (email: string, verificationCode: string): Promise<boolean> => {
    try {
      const storedCode = sessionStorage.getItem('verificationCode');
      const storedEmail = sessionStorage.getItem('verificationEmail');
      
      if (storedCode !== verificationCode || storedEmail !== email) {
        return false;
      }
      
      // Clear the stored code
      sessionStorage.removeItem('verificationCode');
      sessionStorage.removeItem('verificationEmail');
      
      // Look up customer by email
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Customer doesn't exist, create new one
        const newCustomerData = {
          email,
          phone: '', // Phone is optional now
          firstName: '',
          lastName: '',
          name: '', // For backward compatibility
          loyaltyPoints: 0,
          verified: true,
          createdAt: serverTimestamp(),
          lastVisit: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'clients'), newCustomerData);
        // Create customer object with proper Date objects (not Timestamps)
        // Note: When we JSON.stringify, Date objects become ISO strings
        // When we JSON.parse, they become strings, so we'll convert them back in useEffect
        const now = new Date();
        const customerForStorage: Customer = {
          id: docRef.id,
          email: newCustomerData.email,
          phone: newCustomerData.phone || '',
          firstName: newCustomerData.firstName,
          lastName: newCustomerData.lastName,
          name: newCustomerData.name,
          loyaltyPoints: newCustomerData.loyaltyPoints,
          verified: newCustomerData.verified,
          createdAt: now, // Will be serialized as ISO string, then converted back
          lastVisit: now // Will be serialized as ISO string, then converted back
        };
        setCustomer(customerForStorage);
        // Store as JSON (dates will be ISO strings)
        sessionStorage.setItem('customer', JSON.stringify(customerForStorage));
        return true;
      } else {
        // Customer exists, update verification status
        const customerDoc = querySnapshot.docs[0];
        const customerData = customerDoc.data();
        
        // Update customer verification status
        await updateDoc(doc(db, 'clients', customerDoc.id), {
          verified: true,
          lastVisit: serverTimestamp()
        });
        
        // Convert Firestore Timestamps to Date objects for sessionStorage
        const now = new Date();
        const convertedCreatedAt = convertToDate(customerData.createdAt) || now;
        const convertedLastVisit = convertToDate(customerData.lastVisit) || now;
        
        const updatedCustomer: Customer = {
          id: customerDoc.id,
          email: customerData.email || '',
          phone: customerData.phone || '',
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          name: customerData.name || '',
          loyaltyPoints: customerData.loyaltyPoints || 0,
          verified: true,
          createdAt: convertedCreatedAt,
          lastVisit: convertedLastVisit
        };
        setCustomer(updatedCustomer);
        sessionStorage.setItem('customer', JSON.stringify(updatedCustomer));
        return true;
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  };

  const login = async (email: string): Promise<boolean> => {
    try {
      // First, send verification code to email
      const codeSent = await sendVerificationCode(email);
      if (!codeSent) {
        return false;
      }
      
      // Store email for verification step
      sessionStorage.setItem('pendingEmail', email);
      
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
    sessionStorage.removeItem('verificationCode');
    sessionStorage.removeItem('verificationEmail');
  };

  const value = {
    customer,
    loading,
    login,
    logout,
    verifyEmail,
    sendVerificationCode
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};
