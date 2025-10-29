'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, storage, auth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOutUser } from '@/lib/auth';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useToast } from '@/hooks/useToast';
import { colorSchemes, getColorScheme } from '@/lib/colorSchemes';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';

function SettingsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const { refreshTheme } = useTheme();
  const { isLimitReached, limits, trialStatus } = useSubscription();
  const [businessData, setBusinessData] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'business' | 'locations' | 'calendar' | 'bookings' | 'payments' | 'account' | 'styles' | 'emails'>('business');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedColorScheme, setSelectedColorScheme] = useState('classic');
  
  // Payment provider connection states
  const [stripeConnected, setStripeConnected] = useState(false);
  const [squareConnected, setSquareConnected] = useState(false);
  const [checkingConnections, setCheckingConnections] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [connectingSquare, setConnectingSquare] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<any>(null);
  
  // Location modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLocationLimitModal, setShowLocationLimitModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [locationFormData, setLocationFormData] = useState({
    name: '',
    address: '',
    phone: '',
    hours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: true },
    }
  });

  // Account management states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCompanyDetailsModal, setShowCompanyDetailsModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [exportingData, setExportingData] = useState(false);
  const [editingStripeAccountId, setEditingStripeAccountId] = useState(false);
  const [stripeAccountIdInput, setStripeAccountIdInput] = useState('');
  
  // Get color scheme for styling
  const colorScheme = getColorScheme(selectedColorScheme);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
        if (businessDoc.exists()) {
          const data = businessDoc.data();
          setBusinessData(data);
          setSelectedColorScheme(data.colorScheme || 'classic');
        }

        // Fetch locations
        const locationsQuery = query(collection(db, 'locations'), where('businessId', '==', user.uid));
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocations(locationsData);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    
    // Check for Stripe connection results in URL
    const urlParams = new URLSearchParams(window.location.search);
    const stripeConnected = urlParams.get('stripe_connected');
    const stripeError = urlParams.get('stripe_error');
    const accountId = urlParams.get('account_id');
    
    if (stripeConnected === 'true') {
      showToast(`Stripe connected successfully${accountId ? ` (${accountId.slice(0, 8)}...)` : ''}!`, 'success');
      // Clean up URL and refresh to update connection status
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh business data and re-check account status
      (async () => {
        const businessDoc = await getDoc(doc(db, 'businesses', user!.uid));
        if (businessDoc.exists()) {
          const updatedData = businessDoc.data();
          setBusinessData({ id: businessDoc.id, ...updatedData });
          
          // Re-check Stripe connection status after refresh
          if (updatedData.paymentConfig?.stripe?.accountId) {
            try {
              const stripeResponse = await fetch('/api/stripe/account-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: updatedData.paymentConfig.stripe.accountId })
              });
              const stripeData = await stripeResponse.json();
              setStripeAccountStatus(stripeData);
              setStripeConnected(stripeData.connected || false);
            } catch (error) {
              console.error('Error checking Stripe connection:', error);
            }
          }
        }
      })();
    } else if (stripeError) {
      // Decode the error message (it might be URL encoded)
      const decodedError = decodeURIComponent(stripeError);
      
      const errorMessages: { [key: string]: string } = {
        'missing_params': 'Missing authorization parameters. Please try connecting again.',
        'server_error': 'Server error during connection. Please try again in a moment.',
        'storage_error': 'Error saving connection data. Please contact support.',
        'no_account_id': 'Failed to receive account ID from Stripe. Please try connecting again.',
      };
      
      // Check if it's a known error or show the decoded error
      const errorMessage = errorMessages[decodedError] || errorMessages[stripeError] || decodedError || stripeError;
      showToast(`Stripe connection failed: ${errorMessage}`, 'error');
      
      // Log for debugging
      console.error('Stripe connection error:', {
        rawError: stripeError,
        decodedError: decodedError,
        message: errorMessage
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for Square connection results in URL
    const squareConnected = urlParams.get('square_connected');
    const squareError = urlParams.get('square_error');
    const merchantName = urlParams.get('merchant_name');
    
    if (squareConnected === 'true') {
      showToast(`Square connected successfully${merchantName ? ` (${merchantName})` : ''}!`, 'success');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (squareError) {
      // Decode the error message (it might be URL encoded)
      const decodedError = decodeURIComponent(squareError);
      
      const errorMessages: { [key: string]: string } = {
        'missing_params': 'Missing authorization parameters. Please try connecting again.',
        'missing required parameter \'redirect_uri\'': 'OAuth configuration error. This has been fixed - please try connecting again.',
        'server_error': 'Server error during connection. Please try again in a moment.',
        'storage_error': 'Error saving connection data. Please contact support.',
        'access_denied': 'Square authorization was denied. Please try again.',
        'invalid_request': 'Invalid Square request. Please verify your Square app configuration.',
        'app_id_missing': 'Square application ID not configured. Please contact support.',
        'app_secret_missing': 'Square application secret not configured. Please contact support.',
        'no_access_token': 'Failed to receive access token from Square. The authorization code may have expired. Please try again.',
        'token_exchange_failed': 'Failed to exchange authorization code. Please try connecting again.',
        'invalid_authorization_code': 'The authorization code is invalid or has expired. Please try connecting again from the beginning.',
        '400': 'Square returned a 400 error. This usually means the authorization code was invalid or expired. Please try connecting again.',
        'HTTP 400': 'Square API returned 400 Bad Request. The authorization code may be invalid or expired. Please try again.',
      };
      
      // Check if it's a known error or show the decoded error
      const errorMessage = errorMessages[decodedError] || errorMessages[squareError] || decodedError || squareError;
      showToast(`Square connection failed: ${errorMessage}`, 'error');
      
      // Log for debugging
      console.error('Square connection error:', {
        rawError: squareError,
        decodedError: decodedError,
        message: errorMessage
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Check payment provider connections
  const checkPaymentConnections = async () => {
    if (!businessData) return;
    
    setCheckingConnections(true);
    
    try {
      // Check Stripe connection
      if (businessData.paymentConfig?.stripe?.accountId) {
        try {
          const stripeResponse = await fetch('/api/stripe/account-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: businessData.paymentConfig.stripe.accountId })
          });
          const stripeData = await stripeResponse.json();
          setStripeAccountStatus(stripeData);
          setStripeConnected(stripeData.connected || false);
        } catch (error) {
          console.error('Error checking Stripe connection:', error);
          setStripeConnected(false);
          setStripeAccountStatus(null);
        }
      } else {
        setStripeConnected(false);
        setStripeAccountStatus(null);
      }

      // Check Square connection
      if (businessData.paymentConfig?.square?.accessToken) {
        // For Square, we can assume connected if we have an access token
        // In a real implementation, you might want to make an API call to verify
        setSquareConnected(true);
      } else {
        setSquareConnected(false);
      }
    } catch (error) {
      console.error('Error checking payment connections:', error);
    } finally {
      setCheckingConnections(false);
    }
  };

  // Check connections when business data loads
  useEffect(() => {
    if (businessData) {
      checkPaymentConnections();
    }
  }, [businessData]);

  const handleUpdate = async (field: string, value: any) => {
    if (!user) return;

    try {
      setSaving(true);
      await updateDoc(doc(db, 'businesses', user.uid), {
        [field]: value,
      });

      setBusinessData((prev: any) => ({ ...prev, [field]: value }));
      showToast('Settings updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating:', error);
      showToast('Failed to update settings: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    try {
      setUploadingLogo(true);
      const file = e.target.files[0];
      const logoRef = ref(storage, `businesses/${user.uid}/logo.${file.name.split('.').pop()}`);
      
      await uploadBytes(logoRef, file);
      const logoURL = await getDownloadURL(logoRef);
      
      await updateDoc(doc(db, 'businesses', user.uid), { logo: logoURL });
      setBusinessData((prev: any) => ({ ...prev, logo: logoURL }));
      
      // Dispatch custom event to update sidebar logo
      window.dispatchEvent(new CustomEvent('logoUpdated'));
      
      showToast('Logo uploaded successfully!', 'success');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      showToast('Failed to upload logo: ' + error.message, 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleEmailLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    try {
      setUploadingLogo(true);
      const file = e.target.files[0];
      const emailLogoRef = ref(storage, `businesses/${user.uid}/email-logo.${file.name.split('.').pop()}`);
      
      await uploadBytes(emailLogoRef, file);
      const emailLogoURL = await getDownloadURL(emailLogoRef);
      
      const updatedEmailSettings = {
        ...businessData?.emailSettings,
        logo: emailLogoURL
      };
      
      await updateDoc(doc(db, 'businesses', user.uid), { emailSettings: updatedEmailSettings });
      setBusinessData((prev: any) => ({ 
        ...prev, 
        emailSettings: updatedEmailSettings 
      }));
      
      showToast('Email logo uploaded successfully!', 'success');
    } catch (error: any) {
      console.error('Error uploading email logo:', error);
      showToast('Failed to upload email logo: ' + error.message, 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddLocation = () => {
    // Check location limit
    if (isLimitReached('locations', locations.length)) {
      setShowLocationLimitModal(true);
      return;
    }

    setEditingLocation(null);
    setLocationFormData({
      name: '',
      address: '',
      phone: '',
      hours: {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '17:00', closed: false },
        saturday: { open: '09:00', close: '17:00', closed: false },
        sunday: { open: '09:00', close: '17:00', closed: true },
      }
    });
    setShowLocationModal(true);
  };

  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    setLocationFormData({
      name: location.name,
      address: location.address,
      phone: location.phone,
      hours: location.hours || {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '17:00', closed: false },
        saturday: { open: '09:00', close: '17:00', closed: false },
        sunday: { open: '09:00', close: '17:00', closed: true },
      }
    });
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    if (!user) return;

    try {
      setSaving(true);

      if (editingLocation) {
        // Update existing location
        await updateDoc(doc(db, 'locations', editingLocation.id), locationFormData);
        setLocations(locations.map(loc => loc.id === editingLocation.id ? { ...loc, ...locationFormData } : loc));
        showToast('Location updated successfully!', 'success');
      } else {
        // Add new location
        const locationRef = await addDoc(collection(db, 'locations'), {
          ...locationFormData,
          businessId: user.uid,
          createdAt: serverTimestamp(),
        });
        setLocations([...locations, { id: locationRef.id, ...locationFormData }]);
        showToast('Location added successfully!', 'success');
      }

      setShowLocationModal(false);
    } catch (error: any) {
      console.error('Error saving location:', error);
      showToast('Failed to save location: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await deleteDoc(doc(db, 'locations', locationId));
      setLocations(locations.filter(loc => loc.id !== locationId));
      showToast('Location deleted successfully!', 'success');
    } catch (error: any) {
      console.error('Error deleting location:', error);
      showToast('Failed to delete location: ' + error.message, 'error');
    }
  };

  // Account management functions
  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    setDeleteConfirmText('');
  };

  const handleDeleteWithPassword = async () => {
    if (!user?.email || !password) return;

    try {
      setDeleting(true);

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser!, credential);

      // Batch delete all data
      const batch = writeBatch(db);

      // Delete all sub-collections
      const collections = ['appointments', 'clients', 'staff', 'services', 'consultations', 'loyalty', 'locations', 'vouchers', 'blockedTimes'];
      
      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), where('businessId', '==', user.uid));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
      }

      // Delete business document
      batch.delete(doc(db, 'businesses', user.uid));

      // Commit batch
      await batch.commit();

      // Delete auth user
      await deleteUser(auth.currentUser!);

      // Sign out and redirect
      await signOutUser();
      router.push('/');
      showToast('Account deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      showToast('Failed to delete account: ' + error.message, 'error');
    } finally {
      setDeleting(false);
      setShowPasswordModal(false);
      setShowDeleteModal(false);
      setPassword('');
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordFormData.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    try {
      setSaving(true);

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, passwordFormData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);

      // Update password
      await updatePassword(auth.currentUser!, passwordFormData.newPassword);

      showToast('Password changed successfully!', 'success');
      setShowChangePasswordModal(false);
      setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      showToast('Failed to change password: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCompanyDetails = async () => {
    if (!user) return;

    try {
      setSaving(true);

      await updateDoc(doc(db, 'businesses', user.uid), {
        name: companyFormData.businessName,
        ownerName: companyFormData.ownerName,
        phone: companyFormData.phone,
        address: companyFormData.address,
        city: companyFormData.city,
        state: companyFormData.state,
        zipCode: companyFormData.zipCode,
      });

      setBusinessData((prev: any) => ({
        ...prev,
        name: companyFormData.businessName,
        ownerName: companyFormData.ownerName,
        phone: companyFormData.phone,
        address: companyFormData.address,
        city: companyFormData.city,
        state: companyFormData.state,
        zipCode: companyFormData.zipCode,
      }));

      showToast('Company details updated successfully!', 'success');
      setShowCompanyDetailsModal(false);
    } catch (error: any) {
      console.error('Error updating company details:', error);
      showToast('Failed to update company details: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportAllData = async () => {
    if (!user) return;

    try {
      setExportingData(true);

      // Fetch all business data
      const collections = ['appointments', 'clients', 'staff', 'services', 'consultations', 'loyalty', 'locations', 'vouchers'];
      const allData: any = { business: businessData };

      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), where('businessId', '==', user.uid));
        const snapshot = await getDocs(q);
        allData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // Create JSON file and download
      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zentra-data-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      showToast('Data exported successfully!', 'success');
    } catch (error: any) {
      console.error('Error exporting data:', error);
      showToast('Failed to export data: ' + error.message, 'error');
    } finally {
      setExportingData(false);
    }
  };

  const handleColorSchemeUpdate = async (schemeId: string) => {
    setSelectedColorScheme(schemeId);
    await handleUpdate('colorScheme', schemeId);
    refreshTheme(); // Refresh global theme
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }




  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      // Validate required data
      if (!user?.email) {
        showToast('User email is required', 'error');
        setConnectingStripe(false);
        return;
      }

      // Create Stripe Connect account (businesses can connect existing or create new during onboarding)
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email,
          businessName: businessData?.businessName || businessData?.ownerName || 'Business'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Stripe connection error:', {
          status: response.status,
          error: data.error,
          fullResponse: data
        });
        showToast(data.error || 'Failed to connect Stripe', 'error');
        setConnectingStripe(false);
        return;
      }

      if (data.accountId) {
        await updateDoc(doc(db, 'businesses', user!.uid), {
          paymentProvider: 'stripe',
          'paymentConfig.stripe.accountId': data.accountId,
        });

        const linkResponse = await fetch('/api/stripe/account-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: data.accountId,
            returnUrl: `${window.location.origin}/dashboard/settings?stripe_connected=true`,
            refreshUrl: `${window.location.origin}/dashboard/settings`,
          }),
        });

        const linkData = await linkResponse.json();

        if (linkData.url) {
          // Redirect to Stripe onboarding (businesses can connect existing or create new account here)
          window.location.href = linkData.url;
        } else {
          setConnectingStripe(false);
        }
      } else {
        setConnectingStripe(false);
      }
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      showToast('Failed to connect Stripe: ' + error.message, 'error');
      setConnectingStripe(false);
    }
  };

  const handleCompleteStripeSetup = async () => {
    if (!user || !businessData?.paymentConfig?.stripe?.accountId) return;
    
    setConnectingStripe(true);
    try {
      const linkResponse = await fetch('/api/stripe/account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: businessData.paymentConfig.stripe.accountId,
          returnUrl: `${window.location.origin}/dashboard/settings?stripe_connected=true`,
          refreshUrl: `${window.location.origin}/dashboard/settings`,
        }),
      });

      const linkData = await linkResponse.json();

      if (linkData.url) {
        // Redirect to Stripe onboarding to complete setup
        window.location.href = linkData.url;
      } else {
        setConnectingStripe(false);
        showToast('Failed to generate setup link', 'error');
      }
    } catch (error: any) {
      console.error('Error completing Stripe setup:', error);
      showToast('Failed to complete Stripe setup: ' + error.message, 'error');
      setConnectingStripe(false);
    }
  };

  const handleConnectSquare = async () => {
    setConnectingSquare(true);
    try {
      const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      const isSandbox = squareAppId?.startsWith('sandbox-');

      // Square OAuth requires user to be logged into Square dashboard first
      // Show helpful message and open Square dashboard in new tab
      const squareDashboardUrl = isSandbox
        ? 'https://app.squareupsandbox.com/dashboard/'
        : 'https://squareup.com/dashboard/';

      // Open Square dashboard in new tab so user can log in if needed
      window.open(squareDashboardUrl, '_blank');
      
      // Show toast with instructions
      showToast('Opening Square dashboard. Please ensure you are logged in, then authorize Zentra.', 'info');
      
      // Normalize domain - remove www if present for consistency
      let domain = window.location.hostname;
      if (domain.startsWith('www.')) {
        domain = domain.substring(4); // Remove 'www.'
      }
      const redirectUri = `https://${domain}/api/square/oauth`;
      const state = user!.uid;
      const scope = encodeURIComponent('MERCHANT_PROFILE_READ PAYMENTS_WRITE PAYMENTS_READ');

      // Square OAuth base URL - MUST use connect subdomain
      const baseUrl = isSandbox
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';

      // Construct OAuth URL with proper encoding
      const oauthUrl = `${baseUrl}/oauth2/authorize?client_id=${encodeURIComponent(squareAppId!)}&scope=${scope}&state=${encodeURIComponent(state)}&session=false&redirect_uri=${encodeURIComponent(redirectUri)}`;

      console.log('Square OAuth URL:', oauthUrl);
      console.log('Redirect URI:', redirectUri);
      console.log('Domain (normalized):', domain);
      console.log('Square App ID:', squareAppId);
      console.log('Base URL:', baseUrl);
      
      // Verify the URL contains 'connect.' before redirecting
      if (!oauthUrl.includes('connect.')) {
        console.error('ERROR: OAuth URL missing connect subdomain!', oauthUrl);
        showToast('Square OAuth configuration error. Please contact support.', 'error');
        setConnectingSquare(false);
        return;
      }
      
      // Wait a moment for the Square dashboard to open, then redirect to OAuth
      setTimeout(() => {
        window.location.href = oauthUrl;
      }, 1000);
    } catch (error: any) {
      console.error('Error connecting Square:', error);
      showToast('Failed to connect Square: ' + error.message, 'error');
      setConnectingSquare(false);
    }
  };

  const handleUpdateStripeAccountId = async () => {
    if (!stripeAccountIdInput.trim() || !stripeAccountIdInput.startsWith('acct_')) {
      showToast('Please enter a valid Stripe account ID (must start with acct_)', 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'businesses', user!.uid), {
        'paymentConfig.stripe.accountId': stripeAccountIdInput.trim(),
      });

      // Refresh business data
      const businessDoc = await getDoc(doc(db, 'businesses', user!.uid));
      if (businessDoc.exists()) {
        setBusinessData(businessDoc.data());
      }

      setEditingStripeAccountId(false);
      setStripeAccountIdInput('');
      showToast('Stripe account ID updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating Stripe account ID:', error);
      showToast('Failed to update Stripe account ID: ' + error.message, 'error');
    }
  };

  const handleDisconnectStripe = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to disconnect your Stripe account? This will disable online payments.');
    if (!confirmed) {
      return;
    }

    try {
      await updateDoc(doc(db, 'businesses', user!.uid), {
        paymentProvider: 'none',
        'paymentConfig.stripe': null,
      });

      setStripeConnected(false);
      showToast('Stripe account disconnected successfully', 'success');
      
      // Refresh business data
      const businessDoc = await getDoc(doc(db, 'businesses', user!.uid));
      if (businessDoc.exists()) {
        setBusinessData(businessDoc.data());
      }
    } catch (error: any) {
      console.error('Error disconnecting Stripe:', error);
      showToast('Failed to disconnect Stripe: ' + error.message, 'error');
    }
  };

  const handleDisconnectSquare = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to disconnect your Square account? This will disable Square payments.');
    if (!confirmed) {
      return;
    }

    try {
      await updateDoc(doc(db, 'businesses', user!.uid), {
        paymentProvider: 'none',
        'paymentConfig.square': null,
      });

      setSquareConnected(false);
      showToast('Square account disconnected successfully', 'success');
      
      // Refresh business data
      const businessDoc = await getDoc(doc(db, 'businesses', user!.uid));
      if (businessDoc.exists()) {
        setBusinessData(businessDoc.data());
      }
    } catch (error: any) {
      console.error('Error disconnecting Square:', error);
      showToast('Failed to disconnect Square: ' + error.message, 'error');
    }
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: any = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  const defaultCancellationReasons = [
    'Poorly',
    'Other commitments',
    'Not necessary now',
    'Did not show',
    'Appointment made in error',
    'Reacted to patch test',
  ];

  const appointmentStatuses = [
    { value: 'not-started', label: 'Not Started', color: 'gray' },
    { value: 'arrived', label: 'Arrived', color: 'blue' },
    { value: 'started', label: 'Started', color: 'yellow' },
    { value: 'completed', label: 'Completed', color: 'green' },
    { value: 'did-not-show', label: 'Did Not Show', color: 'red' },
  ];

  const defaultCancellationTerms = "Cancellations must be made within the specified notice period. Failure to cancel within this timeframe may result in forfeiture of your deposit. We understand that unexpected circumstances arise, so please contact us as soon as possible if you need to cancel or reschedule your appointment.";

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your business settings and preferences</p>
          </div>

          {/* Tabs */}
          <div className="mb-8 border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setSelectedTab('business')}
                className={`pb-4 px-2 font-medium transition-colors relative ${
                  selectedTab === 'business'
                    ? 'text-gray-900 border-b-2'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={selectedTab === 'business' ? { borderColor: colorScheme.colors.primary, color: colorScheme.colors.primary } : {}}
              >
                Business Details
              </button>
              <button
                onClick={() => setSelectedTab('locations')}
                className={`pb-4 px-2 font-medium transition-colors relative ${
                  selectedTab === 'locations'
                    ? 'text-gray-900 border-b-2'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={selectedTab === 'locations' ? { borderColor: colorScheme.colors.primary, color: colorScheme.colors.primary } : {}}
              >
                Locations
              </button>
              <button
                onClick={() => setSelectedTab('calendar')}
                className={`pb-4 px-2 font-medium transition-colors relative ${
                  selectedTab === 'calendar'
                    ? 'text-gray-900 border-b-2'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={selectedTab === 'calendar' ? { borderColor: colorScheme.colors.primary, color: colorScheme.colors.primary } : {}}
              >
                Calendar Settings
              </button>
              <button
                onClick={() => setSelectedTab('bookings')}
                className={`pb-4 px-2 font-medium transition-colors relative ${
                  selectedTab === 'bookings'
                    ? 'text-gray-900 border-b-2'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={selectedTab === 'bookings' ? { borderColor: colorScheme.colors.primary, color: colorScheme.colors.primary } : {}}
              >
                Online Bookings
              </button>
              <button
                onClick={() => setSelectedTab('payments')}
                className={`pb-4 px-2 font-medium transition-colors relative ${
                  selectedTab === 'payments'
                    ? 'text-gray-900 border-b-2'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={selectedTab === 'payments' ? { borderColor: colorScheme.colors.primary, color: colorScheme.colors.primary } : {}}
              >
                Payments
              </button>
              <button
                onClick={() => setSelectedTab('account')}
                className={`pb-4 px-2 font-medium transition-colors relative ${
                  selectedTab === 'account'
                    ? 'text-gray-900 border-b-2'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={selectedTab === 'account' ? { borderColor: colorScheme.colors.primary, color: colorScheme.colors.primary } : {}}
              >
                Account Management
              </button>
              <button
                onClick={() => setSelectedTab('styles')}
                className={`pb-4 px-2 font-medium transition-colors relative ${
                  selectedTab === 'styles'
                    ? 'text-gray-900 border-b-2'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={selectedTab === 'styles' ? { borderColor: colorScheme.colors.primary, color: colorScheme.colors.primary } : {}}
              >
                Styles
              </button>
              <button
                onClick={() => setSelectedTab('emails')}
                className={`pb-4 px-2 font-medium transition-colors relative ${
                  selectedTab === 'emails'
                    ? 'text-gray-900 border-b-2'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={selectedTab === 'emails' ? { borderColor: colorScheme.colors.primary, color: colorScheme.colors.primary } : {}}
              >
                Email Templates
              </button>
            </div>
          </div>

          {/* Business Details Tab */}
          {selectedTab === 'business' && (
            <div className="space-y-6">
              {/* Company Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Company Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={businessData?.businessName || businessData?.name || ''}
                      onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                      onBlur={(e) => handleUpdate('businessName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={businessData?.website || ''}
                      onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                      onBlur={(e) => handleUpdate('website', e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={businessData?.email || ''}
                      onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                      onBlur={(e) => handleUpdate('email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={businessData?.phone || ''}
                      onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                      onBlur={(e) => handleUpdate('phone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Logo</h2>
                
                <div className="flex items-center space-x-6">
                  {businessData?.logo && (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={businessData.logo} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <div>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                    </label>
                    <p className="mt-2 text-xs text-gray-500">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>

              {/* Regional Settings */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Regional Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={businessData?.currency || 'GBP'}
                      onChange={(e) => handleUpdate('currency', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="GBP">£ GBP - British Pound</option>
                      <option value="USD">$ USD - US Dollar</option>
                      <option value="EUR">€ EUR - Euro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={businessData?.timezone || 'Europe/London'}
                      onChange={(e) => handleUpdate('timezone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="Europe/London">London (GMT)</option>
                      <option value="America/New_York">New York (EST)</option>
                      <option value="America/Los_Angeles">Los Angeles (PST)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Locations Tab */}
          {selectedTab === 'locations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Business Locations</h2>
                <button
                  onClick={handleAddLocation}
                  className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                >
                  + Add Location
                </button>
              </div>

              {locations.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No locations yet</h3>
                  <p className="text-gray-600 mb-4">Add your first business location to get started</p>
                  <button
                    onClick={handleAddLocation}
                    className="px-6 py-2 text-white rounded-lg font-medium hover:opacity-90"
                    style={{ backgroundColor: colorScheme.colors.primary }}
                  >
                    Add Location
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {locations.map(location => (
                    <div key={location.id} className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                          <p className="text-gray-600 mt-1">{location.address}</p>
                          <p className="text-gray-600 mt-1">{location.phone}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditLocation(location)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(location.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Operating Hours</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {daysOfWeek.map(day => (
                            <div key={day} className="flex justify-between">
                              <span className="text-gray-600 capitalize">{day}:</span>
                              <span className="text-gray-900">
                                {location.hours?.[day]?.closed
                                  ? 'Closed'
                                  : `${location.hours?.[day]?.open || '09:00'} - ${location.hours?.[day]?.close || '17:00'}`
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calendar Settings Tab */}
          {selectedTab === 'calendar' && (
            <div className="space-y-6">
              {/* Date & Time Format */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Date & Time Format</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                    <select
                      value={businessData?.dateFormat || 'DD/MM/YYYY'}
                      onChange={(e) => handleUpdate('dateFormat', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (12/10/2025)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (10/12/2025)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2025-10-12)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
                    <select
                      value={businessData?.timeFormat || '12h'}
                      onChange={(e) => handleUpdate('timeFormat', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="12h">12-hour (2:30 PM)</option>
                      <option value="24h">24-hour (14:30)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Daily Appointment Reminders */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Daily Appointment Reminders</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Send Tomorrow's Appointments</label>
                      <p className="text-sm text-gray-500">Receive an email with tomorrow's schedule</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessData?.dailyReminders?.enabled || false}
                        onChange={(e) => handleUpdate('dailyReminders', {
                          ...businessData?.dailyReminders,
                          enabled: e.target.checked,
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {businessData?.dailyReminders?.enabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Send To (Staff Member)</label>
                        <select
                          value={businessData?.dailyReminders?.recipientStaffId || user?.uid}
                          onChange={(e) => handleUpdate('dailyReminders', {
                            ...businessData?.dailyReminders,
                            recipientStaffId: e.target.value,
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        >
                          <option value={user?.uid}>Main User ({user?.email})</option>
                          {/* TODO: Add staff members from Firestore */}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Send Time (Hour)</label>
                        <select
                          value={businessData?.dailyReminders?.sendTime || '18:00'}
                          onChange={(e) => handleUpdate('dailyReminders', {
                            ...businessData?.dailyReminders,
                            sendTime: e.target.value,
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        >
                          <option value="00:00">12:00 AM (Midnight)</option>
                          <option value="01:00">1:00 AM</option>
                          <option value="02:00">2:00 AM</option>
                          <option value="03:00">3:00 AM</option>
                          <option value="04:00">4:00 AM</option>
                          <option value="05:00">5:00 AM</option>
                          <option value="06:00">6:00 AM</option>
                          <option value="07:00">7:00 AM</option>
                          <option value="08:00">8:00 AM</option>
                          <option value="09:00">9:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="12:00">12:00 PM (Noon)</option>
                          <option value="13:00">1:00 PM</option>
                          <option value="14:00">2:00 PM</option>
                          <option value="15:00">3:00 PM</option>
                          <option value="16:00">4:00 PM</option>
                          <option value="17:00">5:00 PM</option>
                          <option value="18:00">6:00 PM</option>
                          <option value="19:00">7:00 PM</option>
                          <option value="20:00">8:00 PM</option>
                          <option value="21:00">9:00 PM</option>
                          <option value="22:00">10:00 PM</option>
                          <option value="23:00">11:00 PM</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">Reminders will be sent at the top of your chosen hour daily via Firebase Functions</p>
                      </div>

                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Online Bookings Tab */}
          {selectedTab === 'bookings' && (
            <div className="space-y-6">
              {/* Booking Link */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Link</h2>
                <p className="text-sm text-gray-600 mb-6">Share this link with your customers to allow them to book appointments online. Add this link to your website or social media</p>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/book/${user?.uid}`}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/book/${user?.uid}`);
                      showToast('Booking link copied!', 'success');
                    }}
                    className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90"
                    style={{ backgroundColor: colorScheme.colors.primary }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Voucher Purchase Link */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Voucher Purchase Link</h2>
                <p className="text-sm text-gray-600 mb-6">Share this link with your customers to allow them to purchase gift vouchers online. Add this link to your website or social media</p>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/vouchers/${user?.uid}`}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/vouchers/${user?.uid}`);
                      showToast('Voucher link copied!', 'success');
                    }}
                    className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90"
                    style={{ backgroundColor: colorScheme.colors.primary }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Legal Links */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Legal & Policy Links</h2>
                <p className="text-sm text-gray-500 mb-4">Add links to your privacy policy and terms of service (displayed on booking page)</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Privacy Policy URL</label>
                    <input
                      type="url"
                      value={businessData?.legalLinks?.privacyPolicy || ''}
                      onChange={(e) => setBusinessData({ 
                        ...businessData, 
                        legalLinks: { ...businessData?.legalLinks, privacyPolicy: e.target.value } 
                      })}
                      onBlur={(e) => handleUpdate('legalLinks', {
                        ...businessData?.legalLinks,
                        privacyPolicy: e.target.value,
                      })}
                      placeholder="https://example.com/privacy-policy"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Terms of Service URL</label>
                    <input
                      type="url"
                      value={businessData?.legalLinks?.termsOfService || ''}
                      onChange={(e) => setBusinessData({ 
                        ...businessData, 
                        legalLinks: { ...businessData?.legalLinks, termsOfService: e.target.value } 
                      })}
                      onBlur={(e) => handleUpdate('legalLinks', {
                        ...businessData?.legalLinks,
                        termsOfService: e.target.value,
                      })}
                      placeholder="https://example.com/terms-of-service"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Booking Policy */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Policy</h2>
                <p className="text-sm text-gray-500 mb-6">Choose when online bookings can be made</p>
                
                <div className="space-y-6">
                  {/* Minimum Notice */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Customers can book appointments up to:
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={businessData?.bookingPolicy?.minNoticeHours || 24}
                        onChange={(e) => handleUpdate('bookingPolicy', {
                          ...businessData?.bookingPolicy,
                          minNoticeHours: parseInt(e.target.value),
                        })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        <option value={0}>0 hours</option>
                        <option value={1}>1 hour</option>
                        <option value={2}>2 hours</option>
                        <option value={3}>3 hours</option>
                        <option value={6}>6 hours</option>
                        <option value={12}>12 hours</option>
                        <option value={24}>24 hours</option>
                        <option value={48}>48 hours</option>
                        <option value={72}>72 hours</option>
                      </select>
                      <span className="text-gray-600">before start time</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Minimum advance notice required for bookings
                    </p>
                  </div>

                  {/* Maximum Advance Booking */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Customers can book appointments up to:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={businessData?.bookingPolicy?.maxAdvanceMonths || 6}
                        onChange={(e) => handleUpdate('bookingPolicy', {
                          ...businessData?.bookingPolicy,
                          maxAdvanceMonths: parseInt(e.target.value),
                        })}
                        className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                      <span className="text-gray-600">month(s) in the future</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {(() => {
                        const months = businessData?.bookingPolicy?.maxAdvanceMonths || 6;
                        const futureDate = new Date();
                        futureDate.setMonth(futureDate.getMonth() + months);
                        return `Appointments will be able to be booked up to and including ${futureDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Interval */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Time Interval</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time slot intervals for online bookings</label>
                  <select
                    value={businessData?.bookingTimeInterval || 15}
                    onChange={(e) => handleUpdate('bookingTimeInterval', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                  </select>
                </div>
              </div>

              {/* Default Buffer Time */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Default Buffer Time</h2>
                <p className="text-sm text-gray-500 mb-4">Default buffer time added between appointments. Can be overridden for individual services.</p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buffer time between appointments</label>
                  <select
                    value={businessData?.defaultBufferTime || 0}
                    onChange={(e) => handleUpdate('defaultBufferTime', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value={0}>No buffer</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
              </div>

              {/* Cancellation Reasons */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Cancellation Reasons</h2>
                
                <div className="space-y-2">
                  {(businessData?.cancellationReasons || defaultCancellationReasons).map((reason: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{reason}</span>
                      <button
                        onClick={() => {
                          const newReasons = (businessData?.cancellationReasons || defaultCancellationReasons).filter((_: any, i: number) => i !== index);
                          handleUpdate('cancellationReasons', newReasons);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      const newReason = prompt('Enter new cancellation reason:');
                      if (newReason) {
                        const currentReasons = businessData?.cancellationReasons || defaultCancellationReasons;
                        handleUpdate('cancellationReasons', [...currentReasons, newReason]);
                      }
                    }}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
                  >
                    + Add Reason
                  </button>
                </div>
              </div>

              {/* Appointment Statuses */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Appointment Statuses</h2>
                <p className="text-sm text-gray-500 mb-4">These statuses cannot be edited</p>
                
                <div className="space-y-2">
                  {appointmentStatuses.map(status => {
                    const getStatusColor = (color: string) => {
                      switch (color) {
                        case 'gray': return '#6b7280';
                        case 'blue': return '#3b82f6';
                        case 'yellow': return '#eab308';
                        case 'green': return '#22c55e';
                        case 'red': return '#ef4444';
                        default: return '#6b7280';
                      }
                    };

                    return (
                      <div key={status.value} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getStatusColor(status.color) }}
                          ></span>
                          <span className="text-gray-900">{status.label}</span>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Client Reminders */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Client Reminders</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Send Appointment Reminders</label>
                      <p className="text-sm text-gray-500">Automatically remind clients of upcoming appointments</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessData?.clientReminders?.enabled || false}
                        onChange={(e) => handleUpdate('clientReminders', {
                          ...businessData?.clientReminders,
                          enabled: e.target.checked,
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {businessData?.clientReminders?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Send Reminder (Days Before)</label>
                      <select
                        value={businessData?.clientReminders?.daysBefore || 1}
                        onChange={(e) => handleUpdate('clientReminders', {
                          ...businessData?.clientReminders,
                          daysBefore: parseInt(e.target.value),
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        <option value={1}>1 day before</option>
                        <option value={2}>2 days before</option>
                        <option value={3}>3 days before</option>
                        <option value={7}>1 week before</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Deposit Settings */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Deposit Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Require Deposit</label>
                      <p className="text-sm text-gray-500">Request a deposit for online bookings</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessData?.requireDeposit || businessData?.depositSettings?.required || false}
                        onChange={(e) => handleUpdate('requireDeposit', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {(businessData?.requireDeposit || businessData?.depositSettings?.required) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Deposit (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={businessData?.depositPercentage || businessData?.depositSettings?.percentage || 20}
                        onChange={(e) => handleUpdate('depositPercentage', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Current: {businessData?.depositPercentage || businessData?.depositSettings?.percentage || 20}% of service price
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking & Cancellation Policies */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking & Cancellation Policies</h2>
                
                <div className="space-y-6">
                  {/* Allow Online Changes */}
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Allow Online Booking Changes</label>
                      <p className="text-sm text-gray-500">Include a link in emails for clients to modify their bookings</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessData?.bookingPolicies?.allowOnlineChanges !== false}
                        onChange={(e) => handleUpdate('bookingPolicies', {
                          ...businessData?.bookingPolicies,
                          allowOnlineChanges: e.target.checked,
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Change/Cancel Timeframe */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointments can be changed or cancelled up to
                    </label>
                    <select
                      value={businessData?.bookingPolicies?.changeWindowHours || 24}
                      onChange={(e) => handleUpdate('bookingPolicies', {
                        ...businessData?.bookingPolicies,
                        changeWindowHours: parseInt(e.target.value),
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value={3}>3 hours before</option>
                      <option value={6}>6 hours before</option>
                      <option value={12}>12 hours before</option>
                      <option value={24}>24 hours before</option>
                      <option value={48}>48 hours before</option>
                      <option value={72}>72 hours before</option>
                      <option value={168}>1 week before</option>
                    </select>
                  </div>

                  {/* Cancellation Terms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation Terms</label>
                    <textarea
                      value={businessData?.bookingPolicies?.cancellationTerms || defaultCancellationTerms}
                      onChange={(e) => setBusinessData({
                        ...businessData,
                        bookingPolicies: {
                          ...businessData?.bookingPolicies,
                          cancellationTerms: e.target.value,
                        }
                      })}
                      onBlur={(e) => handleUpdate('bookingPolicies', {
                        ...businessData?.bookingPolicies,
                        cancellationTerms: e.target.value,
                      })}
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder={defaultCancellationTerms}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      These terms will be displayed to clients when booking or cancelling
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {selectedTab === 'payments' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Payment Processing</h2>
                  <button
                    onClick={checkPaymentConnections}
                    disabled={checkingConnections}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <svg className={`w-4 h-4 ${checkingConnections ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{checkingConnections ? 'Checking...' : 'Refresh Status'}</span>
                  </button>
                </div>
                
                {/* Payment Provider Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Current Setup</h3>
                  <div className="flex flex-wrap gap-2">
                    {stripeConnected && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                        </svg>
                        <span>Stripe Connected</span>
                      </span>
                    )}
                    {squareConnected && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.01 4.01h15.98v15.98H4.01z"/>
                        </svg>
                        <span>Square Connected</span>
                      </span>
                    )}
                    {!stripeConnected && !squareConnected && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                        No payment providers connected
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Stripe */}
                  <div className="p-4 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Stripe</h3>
                          <p className="text-sm text-gray-500">Accept card payments online</p>
                        </div>
                      </div>
                      {checkingConnections ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-500">Checking...</span>
                        </div>
                      ) : businessData?.paymentConfig?.stripe?.accountId && stripeAccountStatus && !stripeAccountStatus.connected ? (
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                              Setup Incomplete
                            </span>
                          </div>
                          <button
                            onClick={handleCompleteStripeSetup}
                            disabled={connectingStripe}
                            className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            style={{ backgroundColor: colorScheme.colors.primary }}
                          >
                            {connectingStripe && (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            )}
                            <span>{connectingStripe ? 'Loading...' : 'Complete Setup'}</span>
                          </button>
                          <span className="text-xs text-gray-500 text-right">
                            Account: {businessData.paymentConfig.stripe.accountId.slice(0, 8)}...
                          </span>
                        </div>
                      ) : stripeConnected ? (
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                              Connected
                            </span>
                            <button
                              onClick={handleDisconnectStripe}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-full transition-colors"
                            >
                              Disconnect
                            </button>
                          </div>
                          {businessData?.paymentConfig?.stripe?.accountId && (
                            <div className="flex items-center space-x-2 w-full">
                              {editingStripeAccountId ? (
                                <div className="flex items-center space-x-2 flex-1">
                                  <input
                                    type="text"
                                    value={stripeAccountIdInput || businessData.paymentConfig.stripe.accountId}
                                    onChange={(e) => setStripeAccountIdInput(e.target.value)}
                                    placeholder="acct_..."
                                    className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    style={{ maxWidth: '200px' }}
                                  />
                                  <button
                                    onClick={handleUpdateStripeAccountId}
                                    className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-medium rounded transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingStripeAccountId(false);
                                      setStripeAccountIdInput('');
                                    }}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium rounded transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2 flex-1">
                                  <span className="text-xs text-gray-500">
                                    Account: {businessData.paymentConfig.stripe.accountId}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setStripeAccountIdInput(businessData.paymentConfig.stripe.accountId);
                                      setEditingStripeAccountId(true);
                                    }}
                                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-medium rounded transition-colors"
                                    title="Edit Account ID"
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={handleConnectStripe}
                          disabled={connectingStripe}
                          className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          style={{ backgroundColor: colorScheme.colors.primary }}
                        >
                          {connectingStripe && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          )}
                          <span>{connectingStripe ? 'Connecting...' : 'Connect Stripe'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Square */}
                  <div className="p-4 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.01 4.01h15.98v15.98H4.01z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Square</h3>
                          <p className="text-sm text-gray-500">Process payments with Square</p>
                        </div>
                      </div>
                      {checkingConnections ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-500">Checking...</span>
                        </div>
                      ) : squareConnected ? (
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                            Connected
                          </span>
                          {businessData?.paymentConfig?.square?.merchantId && (
                            <span className="text-xs text-gray-500">
                              Merchant: {businessData.paymentConfig.square.merchantId.slice(0, 8)}...
                            </span>
                          )}
                          <button
                            onClick={handleDisconnectSquare}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-full transition-colors"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleConnectSquare}
                          disabled={connectingSquare}
                          className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          style={{ backgroundColor: colorScheme.colors.primary }}
                        >
                          {connectingSquare && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          )}
                          <span>{connectingSquare ? 'Connecting...' : 'Connect Square'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Management Tab */}
          {selectedTab === 'account' && (
            <div className="space-y-6">
              {/* Change Password */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
                <p className="text-gray-600 mb-4">Update your account password</p>
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Change Password
                </button>
              </div>

              {/* Update Company Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Update Company Details</h2>
                <p className="text-gray-600 mb-4">Modify your business information</p>
                <button
                  onClick={() => {
                    setCompanyFormData({
                      businessName: businessData?.businessName || businessData?.name || '',
                      ownerName: businessData?.ownerName || '',
                      phone: businessData?.phone || '',
                      address: businessData?.address || '',
                      city: businessData?.city || '',
                      state: businessData?.state || '',
                      zipCode: businessData?.zipCode || '',
                    });
                    setShowCompanyDetailsModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Update Details
                </button>
              </div>

              {/* Export Data */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Export All Data</h2>
                <p className="text-gray-600 mb-4">Download a complete copy of your business data</p>
                <button
                  onClick={handleExportAllData}
                  disabled={exportingData}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  {exportingData ? 'Exporting...' : 'Export Data (JSON)'}
                </button>
              </div>

              {/* Delete Account */}
              <div className="bg-white border-2 border-red-200 rounded-lg shadow-sm p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-red-900 mb-2">Delete Account</h2>
                    <p className="text-red-700 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Styles Tab */}
          {selectedTab === 'styles' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Brand Color Scheme</h2>
                <p className="text-gray-600 mb-6">Choose a color scheme that will be applied across your entire dashboard</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {colorSchemes.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => handleColorSchemeUpdate(scheme.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedColorScheme === scheme.id
                          ? 'border-gray-900 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div
                          className="w-12 h-12 rounded-lg"
                          style={{ backgroundColor: scheme.colors.primary }}
                        ></div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{scheme.name}</h3>
                          <p className="text-sm text-gray-500">{scheme.description}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <div
                          className="flex-1 h-8 rounded"
                          style={{ backgroundColor: scheme.colors.primary }}
                        ></div>
                        <div
                          className="flex-1 h-8 rounded"
                          style={{ backgroundColor: scheme.colors.secondary }}
                        ></div>
                        <div
                          className="flex-1 h-8 rounded"
                          style={{ backgroundColor: scheme.colors.accent }}
                        ></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Email Templates Tab */}
          {selectedTab === 'emails' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Template Settings</h2>
                <p className="text-gray-600 mb-6">Customize your email templates with your brand colors and logo</p>
                
                {/* Email Branding */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Logo</label>
                    <div className="flex items-center space-x-4">
                      {businessData?.emailSettings?.logo ? (
                        <img 
                          key={businessData.emailSettings.logo}
                          src={businessData.emailSettings.logo} 
                          alt="Email Logo" 
                          className="w-16 h-16 object-contain border border-gray-200 rounded-lg"
                          style={{ display: 'block' }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEmailLogoUpload}
                          className="hidden"
                          id="email-logo-upload"
                        />
                        <label
                          htmlFor="email-logo-upload"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                        >
                          {businessData?.emailSettings?.logo ? 'Change Logo' : 'Upload Logo'}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Recommended: 200x60px, PNG or JPG</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Signature</label>
                    <textarea
                      value={businessData?.emailSettings?.signature || ''}
                      onChange={(e) => setBusinessData({ 
                        ...businessData, 
                        emailSettings: { 
                          ...businessData?.emailSettings, 
                          signature: e.target.value 
                        } 
                      })}
                      onBlur={() => handleUpdate('emailSettings', businessData?.emailSettings || {})}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="Best regards,&#10;Your Business Name&#10;Phone: (555) 123-4567&#10;Email: info@yourbusiness.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">This will appear at the bottom of all emails</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Footer Text</label>
                    <textarea
                      value={businessData?.emailSettings?.footerText || ''}
                      onChange={(e) => setBusinessData({ 
                        ...businessData, 
                        emailSettings: { 
                          ...businessData?.emailSettings, 
                          footerText: e.target.value 
                        } 
                      })}
                      onBlur={() => handleUpdate('emailSettings', businessData?.emailSettings || {})}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="Thank you for choosing us!&#10;Visit our website: www.yourbusiness.com&#10;Follow us on social media"
                    />
                    <p className="text-xs text-gray-500 mt-1">Additional text that appears in email footers</p>
                  </div>
                </div>
              </div>

              {/* Email Template Preview */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Preview</h3>
                <p className="text-gray-600 mb-4">See how your emails will look with your branding</p>
                <div className="text-xs text-gray-500 mb-2">
                  Debug: Logo URL = {businessData?.emailSettings?.logo || 'Not set'}
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="ml-4 text-sm text-gray-600">Email Preview</span>
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <div className="max-w-2xl mx-auto">
                      {/* Email Header */}
                      <div 
                        className="text-center py-8 rounded-t-lg"
                        style={{ backgroundColor: colorScheme.colors.primary }}
                      >
                        {businessData?.emailSettings?.logo ? (
                          <div className="mb-4">
                            <img 
                              src={businessData.emailSettings.logo} 
                              alt="Business Logo" 
                              style={{ 
                                height: '64px',
                                width: 'auto',
                                maxWidth: '300px',
                                display: 'block',
                                margin: '0 auto',
                                objectFit: 'contain'
                              }}
                              onError={(e) => {
                                console.error('Image failed to load:', businessData.emailSettings.logo);
                              }}
                              onLoad={() => {}}
                            />
                          </div>
                        ) : (
                          <div className="text-white text-2xl font-bold mb-2">
                            {businessData?.businessName || 'Your Business'}
                          </div>
                        )}
                        <div className="text-white text-lg opacity-90">
                          Appointment Confirmation
                        </div>
                      </div>
                      
                      {/* Email Content */}
                      <div className="p-6 border-l border-r border-gray-200">
                        <p className="text-gray-700 mb-4">Hi <strong>John Doe</strong>,</p>
                        <p className="text-gray-700 mb-4">
                          Your appointment has been confirmed for <strong>Monday, October 20th at 2:00 PM</strong>.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Appointment Details</h4>
                          <p className="text-sm text-gray-600">Service: Luxury Pedicure</p>
                          <p className="text-sm text-gray-600">Staff: Sarah Johnson</p>
                          <p className="text-sm text-gray-600">Location: Main Street Location</p>
                        </div>
                      </div>
                      
                      {/* Email Footer */}
                      <div 
                        className="p-6 rounded-b-lg text-white"
                        style={{ backgroundColor: colorScheme.colors.secondary }}
                      >
                        <div className="text-sm">
                          {businessData?.emailSettings?.signature ? (
                            <div className="whitespace-pre-line">{businessData.emailSettings.signature}</div>
                          ) : (
                            <div>
                              <p>Best regards,</p>
                              <p><strong>{businessData?.businessName || 'Your Business'}</strong></p>
                            </div>
                          )}
                        </div>
                        {businessData?.emailSettings?.footerText && (
                          <div className="mt-4 pt-4 border-t border-white border-opacity-20 text-xs opacity-90">
                            <div className="whitespace-pre-line">{businessData.emailSettings.footerText}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ToastContainer />

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Name</label>
                <input
                  type="text"
                  value={locationFormData.name}
                  onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Main Office, Downtown Branch, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={locationFormData.address}
                  onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Street, City, Postcode"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={locationFormData.phone}
                  onChange={(e) => setLocationFormData({ ...locationFormData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Operating Hours</label>
                {daysOfWeek.map(day => {
                  const dayKey = day as keyof typeof locationFormData.hours;
                  return (
                    <div key={day} className="flex items-center space-x-4 mb-3">
                      <div className="w-32">
                        <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={!locationFormData.hours[dayKey].closed}
                          onChange={(e) => setLocationFormData({
                            ...locationFormData,
                            hours: {
                              ...locationFormData.hours,
                              [day]: { ...locationFormData.hours[dayKey], closed: !e.target.checked }
                            }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">Open</span>
                      </label>
                      {!locationFormData.hours[dayKey].closed && (
                        <>
                          <input
                            type="time"
                            value={locationFormData.hours[dayKey].open}
                            onChange={(e) => setLocationFormData({
                              ...locationFormData,
                              hours: {
                                ...locationFormData.hours,
                                [day]: { ...locationFormData.hours[dayKey], open: e.target.value }
                              }
                            })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={locationFormData.hours[dayKey].close}
                            onChange={(e) => setLocationFormData({
                              ...locationFormData,
                              hours: {
                                ...locationFormData.hours,
                                [day]: { ...locationFormData.hours[dayKey], close: e.target.value }
                              }
                            })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocation}
                disabled={saving}
                className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: colorScheme.colors.primary }}
              >
                {saving ? 'Saving...' : (editingLocation ? 'Update Location' : 'Add Location')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Limit Modal */}
      {showLocationLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Location Limit Reached</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  {trialStatus?.active ? (
                    <>
                      You've reached the location limit for your trial plan. You can add up to <strong>1 location</strong> during your trial.
                      <br /><br />
                      Your trial ends in <strong>{trialStatus.daysRemaining} days</strong>. Subscribe to a plan to add more locations.
                    </>
                  ) : (
                    <>
                      You've reached the location limit for your current plan. You can add up to <strong>{limits?.locations === -1 ? 'unlimited' : limits?.locations} location{limits?.locations !== 1 ? 's' : ''}</strong>.
                    </>
                  )}
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Upgrade to add more locations:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Professional Plan:</strong> 1 location</li>
                    <li>• <strong>Business Plan:</strong> Up to 3 locations</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLocationLimitModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLocationLimitModal(false);
                    router.push('/dashboard/subscription');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  {trialStatus?.active ? 'Subscribe Now' : 'Upgrade Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Account</h2>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  This will permanently delete your account and all associated data including:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                  <li>All appointments and bookings</li>
                  <li>Client information</li>
                  <li>Staff members</li>
                  <li>Services and pricing</li>
                  <li>Payment records</li>
                  <li>All other business data</li>
                </ul>
                <p className="text-red-600 font-semibold mb-4">This action cannot be undone!</p>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-bold">CONFIRM</span> to proceed:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="CONFIRM"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirmText === 'CONFIRM') {
                      setShowPasswordModal(true);
                    }
                  }}
                  disabled={deleteConfirmText !== 'CONFIRM'}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Your Password</h2>
              <p className="text-gray-600 mb-4">Please enter your password to confirm account deletion:</p>
              
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none mb-6"
                placeholder="Enter your password"
              />

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteWithPassword}
                  disabled={!password || deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Change Password</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordFormData.currentPassword}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordFormData.newPassword}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                    minLength={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    At least 8 characters. Use a mix of letters, numbers, and symbols for a strong password.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordFormData.confirmPassword}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })}
                    minLength={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                >
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Company Details Modal */}
      {showCompanyDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Update Company Details</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    value={companyFormData.businessName}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, businessName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
                  <input
                    type="text"
                    value={companyFormData.ownerName}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, ownerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={companyFormData.phone}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={companyFormData.address}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={companyFormData.city}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={companyFormData.state}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                    <input
                      type="text"
                      value={companyFormData.zipCode}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, zipCode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCompanyDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCompanyDetails}
                  disabled={saving}
                  className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                >
                  {saving ? 'Updating...' : 'Update Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

