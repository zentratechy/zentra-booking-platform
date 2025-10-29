'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { formatPrice, getCurrencySymbol } from '@/lib/currency';
import { getColorScheme, defaultColorScheme, type ColorScheme } from '@/lib/colorSchemes';
import { awardLoyaltyPoints } from '@/lib/loyalty';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ amount, onSuccess, isDeposit, appointmentData, colorScheme, businessWebsite }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-confirmed?website=${encodeURIComponent(businessWebsite || '')}`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setLoading(false);
      } else {
        // Payment successful - pass payment method ID to onSuccess
        const paymentMethodId = paymentIntent?.payment_method;
        await onSuccess(paymentMethodId);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
                disabled={!stripe || loading}
                className="w-full text-white py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colorScheme.colors.primary }}
                onMouseEnter={(e) => !loading && !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = colorScheme.colors.primaryDark)}
                onMouseLeave={(e) => !loading && !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = colorScheme.colors.primary)}
              >
                {loading ? 'Processing...' : `Pay ${isDeposit ? 'Deposit' : 'Full Amount'}`}
      </button>
    </form>
  );
}

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const businessId = params.businessId as string;
  const { showToast, ToastContainer } = useToast();
  
  // Get referral ID from URL parameter (if someone clicked a referral link)
  const referralClientId = searchParams?.get('ref') || null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const currency = business?.currency || 'usd';
  const currencySymbol = getCurrencySymbol(currency);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]); // Cart of selected services
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableStaffForTime, setAvailableStaffForTime] = useState<any[]>([]); // Staff available for selected time

  // Reset time and staff when date changes
  useEffect(() => {
    setSelectedTime(null);
    setSelectedStaff(null);
    setAvailableStaffForTime([]);
  }, [selectedDate]);
  const [filteredStaff, setFilteredStaff] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full');
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherVerified, setVoucherVerified] = useState<any>(null);
  const [verifyingVoucher, setVerifyingVoucher] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(defaultColorScheme);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPayInStoreModal, setShowPayInStoreModal] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [availableRewards, setAvailableRewards] = useState<any[]>([]);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  
  // Customer authentication
  const { customer, loading: authLoading, login: customerLogin, logout: customerLogout } = useCustomerAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', phone: '' });

  // Pre-fill client info when customer is logged in
  useEffect(() => {
    if (customer) {
      // Handle both new firstName/lastName format and legacy name format
      let fullName = '';
      if (customer.firstName && customer.lastName) {
        fullName = `${customer.firstName} ${customer.lastName}`;
      } else if (customer.name) {
        fullName = customer.name;
      }
      
      setClientInfo({
        name: fullName,
        email: customer.email || '',
        phone: customer.phone || '',
        notes: ''
      });
      
      // Load loyalty points if available
      if (customer.loyaltyPoints) {
        setLoyaltyPoints(customer.loyaltyPoints);
      }
      
      // Also fetch latest loyalty points from database for logged-in customers
      if (customer.email && business?.loyaltyProgram?.active) {
        fetchLatestLoyaltyPoints(customer.email);
      }
    }
  }, [customer, business]);

  // Restore booking state after authentication
  useEffect(() => {
    const savedBookingState = sessionStorage.getItem('bookingState');
    if (savedBookingState && customer) {
      try {
        const bookingState = JSON.parse(savedBookingState);
        
        // Restore all the booking selections
        if (bookingState.selectedLocation) setSelectedLocation(bookingState.selectedLocation);
        if (bookingState.selectedServices) setSelectedServices(bookingState.selectedServices);
        if (bookingState.selectedDate) setSelectedDate(bookingState.selectedDate);
        if (bookingState.selectedTime) setSelectedTime(bookingState.selectedTime);
        if (bookingState.selectedStaff) setSelectedStaff(bookingState.selectedStaff);
        if (bookingState.step) setStep(bookingState.step);
        
        // Clear the saved state
        sessionStorage.removeItem('bookingState');
        
        setToast({ message: 'Welcome back! Your booking selections have been restored.', type: 'success' });
      } catch (error) {
        console.error('Error restoring booking state:', error);
      }
    }
  }, [customer]);

  // Fetch business, services, and staff
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch business
        const businessDoc = await getDoc(doc(db, 'businesses', businessId));
        if (!businessDoc.exists()) {
          showToast('Business not found', 'error');
          return;
        }
        const businessData = { id: businessDoc.id, ...businessDoc.data() } as any;
        setBusiness(businessData);
        
        // Set color scheme
        const scheme = getColorScheme(businessData.colorScheme || 'classic');
        setColorScheme(scheme);

        // Fetch services
        const servicesQuery = query(
          collection(db, 'services'),
          where('businessId', '==', businessId),
          where('active', '==', true)
        );
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setServices(servicesData);

        // Fetch locations
        const locationsQuery = query(
          collection(db, 'locations'),
          where('businessId', '==', businessId)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLocations(locationsData);

        // Set default location if only one exists
        if (locationsData.length === 1) {
          setSelectedLocation(locationsData[0]);
        }

        // Fetch staff (exclude back-of-house staff)
        const staffQuery = query(
          collection(db, 'staff'),
          where('businessId', '==', businessId)
        );
        const staffSnapshot = await getDocs(staffQuery);
        const staffData = staffSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((member: any) => 
            !member.isBackOfHouse && // Exclude back-of-house staff
            (member.status === 'active' || !member.status) // Include active or staff without status field
          );
        
        setStaff(staffData);

        // Fetch blocked times
        const blockedTimesQuery = query(
          collection(db, 'blockedTimes'),
          where('businessId', '==', businessId)
        );
        const blockedTimesSnapshot = await getDocs(blockedTimesQuery);
        const blockedTimesData = blockedTimesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBlockedTimes(blockedTimesData);

        // Fetch appointments to check for booked times
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('businessId', '==', businessId)
        );
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsData = appointmentsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((apt: any) => apt.status === 'confirmed' || apt.status === 'pending'); // Filter in memory instead
        
        setAppointments(appointmentsData);

        // Fetch available rewards
        const rewardsQuery = query(
          collection(db, 'rewards'),
          where('businessId', '==', businessId),
          where('active', '==', true)
        );
        const rewardsSnapshot = await getDocs(rewardsQuery);
        const rewardsData = rewardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAvailableRewards(rewardsData);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Failed to load business information', 'error');
        setLoading(false);
      }
    };

    if (businessId) {
      fetchData();
    }
  }, [businessId]);

  // Filter staff by selected location
  useEffect(() => {
    if (selectedLocation) {
      const filtered = staff.filter((member: any) => {
        // Include staff if they belong to this location or have no specific location (can work anywhere)
        return member.locationId === selectedLocation.id || !member.locationId;
      });
      setFilteredStaff(filtered);
      
      // Set default staff if only one available for this location
      if (filtered.length === 1) {
        setSelectedStaff(filtered[0]);
      } else {
        setSelectedStaff(null);
      }
    } else {
      // If no location selected, show all staff
      setFilteredStaff(staff);
      setSelectedStaff(null);
    }
  }, [selectedLocation, staff]);

  // Filter services by selected staff capabilities
  useEffect(() => {
    if (selectedStaff && selectedStaff.services) {
      const filtered = services.filter((service: any) => 
        selectedStaff.services.includes(service.id)
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services);
    }
  }, [selectedStaff, services]);

  // Filter staff by selected services capabilities
  useEffect(() => {
    if (selectedServices.length > 0) {
      const requiredServiceIds = selectedServices.map(s => s.id);
      const filtered = staff.filter((member: any) => {
        // First check if staff belongs to selected location
        if (selectedLocation && member.locationId && member.locationId !== selectedLocation.id) {
          return false;
        }
        
        // Then check if staff can perform the services
        if (!member.services || member.services.length === 0) {
          return false;
        }
        
        // Check if staff has 'all' services OR can perform ALL selected services
        if (member.services.includes('all')) {
          return true;
        }
        
        const canPerform = requiredServiceIds.every(serviceId => member.services.includes(serviceId));
        return canPerform;
      });
      setFilteredStaff(filtered);
    } else {
      // If no services selected, show all staff for the location
      if (selectedLocation) {
        const filtered = staff.filter((member: any) => 
          member.locationId === selectedLocation.id || !member.locationId
        );
        setFilteredStaff(filtered);
      } else {
        setFilteredStaff(staff);
      }
    }
  }, [selectedServices, staff, selectedLocation]);

  // Reset selections when location changes
  const handleLocationChange = (location: any) => {
    setSelectedLocation(location);
    setSelectedStaff(null);
    setSelectedServices([]);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  // Reset service selection when staff changes
  const handleStaffChange = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setSelectedServices([]);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  // Add service to cart
  const addServiceToCart = (service: any) => {
    setSelectedServices(prev => {
      // Check if service already exists in cart
      if (prev.some(s => s.id === service.id)) {
        return prev; // Don't add duplicates
      }
      return [...prev, service];
    });
  };

  // Remove service from cart
  const removeServiceFromCart = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  // Calculate total duration of all selected services
  const getTotalDuration = () => {
    return selectedServices.reduce((total, service) => total + (service.duration || 60), 0);
  };

  // Calculate total price of all selected services
  const getTotalPrice = (): number => {
    const basePrice = selectedServices.reduce((total, service) => total + (service.price || 0), 0);
    const discount: number = selectedReward ? calculateRewardDiscount(selectedReward) : pointsDiscount;
    return Math.max(0, basePrice - discount); // Apply reward or points discount
  };

  // Authentication functions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await customerLogin(loginForm.email, loginForm.phone);
      if (success) {
        setShowLoginModal(false);
        setToast({ message: 'Verification code sent to your phone!', type: 'success' });
        
        // Store current booking state before redirecting
        const bookingState = {
          selectedLocation,
          selectedServices,
          selectedDate,
          selectedTime,
          selectedStaff,
          step,
          clientInfo
        };
        sessionStorage.setItem('bookingState', JSON.stringify(bookingState));
        
        // Redirect to verification page with businessId
        window.location.href = `/customer-login?email=${encodeURIComponent(loginForm.email)}&phone=${encodeURIComponent(loginForm.phone)}&businessId=${businessId}`;
      } else {
        setToast({ message: 'Failed to send verification code', type: 'error' });
      }
    } catch (error: any) {
      setToast({ message: error.message || 'Login failed', type: 'error' });
    }
  };


  const handleLogout = async () => {
    try {
      customerLogout();
      setClientInfo({ name: '', email: '', phone: '', notes: '' });
      setLoyaltyPoints(0);
      setPointsToUse(0);
      setPointsDiscount(0);
      setToast({ message: 'Logged out successfully', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Logout failed', type: 'error' });
    }
  };

  // Helper function to check if a date is within booking limits
  const isDateWithinBookingLimits = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Get booking limits from business settings (check both old and new field names)
    const minNoticeHours = business?.bookingPolicy?.minNoticeHours || business?.minBookingNoticeHours || 24; // Default 24 hours
    const maxAdvanceDays = business?.bookingPolicy?.maxAdvanceMonths ? business.bookingPolicy.maxAdvanceMonths * 30 : business?.maxAdvanceBookingDays || 90; // Convert months to days
    
    
    // Check minimum notice (can't book too close to current time)
    const minBookingTime = new Date(today);
    minBookingTime.setHours(minBookingTime.getHours() + minNoticeHours);
    
    // Check maximum advance (can't book too far in advance)
    const maxBookingTime = new Date(today);
    maxBookingTime.setDate(maxBookingTime.getDate() + maxAdvanceDays);
    
    
    // Check if date is within booking limits
    if (selectedDateOnly < minBookingTime) {
      return false;
    }
    
    if (selectedDateOnly > maxBookingTime) {
      return false;
    }
    
    // Check if date is a holiday or closure day
    if (business?.holidays && business.holidays.length > 0) {
      const dateStr = selectedDateOnly.toISOString().split('T')[0];
      const isHoliday = business.holidays.some((holiday: any) => {
        const holidayDate = holiday.date?.toDate ? holiday.date.toDate() : new Date(holiday.date);
        const holidayDateStr = holidayDate.toISOString().split('T')[0];
        return holidayDateStr === dateStr;
      });
      
      if (isHoliday) {
        return false;
      }
    }
    
    return true;
  };

  // Helper function to check if a time slot with buffer time is valid
  const isTimeSlotValid = (timeStr: string, staff: any, date: Date, services: any[]) => {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const slotStart = timeToMinutes(timeStr);
    const totalServiceDuration = services.reduce((total, service) => total + (service.duration || 60), 0);
    const maxBufferTime = services.reduce((max, service) => Math.max(max, service.bufferTime || 0), 0);
    const slotEnd = slotStart + totalServiceDuration + maxBufferTime;
    
    
    // Check if staff is working this day
    const staffHours = staff.workingHours?.[dayOfWeek];
    if (!staffHours || staffHours.closed) {
      return false;
    }
    
    const staffStart = timeToMinutes(staffHours.open);
    const staffEnd = timeToMinutes(staffHours.close);
    
    // Check if appointment (including buffer) fits within working hours
    if (slotStart < staffStart || slotEnd > staffEnd) {
      return false;
    }
    
    // Check if appointment (including buffer) conflicts with breaks
    if (staff.breaks && staff.breaks.length > 0) {
      
      const hasBreakConflict = staff.breaks.some((breakTime: any) => {
        if (breakTime.day !== dayOfWeek) return false;
        
        const breakStart = timeToMinutes(breakTime.start);
        const breakEnd = timeToMinutes(breakTime.end);
        
        // Check if appointment overlaps with break (including buffer time)
        const overlaps = (slotStart < breakEnd && slotEnd > breakStart);
        
        if (overlaps) {
        }
        
        return overlaps;
      });
      
      if (hasBreakConflict) {
        return false;
      }
    } else {
    }
    
    // Check for existing appointments
    const hasExistingAppointment = appointments.some((apt: any) => {
      if (apt.staffId !== staff.id) return false;
      const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
      if (aptDate.toDateString() !== date.toDateString()) return false;
      
      const aptStart = timeToMinutes(apt.time);
      const aptEnd = aptStart + (apt.duration || 60) + (business?.bufferTime || 0);
      const overlaps = (slotStart < aptEnd && slotEnd > aptStart);
      
      if (overlaps) {
      }
      
      return overlaps;
    });
    
    if (hasExistingAppointment) {
      return false;
    }
    
    // Check blocked times
    if (blockedTimes && blockedTimes.length > 0) {
      
      const hasBlockedTime = blockedTimes.some((bt: any) => {
        // Check if this block applies to the staff or all staff
        if (bt.staffId !== staff.id && bt.staffId !== 'all') return false;
        
        // Check if the selected date is within the blocked date range
        const btStart = bt.startDate?.toDate ? bt.startDate.toDate() : new Date(bt.startDate);
        const btEnd = bt.endDate?.toDate ? bt.endDate.toDate() : new Date(bt.endDate);
        const dateStr = date.toDateString();
        const btStartStr = btStart.toDateString();
        const btEndStr = btEnd.toDateString();
        
        if (dateStr < btStartStr || dateStr > btEndStr) return false;
        
        // Check if the time slot falls within the blocked time range
        const slotTime = slotStart; // slotStart is already in minutes
        const overlaps = (slotTime >= bt.startTime && slotTime < bt.endTime);
        
        if (overlaps) {
        }
        
        return overlaps;
      });
      
      if (hasBlockedTime) {
        return false;
      }
    } else {
    }
    
    return true;
  };

  // Fetch latest loyalty points for logged-in customers
  const fetchLatestLoyaltyPoints = async (email: string) => {
    if (!email || !business?.loyaltyProgram?.active) return;
    
    try {
      const clientsQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', businessId),
        where('email', '==', email.toLowerCase())
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      
      if (!clientsSnapshot.empty) {
        const clientData = clientsSnapshot.docs[0].data();
        const latestPoints = clientData.loyaltyPoints || 0;
        setLoyaltyPoints(latestPoints);
      }
    } catch (error) {
      console.error('Error fetching latest loyalty points:', error);
    }
  };

  // Check loyalty points when email is entered
  const checkLoyaltyPoints = async (email: string) => {
    if (!email || !business?.loyaltyProgram?.active) return;
    
    // Don't override loyalty points if customer is already logged in
    if (customer && customer.email === email.toLowerCase()) {
      return;
    }
    
    try {
      const clientsQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', businessId),
        where('email', '==', email.toLowerCase())
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      
      if (!clientsSnapshot.empty) {
        const clientData = clientsSnapshot.docs[0].data();
        setLoyaltyPoints(clientData.loyaltyPoints || 0);
      } else {
        setLoyaltyPoints(0);
      }
    } catch (error) {
      console.error('Error checking loyalty points:', error);
    }
  };

  // Calculate points discount
  const calculatePointsDiscount = (points: number) => {
    if (!business?.loyaltyProgram?.settings?.pointsPerDollar) return 0;
    const pointsPerDollar = business.loyaltyProgram.settings.pointsPerDollar;
    return Math.floor(points / pointsPerDollar);
  };

  // Calculate reward discount based on reward type
  const calculateRewardDiscount = (reward: any): number => {
    if (!reward) return 0;
    
    const basePrice = selectedServices.reduce((total, service) => total + (service.price || 0), 0);
    
    // For percentage-based rewards (e.g., "10% Off Treatment")
    if (reward.name.toLowerCase().includes('%')) {
      const percentage = parseFloat(reward.name.match(/(\d+)%/)?.[1] || '0');
      return (basePrice * percentage) / 100;
    }
    
    // For fixed amount rewards (e.g., "$10 Off Treatment")
    if (reward.name.toLowerCase().includes('$') || reward.name.toLowerCase().includes('off')) {
      const amount = parseFloat(reward.name.match(/\$?(\d+)/)?.[1] || '0');
      return Math.min(amount, basePrice); // Don't exceed total price
    }
    
    // Default: 1 point = 1 currency unit discount
    return Math.min(reward.points, basePrice);
  };

  // Handle points usage change
  const handlePointsChange = (points: number) => {
    setPointsToUse(points);
    const discount = calculatePointsDiscount(points);
    setPointsDiscount(discount);
  };

  const groupedServices = filteredServices.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, any[]>);

  const handleVerifyVoucher = async () => {
    if (!voucherCode) return;

    setVerifyingVoucher(true);
    try {
      const vouchersQuery = query(
        collection(db, 'vouchers'),
        where('businessId', '==', businessId),
        where('code', '==', voucherCode.toUpperCase()),
        where('status', '==', 'active')
      );
      const vouchersSnapshot = await getDocs(vouchersQuery);

      if (vouchersSnapshot.empty) {
        setToast({ message: 'Invalid voucher code or voucher has expired', type: 'error' });
        setVerifyingVoucher(false);
        return;
      }

      const voucherDoc = vouchersSnapshot.docs[0];
      const voucher = { id: voucherDoc.id, ...voucherDoc.data() } as any;

      // Check if voucher is expired
      if (voucher.expiryDate) {
        const expiryDate = voucher.expiryDate?.toDate ? voucher.expiryDate.toDate() : new Date(voucher.expiryDate);
        if (expiryDate < new Date()) {
          setToast({ message: 'This voucher has expired', type: 'error' });
          setVerifyingVoucher(false);
          return;
        }
      }

      // Check voucher balance
      if (voucher.balance <= 0) {
        setToast({ message: 'This voucher has already been fully redeemed', type: 'error' });
        setVerifyingVoucher(false);
        return;
      }

      setVoucherVerified(voucher);
      setToast({ message: '✅ Voucher applied successfully!', type: 'success' });
      setVerifyingVoucher(false);
    } catch (error: any) {
      console.error('Error verifying voucher:', error);
      showToast('Failed to verify voucher: ' + error.message, 'error');
      setVerifyingVoucher(false);
    }
  };

  const handlePaymentTypeSelection = async (type: 'full' | 'deposit') => {
    setPaymentType(type);
    
    // Check which payment provider is connected (check both old and new field names)
    const paymentProvider = business?.paymentProvider || business?.paymentConfig?.provider;
    const stripeConnected = paymentProvider === 'stripe' && (business?.paymentConfig?.stripe?.connected || business?.paymentConfig?.stripe?.accountId);
    const squareConnected = paymentProvider === 'square' && business?.paymentConfig?.square?.connected;
    
    if (!stripeConnected && !squareConnected) {
      // No payment provider - show custom modal instead of ugly alert
      setShowPayInStoreModal(true);
      return;
    }
    
    // Calculate amount
    const totalPrice = getTotalPrice();
    const amount = type === 'deposit' 
      ? totalPrice * ((selectedServices[0]?.depositPercentage || 30) / 100)
      : totalPrice;

    // Handle Stripe payment
    if (stripeConnected) {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            serviceId: selectedServices.length === 1 ? selectedServices[0].id : null,
            services: selectedServices.map(s => ({ id: s.id, name: s.name, price: s.price })),
            amount,
            isDeposit: type === 'deposit',
            customerEmail: clientInfo.email,
            customerName: clientInfo.name,
            metadata: {
              clientName: clientInfo.name,
              clientEmail: clientInfo.email,
              serviceName: selectedServices.length === 1 ? selectedServices[0].name : `${selectedServices.length} Services`,
              date: selectedDate?.toISOString(),
              time: selectedTime,
            },
          }),
        });

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        // Store customer ID for future charges
        if (data.customerId) {
          sessionStorage.setItem('stripeCustomerId', data.customerId);
        }
        setStep(5); // Move to Stripe payment step
      } catch (error: any) {
        showToast('Failed to initialize payment: ' + error.message, 'error');
      }
    } 
    // Handle Square payment
    else if (squareConnected) {
      // For Square, we'll collect payment details and process directly
      // Square uses a different flow - we'll create the payment when booking completes
      setStep(5); // Move to Square payment step (we'll create a different UI)
    }
  };

  const handleBookingComplete = async (paymentMethodId?: string) => {
    setSavingBooking(true);
    
    try {
      // Auto-assign staff if "No Preference" was selected
      let assignedStaff = selectedStaff;
      
      if (!selectedStaff?.id && selectedDate && selectedTime) {
        // Find available staff for this time slot
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const slotStart = timeToMinutes(selectedTime);
        const maxBufferTime = selectedServices.reduce((max, service) => Math.max(max, service.bufferTime || 0), 0);
        const slotEnd = slotStart + getTotalDuration() + maxBufferTime;
        
        const availableStaff = filteredStaff.filter((member: any) => {
          // Check if staff is working this day
          const staffHours = member.workingHours?.[dayOfWeek];
          if (!staffHours || staffHours.closed) return false;
          
          const staffStart = timeToMinutes(staffHours.open);
          const staffEnd = timeToMinutes(staffHours.close);
          
          // Check if appointment fits within staff hours
          if (slotStart < staffStart || slotEnd > staffEnd) return false;
          
          // Check if staff has a break at this time
          const hasBreak = member.breaks?.some((breakTime: any) => {
            if (breakTime.day !== dayOfWeek) return false;
            const breakStart = timeToMinutes(breakTime.start);
            const breakEnd = timeToMinutes(breakTime.end);
            return slotStart < breakEnd && slotEnd > breakStart;
          });
          
          if (hasBreak) return false;
          
          // Check if staff has an appointment at this time
          const hasAppointment = appointments.some((apt: any) => {
            if (apt.staffId !== member.id) return false;
            const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
            if (aptDate.toDateString() !== selectedDate.toDateString()) return false;
            
            const aptStart = timeToMinutes(apt.time);
            const aptEnd = aptStart + (apt.duration || 60) + (business?.bufferTime || 0);
            return slotStart < aptEnd && slotEnd > aptStart;
          });
          
          return !hasAppointment;
        });
        
        if (availableStaff.length > 0) {
          // Assign to first available staff (could implement round-robin here)
          assignedStaff = availableStaff[0];
        } else {
          // If no staff available, keep as "No Preference" - business will assign manually
        }
      }
      
      // Check if client already exists (by email)
      let clientId = null;
      const clientsQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', businessId),
        where('email', '==', clientInfo.email.toLowerCase())
      );
      
      const existingClients = await getDocs(clientsQuery);
      
      if (!existingClients.empty) {
        // Client exists, update their info and use their ID
        const existingClient = existingClients.docs[0];
        clientId = existingClient.id;
        
        // Parse name into firstName and lastName if possible
        const nameParts = clientInfo.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        await updateDoc(doc(db, 'clients', clientId), {
          name: clientInfo.name,
          firstName: firstName,
          lastName: lastName,
          phone: clientInfo.phone,
          lastVisit: serverTimestamp(),
        });
      } else {
        // Create new client
        const nameParts = clientInfo.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const newClientData: any = {
          businessId,
          name: clientInfo.name,
          firstName: firstName,
          lastName: lastName,
          email: clientInfo.email.toLowerCase(),
          phone: clientInfo.phone,
          loyaltyPoints: 0,
          totalVisits: 0,
          totalSpent: 0,
          createdAt: serverTimestamp(),
          lastVisit: serverTimestamp(),
          source: 'online_booking',
        };
        
        // If this is a referral (first-time customer via referral link), store the referral
        if (referralClientId) {
          // Verify the referrer exists and belongs to this business
          try {
            const referrerDoc = await getDoc(doc(db, 'clients', referralClientId));
            if (referrerDoc.exists()) {
              const referrerData = referrerDoc.data();
              if (referrerData.businessId === businessId) {
                newClientData.referredBy = referralClientId;
                newClientData.referredAt = serverTimestamp();
              }
            }
          } catch (error) {
            console.error('Error validating referrer:', error);
            // Continue without referral if validation fails
          }
        }
        
        const clientDocRef = await addDoc(collection(db, 'clients'), newClientData);
        clientId = clientDocRef.id;
      }

      // Handle voucher redemption if voucher was applied
      let voucherDeduction = 0;
      let voucherUsed = null;
      
      if (voucherVerified) {
        const totalPrice = getTotalPrice();
        voucherDeduction = Math.min(voucherVerified.balance, totalPrice);
        
        // Update voucher balance
        const newBalance = voucherVerified.balance - voucherDeduction;
        const newRedeemedAmount = (voucherVerified.redeemedAmount || 0) + voucherDeduction;
        
        await updateDoc(doc(db, 'vouchers', voucherVerified.id), {
          balance: newBalance,
          redeemedAmount: newRedeemedAmount,
          status: newBalance === 0 ? 'redeemed' : 'active',
          updatedAt: serverTimestamp(),
        });
        
        voucherUsed = {
          code: voucherVerified.code,
          amount: voucherDeduction,
          voucherId: voucherVerified.id,
        };
      }

      // Determine payment status based on whether Stripe is connected and voucher usage
      const stripeConnected = business?.paymentConfig?.stripe?.connected || 
                             business?.stripeConnected || 
                             (business?.paymentConfig?.stripe && Object.keys(business.paymentConfig.stripe).length > 0);
      const totalPrice = getTotalPrice();
      const amountAfterVoucher = totalPrice - voucherDeduction;
      
      
      // Create appointment in Firestore with client ID
      const appointmentData: any = {
        businessId,
        clientId, // Link to client record
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        clientPhone: clientInfo.phone,
        // For single service, keep backward compatibility
        serviceId: selectedServices.length === 1 ? selectedServices[0].id : null,
        serviceName: selectedServices.length === 1 ? selectedServices[0].name : `${selectedServices.length} Services`,
        // For multiple services, store array
        services: selectedServices.map(s => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          price: s.price,
          category: s.category
        })),
        staffId: assignedStaff?.id || null,
        staffName: assignedStaff?.name || 'Any Staff',
        locationId: selectedLocation?.id || null,
        locationName: selectedLocation?.name || 'Main Location',
        date: Timestamp.fromDate(selectedDate!),
        time: selectedTime,
        duration: getTotalDuration(),
        bufferTime: selectedServices.reduce((max, service) => Math.max(max, service.bufferTime || 0), 0),
        price: totalPrice,
        autoAssigned: !selectedStaff?.id && assignedStaff?.id ? true : false, // Track if auto-assigned
        requestedStaff: selectedStaff?.id ? 'specific' : 'no_preference', // Track customer preference
        status: 'confirmed',
        payment: voucherVerified && amountAfterVoucher === 0 ? {
          // Fully paid by voucher
          status: 'paid',
          method: 'voucher',
          amount: totalPrice,
          totalAmount: totalPrice,
          remainingBalance: 0,
          voucherUsed: voucherUsed,
        } : stripeConnected ? {
          status: paymentType === 'deposit' ? 'partial' : 'paid',
          method: 'card',
          amount: paymentType === 'deposit' ? 
            Math.round((amountAfterVoucher * (selectedServices[0]?.depositPercentage || 30) / 100) * 100) / 100 : 
            amountAfterVoucher,
          depositPaid: paymentType === 'deposit',
          depositPercentage: selectedServices[0]?.depositPercentage || 30,
          totalAmount: totalPrice,
          remainingBalance: paymentType === 'deposit' ? 
            Math.round((amountAfterVoucher - (amountAfterVoucher * (selectedServices[0]?.depositPercentage || 30) / 100)) * 100) / 100 : 
            0,
          stripePaymentIntentId: paymentIntentId || null,
          stripePaymentMethodId: paymentMethodId || null,
          stripeCustomerId: sessionStorage.getItem('stripeCustomerId') || null,
          voucherUsed: voucherUsed,
        } : {
          status: 'pending',
          method: 'cash',
          amount: voucherDeduction,
          totalAmount: totalPrice,
          remainingBalance: amountAfterVoucher,
          voucherUsed: voucherUsed,
        },
        // Track loyalty points usage
        loyaltyPointsUsed: pointsToUse || 0,
        selectedRewardId: selectedReward?.id || null,
        selectedRewardName: selectedReward?.name || null,
        selectedRewardPoints: selectedReward?.points || 0,
        pointsDiscount: pointsDiscount,
        notes: clientInfo.notes,
        createdAt: serverTimestamp(),
        source: 'online_booking',
        // Store referral info if this booking came from a referral link
        ...(referralClientId && clientId ? { referredBy: referralClientId } : {}),
      };


      const appointmentRef = await addDoc(collection(db, 'appointments'), appointmentData);
      const appointmentId = appointmentRef.id;

      // Handle loyalty points (deduct used points and award new points)
      try {
        // Check if customer is using points or rewards
        const isUsingPoints = pointsToUse > 0 || selectedReward;
        const pointsToDeduct = selectedReward ? selectedReward.points : pointsToUse;
        
        // Deduct used points or reward points first (regardless of payment status)
        if (pointsToDeduct > 0) {
          await updateDoc(doc(db, 'clients', clientId), {
            loyaltyPoints: (loyaltyPoints || 0) - pointsToDeduct,
            pointsUsed: pointsToDeduct,
            lastVisit: serverTimestamp(),
          });
        }
        
        // Update reward claimed count if a reward was used
        if (selectedReward) {
          await updateDoc(doc(db, 'rewards', selectedReward.id), {
            claimed: (selectedReward.claimed || 0) + 1,
          });
        }
        
        // Only award new points if customer is NOT using points/rewards AND payment is successful
        if (!isUsingPoints && (appointmentData.payment?.status === 'paid' || appointmentData.payment?.status === 'partial')) {
          await awardLoyaltyPoints(
            businessId,
            clientId,
            clientInfo.email,
            totalPrice
          );
        }
      } catch (loyaltyError) {
        console.error('❌ Failed to handle loyalty points:', loyaltyError);
        // Don't fail the booking if loyalty points fail
      }

      // Send confirmation email
      try {
        const appointmentDate = selectedDate!.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        const depositAmount = paymentType === 'deposit' ? 
          Math.round((totalPrice * (selectedServices[0]?.depositPercentage || 30) / 100) * 100) / 100 : 
          undefined;
        
        const remainingBalance = paymentType === 'deposit' ? 
          Math.round((totalPrice - (totalPrice * (selectedServices[0]?.depositPercentage || 30) / 100)) * 100) / 100 : 
          undefined;

        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: clientInfo.email,
            subject: `Booking Confirmation - ${selectedServices.length === 1 ? selectedServices[0].name : `${selectedServices.length} Services`}`,
            type: 'booking_confirmation',
            businessId: businessId,
            appointmentData: {
              customerName: clientInfo.name,
              clientId: clientId, // Include clientId for referral link generation
              clientEmail: clientInfo.email,
              businessId: businessId,
              businessName: business?.businessName || '',
              serviceName: selectedServices.length === 1 ? selectedServices[0].name : `${selectedServices.length} Services`,
              services: selectedServices.map(s => ({
                name: s.name,
                duration: s.duration,
                price: s.price
              })),
              staffName: assignedStaff?.name || 'Any Available Staff',
              locationName: selectedLocation?.name || 'Main Location',
              locationAddress: selectedLocation?.address || business?.address || '',
              appointmentDate: appointmentDate,
              appointmentTime: selectedTime,
              duration: getTotalDuration(),
              bufferTime: selectedServices.reduce((max, service) => Math.max(max, service.bufferTime || 0), 0),
              totalPrice: totalPrice,
              currency: business?.currency || 'usd',
              depositPaid: paymentType === 'deposit',
              depositAmount,
              remainingBalance,
              businessAddress: business?.address || '',
              businessPhone: business?.phone || '',
              businessEmail: business?.email || '',
              notes: clientInfo.notes,
              appointmentId: appointmentId
            },
          }),
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the booking if email fails
      }

      // Success! Redirect to confirmation
      window.location.href = `/booking-confirmed?success=true&website=${encodeURIComponent(business?.website || '')}`;
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      showToast('Failed to create booking: ' + error.message, 'error');
      setSavingBooking(false);
    }
  };

  // Check if a time slot is blocked or outside business hours
  const isTimeBlocked = (timeSlot: string) => {
    if (!selectedDate || !selectedStaff) return false;
    
    // Convert time slot to 24-hour format for comparison
    const [time, period] = timeSlot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const slotTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Check if outside business hours for the selected day
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayHours = business?.hours?.[dayOfWeek];
    
    if (dayHours?.closed) {
      return true; // Business is closed on this day
    }
    
    const openTime = dayHours?.open || '09:00';
    const closeTime = dayHours?.close || '18:00';
    
    if (slotTime < openTime || slotTime >= closeTime) {
      return true; // Outside business hours for this day
    }
    
    // Check blocked times
    return blockedTimes.some(bt => {
      // Check if this block applies to the selected staff or all staff
      if (bt.staffId !== selectedStaff?.id && bt.staffId !== 'all') return false;
      
      // Check if the selected date is within the blocked date range
      const btStart = bt.startDate?.toDate ? bt.startDate.toDate() : new Date(bt.startDate);
      const btEnd = bt.endDate?.toDate ? bt.endDate.toDate() : new Date(bt.endDate);
      const dateStr = selectedDate.toDateString();
      const btStartStr = btStart.toDateString();
      const btEndStr = btEnd.toDateString();
      
      if (dateStr < btStartStr || dateStr > btEndStr) return false;
      
      // Check if the time slot falls within the blocked time range
      return slotTime >= bt.startTime && slotTime < bt.endTime;
    });
  };

  // Get available staff for a specific time slot
  const getAvailableStaffForTime = (timeSlot: string, date: Date) => {
    if (!selectedServices.length || !date) return [];
    
    
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const totalServiceDuration = selectedServices.reduce((total, service) => total + (service.duration || 60), 0);
    const maxBufferTime = selectedServices.reduce((max, service) => Math.max(max, service.bufferTime || 0), 0);
    const totalDuration = totalServiceDuration + maxBufferTime;
    
    // Filter staff by location and check if they can perform ALL selected services
    const locationStaff = filteredStaff.filter((member: any) => {
      
      // Check if staff belongs to selected location
      if (selectedLocation && member.locationId && member.locationId !== selectedLocation.id) {
        return false;
      }
      
      // Check if staff can perform all selected services
      const canPerformAllServices = selectedServices.every(service => {
        const canPerform = member.services?.includes('all') || member.services?.includes(service.id);
        return canPerform;
      });
      
      if (!canPerformAllServices) {
        return false;
      }
      
      // Check if staff is working this day
      const staffHours = member.workingHours?.[dayOfWeek];
      
      if (!staffHours || staffHours.closed) {
        return false;
      }
      
      // Check if time slot is within working hours
      const slotStart = timeToMinutes(timeSlot);
      const slotEnd = slotStart + totalDuration;
      const workStart = timeToMinutes(staffHours.open);
      const workEnd = timeToMinutes(staffHours.close);
      
      if (slotStart < workStart || slotEnd > workEnd) {
        return false;
      }
      
      // Check if time conflicts with breaks
      const hasBreakConflict = member.breaks?.some((breakTime: any) => {
        if (breakTime.day !== dayOfWeek) return false;
        
        const breakStart = timeToMinutes(breakTime.start);
        const breakEnd = timeToMinutes(breakTime.end);
        
        return (slotStart < breakEnd && slotEnd > breakStart);
      });
      
      if (hasBreakConflict) {
        return false;
      }
      
      // Check if staff has conflicting appointments
      const hasAppointmentConflict = appointments.some((apt: any) => {
        if (apt.status === 'cancelled' || apt.status === 'completed') return false;
        if (apt.staffId !== member.id && apt.staffId) return false; // Skip if different staff (but check unassigned)
        
        const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        const isSameDate = aptDate.toDateString() === date.toDateString();
        
        if (!isSameDate) return false;
        
        const aptBufferTime = apt.bufferTime || 0;
        const aptStart = timeToMinutes(apt.time);
        const aptEnd = aptStart + (apt.duration || 60) + aptBufferTime;
        
        return (slotStart < aptEnd && slotEnd > aptStart);
      });
      
      if (hasAppointmentConflict) {
        return false;
      }
      
      return true;
    });
    
    return locationStaff;
  };

  // Generate time slots based on staff working hours and business hours
  const generateAvailableTimes = () => {
    if (!selectedDate) return [];
    
    // Use the same booking limits validation as the date picker
    if (!isDateWithinBookingLimits(selectedDate as Date)) {
      return [];
    }
    
    
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Get business hours for the location
    const locationHours = selectedLocation?.hours?.[dayOfWeek];
    if (!locationHours || locationHours.closed) {
      return []; // Location is closed
    }
    
    // If "No Preference" is selected or staff has no working hours, use location hours
    let openTime = locationHours.open;
    let closeTime = locationHours.close;
    
    if (selectedStaff && selectedStaff.id) {
      // Get staff working hours for the day
      const staffHours = selectedStaff?.workingHours?.[dayOfWeek];
      if (staffHours && staffHours.closed) {
        return []; // Staff is not working this day
      }
      
      if (staffHours) {
        // Use the more restrictive hours (later start, earlier end)
        openTime = staffHours.open > locationHours.open ? staffHours.open : locationHours.open;
        closeTime = staffHours.close < locationHours.close ? staffHours.close : locationHours.close;
      }
    }
    
    // Parse times
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    
    
    // Calculate minimum time based on booking notice
    const now = new Date();
    const minNoticeHours = business?.bookingPolicy?.minNoticeHours || business?.minBookingNoticeHours || 24;
    const minBookingTime = new Date(now.getTime() + (minNoticeHours * 60 * 60 * 1000));
    
    // If the selected date is today, adjust the minimum time
    let minHour = openHour;
    let minMinute = openMin;
    
    if (selectedDate.toDateString() === now.toDateString()) {
      // If booking for today, ensure we don't allow times before the minimum notice period
      const minHourToday = minBookingTime.getHours();
      const minMinuteToday = minBookingTime.getMinutes();
      
      if (minHourToday > openHour || (minHourToday === openHour && minMinuteToday > openMin)) {
        minHour = minHourToday;
        minMinute = minMinuteToday;
      }
    }
    
    const times = [];
    let currentHour = minHour;
    let currentMin = minMinute;
    
    // Get total duration of all selected services and buffer time
    const totalServiceDuration = selectedServices.reduce((total, service) => total + (service.duration || 60), 0);
    // Get the maximum buffer time from all selected services
    const maxBufferTime = selectedServices.reduce((max, service) => Math.max(max, service.bufferTime || 0), 0);
    const totalDuration = totalServiceDuration + maxBufferTime;
    
    // Generate time slots based on service duration
    const intervalMinutes = business?.bookingTimeInterval || 15;
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMin + totalDuration <= closeMin)) {
      const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
      const period = currentHour >= 12 ? 'PM' : 'AM';
      const timeStr = `${hour12}:${currentMin.toString().padStart(2, '0')} ${period}`;
      
      // Check if this time slot is within the minimum booking notice
      const slotDateTime = new Date(selectedDate);
      slotDateTime.setHours(currentHour, currentMin, 0, 0);
      
      if (slotDateTime < minBookingTime) {
        // Skip this time slot as it's too close to the current time
        currentMin += intervalMinutes;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour++;
        }
        continue;
      }
      
      // Check if this time slot is valid (including buffer time validation)
      if (selectedStaff?.id) {
        // If specific staff selected, check if time slot is valid for that staff
        if (isTimeSlotValid(timeStr, selectedStaff, selectedDate, selectedServices)) {
          times.push(timeStr);
        }
      } else {
        // If no specific staff, check if any staff can handle this time slot
        const canAnyStaffHandle = filteredStaff.some(staff => 
          isTimeSlotValid(timeStr, staff, selectedDate, selectedServices)
        );
        
        if (canAnyStaffHandle) {
          times.push(timeStr);
        }
      }
      
      // Add interval minutes
      currentMin += intervalMinutes;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    
    return times;
  };

  // Helper function to convert time to minutes
  const timeToMinutes = (timeStr: string) => {
    // Handle both 12-hour and 24-hour formats
    let time24 = timeStr;
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const [time, period] = timeStr.split(' ');
      let [hours, mins] = time.split(':').map(Number);
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      time24 = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    
    const [hours, mins] = time24.split(':').map(Number);
    return hours * 60 + mins;
  };

  const availableTimes = generateAvailableTimes();
  
  // Generate all time slots (both available and unavailable) for display
  const generateAllTimeSlots = (): Array<{time: string, available: boolean, reason: string}> => {
    if (!selectedDate) return [];
    
    // Use the same booking limits validation as the date picker
    if (!isDateWithinBookingLimits(selectedDate as Date)) {
      return [];
    }
    
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Get business hours for the location
    const locationHours = selectedLocation?.hours?.[dayOfWeek];
    if (!locationHours || locationHours.closed) {
      return []; // Location is closed
    }
    
    // If "No Preference" is selected or staff has no working hours, use location hours
    let openTime = locationHours.open;
    let closeTime = locationHours.close;
    
    if (selectedStaff && selectedStaff.id) {
      // Get staff working hours for the day
      const staffHours = selectedStaff?.workingHours?.[dayOfWeek];
      if (staffHours && staffHours.closed) {
        return []; // Staff is not working this day
      }
      
      if (staffHours) {
        // Use the more restrictive hours (later start, earlier end)
        openTime = staffHours.open > locationHours.open ? staffHours.open : locationHours.open;
        closeTime = staffHours.close < locationHours.close ? staffHours.close : locationHours.close;
      }
    }
    
    // Parse times
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    
    // Calculate minimum time based on booking notice
    const now = new Date();
    const minNoticeHours = business?.bookingPolicy?.minNoticeHours || business?.minBookingNoticeHours || 24;
    const minBookingTime = new Date(now.getTime() + (minNoticeHours * 60 * 60 * 1000));
    
    // If the selected date is today, adjust the minimum time
    let minHour = openHour;
    let minMinute = openMin;
    
    if (selectedDate.toDateString() === now.toDateString()) {
      // If booking for today, ensure we don't allow times before the minimum notice period
      const minHourToday = minBookingTime.getHours();
      const minMinuteToday = minBookingTime.getMinutes();
      
      if (minHourToday > openHour || (minHourToday === openHour && minMinuteToday > openMin)) {
        minHour = minHourToday;
        minMinute = minMinuteToday;
      }
    }
    
    const times = [];
    let currentHour = minHour;
    let currentMin = minMinute;
    
    // Get total duration of all selected services and buffer time
    const totalServiceDuration = selectedServices.reduce((total, service) => total + (service.duration || 60), 0);
    // Get the maximum buffer time from all selected services
    const maxBufferTime = selectedServices.reduce((max, service) => Math.max(max, service.bufferTime || 0), 0);
    const totalDuration = totalServiceDuration + maxBufferTime;
    
    // Generate time slots based on service duration
    const intervalMinutes = business?.bookingTimeInterval || 15;
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMin + totalDuration <= closeMin)) {
      const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
      const period = currentHour >= 12 ? 'PM' : 'AM';
      const timeStr = `${hour12}:${currentMin.toString().padStart(2, '0')} ${period}`;
      
      // Check if this time slot is within the minimum booking notice
      const slotDateTime = new Date(selectedDate);
      slotDateTime.setHours(currentHour, currentMin, 0, 0);
      
      if (slotDateTime < minBookingTime) {
        // Skip this time slot as it's too close to the current time
        currentMin += intervalMinutes;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour++;
        }
        continue;
      }
      
      // Check if this time slot is valid (including buffer time validation)
      let isAvailable = false;
      let reason = '';
      
      if (selectedStaff?.id) {
        // If specific staff selected, check if time slot is valid for that staff
        isAvailable = isTimeSlotValid(timeStr, selectedStaff, selectedDate, selectedServices);
        if (!isAvailable) {
          reason = 'Staff unavailable';
        }
      } else {
        // If no specific staff, check if any staff can handle this time slot
        const canAnyStaffHandle = filteredStaff.some(staff => 
          isTimeSlotValid(timeStr, staff, selectedDate, selectedServices)
        );
        isAvailable = canAnyStaffHandle;
        if (!isAvailable) {
          reason = 'No staff available';
        }
      }
      
      times.push({
        time: timeStr,
        available: isAvailable,
        reason: reason
      });
      
      // Add interval minutes
      currentMin += intervalMinutes;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    
    return times;
  };
  
  const allTimeSlots = generateAllTimeSlots();

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colorScheme.colors.background }}>
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6">
              {business?.logoURL && (
                <img 
                  src={business?.logoURL} 
                  alt={`${business?.businessName} Logo`}
                  className="w-16 h-16 sm:w-24 sm:h-24 object-contain rounded-lg"
                />
              )}
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: colorScheme.colors.primary }}>
                  {business?.businessName || 'Book Appointment'}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">{business?.address || 'Online Booking'}</p>
              </div>
            </div>
            <Link href={business?.website || "/"} style={{ color: colorScheme.colors.primary }} className="text-sm sm:text-base">
              ← Back to Website
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 overflow-x-auto pb-2">
            {[
              { num: 1, label: 'Location' },
              { num: 2, label: 'Services' },
              { num: 3, label: 'Date & Time' },
              { num: 4, label: 'Details' },
            ].map((s) => (
              <div key={s.num} className="flex items-center flex-shrink-0">
                <div className={`flex items-center ${s.num !== 4 ? 'space-x-2 sm:space-x-4' : ''}`}>
                  <div 
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base ${step >= s.num ? 'text-white' : 'bg-gray-200 text-gray-600'}`}
                    style={step >= s.num ? { backgroundColor: colorScheme.colors.primary } : {}}
                  >
                    {s.num}
                  </div>
                  <span 
                    className={`text-xs sm:text-sm font-medium hidden sm:inline ${step >= s.num ? '' : 'text-gray-600'}`}
                    style={step >= s.num ? { color: colorScheme.colors.primary } : {}}
                  >
                    {s.label}
                  </span>
                </div>
                {s.num !== 4 && (
                  <div 
                    className={`w-12 h-0.5 ${step > s.num ? '' : 'bg-gray-200'} mx-2`}
                    style={step > s.num ? { backgroundColor: colorScheme.colors.primary } : {}}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Location */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Select a Location</h2>
            {locations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No locations available at this time</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => {
                      handleLocationChange(location);
                      setStep(2);
                    }}
                    className={`p-3 sm:p-4 border-2 rounded-xl text-left hover:border-primary hover:bg-soft-pink/30 transition-all ${selectedLocation?.id === location.id ? 'border-primary bg-soft-pink/30' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{location.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                        {location.phone && (
                          <p className="text-sm text-gray-500">{location.phone}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium" style={{ color: colorScheme.colors.primary }}>Select</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Services */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Select Services</h2>
              <button 
                onClick={() => setStep(1)} 
                style={{ color: colorScheme.colors.primary }}
                className="hover:opacity-80 transition-opacity"
              >
                ← Back
              </button>
            </div>

            {selectedLocation && (
              <div className="mb-6 p-4 bg-soft-pink/30 rounded-lg">
                <div className="font-semibold text-gray-900">{selectedLocation.name}</div>
              </div>
            )}

            {/* Selected Services Cart */}
            {selectedServices.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                  </svg>
                  Selected Services ({selectedServices.length})
                </h3>
                <div className="space-y-2">
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{service.name}</div>
                        <div className="text-sm text-gray-600">{service.duration} min • {formatPrice(service.price, currency)}</div>
                      </div>
                      <button
                        onClick={() => removeServiceFromCart(service.id)}
                        className="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-green-200">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Duration:</span>
                      <span>{getTotalDuration()} minutes</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold text-green-700">
                      <span>Total Price:</span>
                      <span>{formatPrice(getTotalPrice(), currency)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setStep(3)}
                    className="text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    style={{ backgroundColor: colorScheme.colors.primary }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colorScheme.colors.primaryDark}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colorScheme.colors.primary}
                  >
                    Continue to Time Selection →
                  </button>
                </div>
              </div>
            )}

            {filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No services available for the selected staff member</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Choose one or more services for your appointment</p>
                </div>
                {Object.entries(groupedServices).map(([category, categoryServices]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{category}</h3>
                    <div className="grid gap-4">
                      {(categoryServices as any[]).map((service: any) => {
                        const isInCart = selectedServices.some(s => s.id === service.id);
                        return (
                          <div
                            key={service.id}
                            className={`p-4 border-2 rounded-xl transition-all ${
                              isInCart 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-gray-200 hover:border-primary hover:bg-soft-pink/30'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">{service.name}</h4>
                                <p className="text-sm text-gray-600 mb-2">{service.description || 'Professional service'}</p>
                                <span className="text-sm text-gray-500">{service.duration} minutes</span>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-xl font-bold mb-2" style={{ color: colorScheme.colors.primary }}>{formatPrice(service.price, currency)}</div>
                                {service.depositRequired && (
                                  <div className="text-xs text-gray-600 mb-2">
                                    Deposit: {formatPrice(service.price * (service.depositPercentage / 100), currency)}
                                  </div>
                                )}
                                <button
                                  onClick={() => isInCart ? removeServiceFromCart(service.id) : addServiceToCart(service)}
                                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    isInCart
                                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                      : 'text-white hover:opacity-90'
                                  }`}
                                  style={!isInCart ? { backgroundColor: colorScheme.colors.primary } : {}}
                                >
                                  {isInCart ? 'Remove' : 'Add to Cart'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Date, Time & Staff */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Select Date, Time & Staff</h2>
              <button 
                onClick={() => setStep(2)} 
                style={{ color: colorScheme.colors.primary }}
                className="hover:opacity-80 transition-opacity"
              >
                ← Back
              </button>
            </div>

            {selectedServices.length > 0 && (
              <div className="mb-6 p-4 bg-soft-pink/30 rounded-lg">
                <div className="font-semibold text-gray-900 mb-2">Selected Services</div>
                <div className="space-y-1 mb-3">
                  {selectedServices.map((service) => (
                    <div key={service.id} className="text-sm text-gray-600">
                      • {service.name} ({service.duration} min) - {formatPrice(service.price, currency)}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedStaff && `with ${selectedStaff.name} • `}Total: {getTotalDuration()} min • {formatPrice(getTotalPrice(), currency)}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Calendar */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Select Date</h3>
                  <input
                    type="date"
                    min={(() => {
                      // Calculate minimum date based on booking policy
                      const minAdvanceNotice = business?.bookingPolicy?.minNoticeHours || business?.minBookingNoticeHours || 24; // hours
                      const minDate = new Date();
                      minDate.setHours(minDate.getHours() + minAdvanceNotice);
                      return minDate.toISOString().split('T')[0];
                    })()}
                    max={(() => {
                      // Calculate maximum date based on booking policy
                      const maxAdvanceBooking = business?.bookingPolicy?.maxAdvanceMonths ? business.bookingPolicy.maxAdvanceMonths * 30 : business?.maxAdvanceBookingDays || 90; // Convert months to days
                      const maxDate = new Date();
                      maxDate.setDate(maxDate.getDate() + maxAdvanceBooking);
                      return maxDate.toISOString().split('T')[0];
                    })()}
                    onChange={(e) => {
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      const selectedDate = new Date(year, month - 1, day, 12, 0, 0);
                      
                      // Validate booking limits
                      if (!isDateWithinBookingLimits(selectedDate)) {
                        const minNoticeHours = business?.bookingPolicy?.minNoticeHours || business?.minBookingNoticeHours || 24;
                        const maxAdvanceDays = business?.bookingPolicy?.maxAdvanceMonths ? business.bookingPolicy.maxAdvanceMonths * 30 : business?.maxAdvanceBookingDays || 90;
                        
                        // Check if it's a holiday
                        const dateStr = selectedDate.toISOString().split('T')[0];
                        const isHoliday = business?.holidays?.some((holiday: any) => {
                          const holidayDate = holiday.date?.toDate ? holiday.date.toDate() : new Date(holiday.date);
                          const holidayDateStr = holidayDate.toISOString().split('T')[0];
                          return holidayDateStr === dateStr;
                        });
                        
                        if (isHoliday) {
                          setToast({ 
                            message: 'This date is a holiday/closure day and not available for booking', 
                            type: 'error' 
                          });
                        } else {
                          setToast({ 
                            message: `Please select a date between ${minNoticeHours} hours from now and ${maxAdvanceDays} days in advance`, 
                            type: 'error' 
                          });
                        }
                        return;
                      }
                      
                      setSelectedDate(selectedDate);
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm sm:text-base"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Bookings require {business?.bookingPolicy?.minNoticeHours || business?.minBookingNoticeHours || 24} hours advance notice and can be made up to {business?.bookingPolicy?.maxAdvanceMonths ? business.bookingPolicy.maxAdvanceMonths + ' months' : (business?.maxAdvanceBookingDays || 90) + ' days'} in advance
                  </p>
              </div>

              {/* Time Slots */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Time Slots</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {allTimeSlots.map(slot => {
                    const { time, available, reason } = slot;
                    const blocked = isTimeBlocked(time);
                    
                    // Check staff availability for this time slot
                    const availableStaff = selectedDate && selectedServices.length > 0 
                      ? getAvailableStaffForTime(time, selectedDate)
                      : [];
                    
                    const noStaffAvailable = selectedServices.length > 0 && availableStaff.length === 0;
                    
                    // Determine if this slot is disabled
                    const isDisabled = !selectedDate || blocked || !available || noStaffAvailable;
                    
                    // Get the reason for unavailability
                    let unavailabilityReason = '';
                    if (blocked) {
                      unavailabilityReason = 'Blocked';
                    } else if (!available) {
                      unavailabilityReason = reason || 'Unavailable';
                    } else if (noStaffAvailable) {
                      unavailabilityReason = 'No staff';
                    }
                    
                    return (
                      <button
                        key={time}
                        onClick={() => {
                          if (!isDisabled) {
                            setSelectedTime(time);
                            setAvailableStaffForTime(availableStaff);
                            // Auto-select staff if only one is available
                            if (availableStaff.length === 1) {
                              setSelectedStaff(availableStaff[0]);
                            } else {
                              setSelectedStaff(null);
                            }
                          }
                        }}
                        disabled={isDisabled}
                        className={`px-3 py-2 text-sm rounded-lg border-2 transition-all relative ${
                          isDisabled
                            ? 'border-gray-300 bg-gray-200 text-gray-400 cursor-not-allowed'
                            : selectedTime === time 
                              ? 'border-primary bg-soft-pink/30 hover:border-primary hover:bg-soft-pink/50' 
                              : 'border-gray-200 hover:border-primary hover:bg-soft-pink/30'
                        } ${!selectedDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isDisabled ? unavailabilityReason : `${availableStaff.length} staff available`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{time}</span>
                          {isDisabled && unavailabilityReason && (
                            <span className="text-xs opacity-75 mt-1">{unavailabilityReason}</span>
                          )}
                        </div>
                        {!isDisabled && availableStaff.length > 0 && (
                          <span className="absolute top-0 right-0 text-xs text-green-600 font-bold">{availableStaff.length}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white border-2 border-gray-200 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded"></div>
                    <span>Unavailable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-soft-pink/30 border-2 border-primary rounded"></div>
                    <span>Selected</span>
                  </div>
                </div>
                
                {/* Show message when no time slots are available */}
                  {allTimeSlots.length === 0 && selectedDate && selectedServices.length > 0 && (
                    <div className="col-span-3 p-6 text-center bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                      <div className="text-yellow-800 font-semibold mb-2">
                        {(() => {
                          // Check if it's due to booking policy
                          const minAdvanceNotice = business?.bookingPolicy?.minNoticeHours || business?.minBookingNoticeHours || 24;
                          const maxAdvanceBooking = business?.bookingPolicy?.maxAdvanceMonths || 6;
                          const minAdvanceDate = new Date();
                          minAdvanceDate.setHours(minAdvanceDate.getHours() + minAdvanceNotice);
                          const maxAdvanceDate = new Date();
                          maxAdvanceDate.setMonth(maxAdvanceDate.getMonth() + maxAdvanceBooking);
                          
                          if (selectedDate < minAdvanceDate) {
                            return `Bookings require ${minAdvanceNotice} hours advance notice`;
                          }
                          if (selectedDate > maxAdvanceDate) {
                            return `Bookings cannot be made more than ${maxAdvanceBooking} months in advance`;
                          }
                          return 'No available times for this date';
                        })()}
                      </div>
                      <p className="text-sm text-yellow-700">
                        {(() => {
                          const minAdvanceNotice = business?.bookingPolicy?.minNoticeHours || business?.minBookingNoticeHours || 24;
                          const maxAdvanceBooking = business?.bookingPolicy?.maxAdvanceMonths || 6;
                          const minAdvanceDate = new Date();
                          minAdvanceDate.setHours(minAdvanceDate.getHours() + minAdvanceNotice);
                          const maxAdvanceDate = new Date();
                          maxAdvanceDate.setMonth(maxAdvanceDate.getMonth() + maxAdvanceBooking);
                          
                          if (selectedDate < minAdvanceDate) {
                            return `Please select a date at least ${minAdvanceNotice} hours in advance`;
                          }
                          if (selectedDate > maxAdvanceDate) {
                            return `Please select a date within the next ${maxAdvanceBooking} months`;
                          }
                          return 'Try selecting a different date or time';
                        })()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Staff Selection - shown after time is selected */}
                {selectedTime && availableStaffForTime.length > 0 && (
                  <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Available Staff at {selectedTime}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {availableStaffForTime.length} staff member{availableStaffForTime.length !== 1 ? 's' : ''} available for this time
                    </p>
                    
                    <div className="grid gap-3">
                      {/* No Preference Option - only show if multiple staff available */}
                      {availableStaffForTime.length > 1 && (
                        <button
                          onClick={() => setSelectedStaff({ id: null, name: 'No Preference' })}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            selectedStaff?.id === null && selectedStaff?.name === 'No Preference'
                              ? 'border-primary bg-soft-pink/30'
                              : 'border-gray-300 hover:border-primary hover:bg-soft-pink/20'
                          }`}
                        >
                          <div className="font-semibold text-gray-900">No Preference</div>
                          <div className="text-sm text-gray-600">First available staff member</div>
                        </button>
                      )}

                      {/* Available Staff Members */}
                      {availableStaffForTime.map((member: any) => (
                        <button
                          key={member.id}
                          onClick={() => setSelectedStaff(member)}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            selectedStaff?.id === member.id
                              ? 'border-primary bg-soft-pink/30'
                              : 'border-gray-300 hover:border-primary hover:bg-soft-pink/20'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {member.photoURL ? (
                              <img 
                                src={member.photoURL} 
                                alt={member.name}
                                className="w-12 h-12 object-cover rounded-full border-2 border-gray-200"
                              />
                            ) : (
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                                style={{ 
                                  background: `linear-gradient(135deg, ${colorScheme.colors.primary}20, ${colorScheme.colors.secondary}40)`,
                                  color: colorScheme.colors.primary
                                }}
                              >
                                {member.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{member.name}</h4>
                              <p className="text-sm text-gray-600">{member.role || 'Staff Member'}</p>
                            </div>
                            {selectedStaff?.id === member.id && (
                              <div style={{ color: colorScheme.colors.primary }}>
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {blockedTimes.filter(bt => {
                  if (!selectedDate || !availableStaffForTime.length) return false;
                  const btStart = bt.startDate?.toDate ? bt.startDate.toDate() : new Date(bt.startDate);
                  const btEnd = bt.endDate?.toDate ? bt.endDate.toDate() : new Date(bt.endDate);
                  const dateStr = selectedDate.toDateString();
                  return dateStr >= btStart.toDateString() && dateStr <= btEnd.toDateString() && 
                         (bt.staffId === selectedStaff?.id || bt.staffId === 'all');
                }).length > 0 && (
                  <div className="mt-3 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>ℹ️ Note:</strong> Some time slots are unavailable due to staff scheduling
                    </p>
                  </div>
                )}
            </div>

            {selectedDate && selectedTime && selectedStaff && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    if (!selectedLocation) {
                      setToast({ message: 'Please select a location first', type: 'error' });
                      return;
                    }
                    if (!selectedStaff) {
                      setToast({ message: 'Please select a staff member first', type: 'error' });
                      return;
                    }
                    if (selectedServices.length === 0) {
                      setToast({ message: 'Please select at least one service', type: 'error' });
                      return;
                    }
                    setStep(4);
                  }}
                  className="text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colorScheme.colors.primaryDark}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colorScheme.colors.primary}
                >
                  Continue →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Client Details */}
        {step === 4 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Information</h2>
              <button 
                onClick={() => setStep(3)} 
                style={{ color: colorScheme.colors.primary }}
                className="hover:opacity-80 transition-opacity"
              >
                ← Back
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-soft-pink/30 rounded-lg">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Location</div>
                    <div className="font-semibold text-gray-900">{selectedLocation?.name || 'Main Location'}</div>
                    <div className="text-xs text-gray-500">{selectedLocation?.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Staff Member</div>
                    <div className="font-semibold text-gray-900">{selectedStaff?.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Date</div>
                    <div className="font-semibold text-gray-900">
                      {selectedDate?.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Time</div>
                    <div className="font-semibold text-gray-900">{selectedTime}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-soft-pink/50">
                  <div className="text-sm text-gray-600 mb-2">Service{selectedServices.length > 1 ? 's' : ''}</div>
                  {selectedServices.map((service, index) => (
                    <div key={index} className="flex justify-between items-center mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">{service.name}</div>
                        <div className="text-xs text-gray-500">{service.duration} minutes</div>
                      </div>
                      <div className="font-semibold text-gray-900">{formatPrice(service.price, currency)}</div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-soft-pink/50">
                    <div className="font-bold text-gray-900">Total</div>
                    <div className="font-bold text-xl text-primary">{formatPrice(getTotalPrice(), currency)}</div>
                  </div>
                </div>
              </div>

              {/* Customer Account Section */}
              {!customer ? (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Have an Account?</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Sign in to use your loyalty points and save your details for faster booking.
                  </p>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Welcome back, {customer.firstName && customer.lastName ? `${customer.firstName} ${customer.lastName}` : customer.name || customer.email}!</h3>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm sm:text-base"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={clientInfo.email}
                  onChange={(e) => {
                    setClientInfo({ ...clientInfo, email: e.target.value });
                    checkLoyaltyPoints(e.target.value);
                  }}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm sm:text-base"
                  placeholder="your@email.com"
                />
              </div>

              {/* Loyalty Points Section */}
              {business?.loyaltyProgram?.active && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">⭐</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">Loyalty Program</h3>
                        <p className="text-sm text-gray-600">
                          {loyaltyPoints > 0 ? `You have ${loyaltyPoints} points` : 'Earn points with every booking!'}
                        </p>
                      </div>
                    </div>
                    {loyaltyPoints > 0 && (
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                        {loyaltyPoints} pts
                      </span>
                    )}
                  </div>

                  {/* Points Earning Potential - Only show if not using points/rewards */}
                  {selectedServices.length > 0 && !pointsToUse && !selectedReward && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🎯</span>
                          <div>
                            <p className="text-sm font-medium text-blue-800">Points You'll Earn</p>
                            <p className="text-xs text-blue-600">
                              {business?.loyaltyProgram?.settings?.pointsPerDollar || 1} point per {currencySymbol}1 spent
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-blue-900">
                          +{Math.floor(getTotalPrice() * (business?.loyaltyProgram?.settings?.pointsPerDollar || 1))} pts
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Available Rewards Section */}
                  {loyaltyPoints > 0 && availableRewards.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Available Rewards
                        </label>
                        <div className="space-y-2">
                          {availableRewards
                            .filter(reward => reward.points <= loyaltyPoints)
                            .map((reward) => (
                            <div
                              key={reward.id}
                              onClick={() => {
                                if (selectedReward?.id === reward.id) {
                                  setSelectedReward(null);
                                  setPointsToUse(0);
                                  setPointsDiscount(0);
                                } else {
                                  setSelectedReward(reward);
                                  setPointsToUse(reward.points);
                                  setPointsDiscount(calculateRewardDiscount(reward));
                                }
                              }}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedReward?.id === reward.id
                                  ? 'border-primary bg-primary/10'
                                  : 'border-gray-200 hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900">{reward.name}</h4>
                                  <p className="text-sm text-gray-600">{reward.points} points</p>
                                  {reward.description && (
                                    <p className="text-xs text-gray-500 mt-1">{reward.description}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-primary">
                                    {formatPrice(calculateRewardDiscount(reward), business?.currency || 'usd')} off
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {reward.claimed || 0} claimed
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {availableRewards.filter(reward => reward.points <= loyaltyPoints).length === 0 && (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No rewards available with your current points
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedReward && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-800">Selected Reward:</span>
                            <span className="text-lg font-bold text-green-900">
                              {selectedReward.name}
                            </span>
                          </div>
                          <p className="text-xs text-green-700 mt-1">
                            Using {selectedReward.points} points for {formatPrice(calculateRewardDiscount(selectedReward), business?.currency || 'usd')} discount
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Loyalty Program Benefits */}
                  <div className="mt-4 pt-3 border-t border-yellow-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-600">Earn points on every visit</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-600">Redeem for rewards</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-600">Birthday bonus points</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-600">Referral rewards</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm sm:text-base"
                  placeholder="(123) 456-7890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={clientInfo.notes}
                  onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm sm:text-base"
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>

            <div className="border-t pt-6">
              {/* Individual Service Breakdown */}
              {selectedServices.length > 1 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Service Breakdown</h4>
                  <div className="space-y-2">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{service.name}</span>
                        <span className="font-medium">{formatPrice(service.price, currency)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between items-center font-semibold">
                      <span className="text-gray-700">Subtotal</span>
                      <span className="text-gray-900">{formatPrice(getTotalPrice(), currency)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Price Summary with Loyalty Points */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">
                      {selectedServices.length === 1 ? 'Service Total' : 'Subtotal'}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatPrice(selectedServices.reduce((total, service) => total + (service.price || 0), 0), currency)}
                    </span>
                  </div>
                  
                  {(pointsDiscount > 0 || selectedReward) && (
                    <div className="flex justify-between items-center text-green-700">
                      <span className="text-sm">
                        {selectedReward 
                          ? `Reward: ${selectedReward.name} (${selectedReward.points} pts)`
                          : `Loyalty Points Discount (${pointsToUse} pts)`
                        }
                      </span>
                      <span className="font-semibold">
                        -{formatPrice(selectedReward ? calculateRewardDiscount(selectedReward) : pointsDiscount, currency)}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      {(pointsDiscount > 0 || selectedReward) ? 'Final Total' : 'Total Amount'}
                    </span>
                    <span className="text-2xl font-bold text-primary">{formatPrice(getTotalPrice(), currency)}</span>
                  </div>
                  
                  {(pointsDiscount > 0 || selectedReward) && (
                    <div className="text-xs text-green-600 text-center">
                      💰 You saved {formatPrice(selectedReward ? calculateRewardDiscount(selectedReward) : pointsDiscount, currency)} with {selectedReward ? 'your reward' : 'loyalty points'}!
                    </div>
                  )}
                </div>
              </div>

              {/* Voucher Section */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 mr-2" style={{ color: colorScheme.colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  <span className="font-semibold text-gray-900">Have a Gift Voucher?</span>
                </div>
                
                {!voucherVerified ? (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono"
                      placeholder="Enter voucher code"
                      maxLength={20}
                    />
                    <button
                      onClick={handleVerifyVoucher}
                      disabled={!voucherCode || verifyingVoucher}
                      className="px-6 py-2 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: colorScheme.colors.primary }}
                    >
                      {verifyingVoucher ? 'Verifying...' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-green-500 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-semibold text-green-700">Voucher Applied!</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Code: {voucherVerified.code}</p>
                      </div>
                      <button
                        onClick={() => {
                          setVoucherVerified(null);
                          setVoucherCode('');
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Voucher Balance:</span>
                        <span className="text-lg font-bold text-green-600">{formatPrice(voucherVerified.balance, currency)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Service Price:</span>
                        <span className="font-medium">{formatPrice(getTotalPrice(), currency)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-700 font-medium">
                          {voucherVerified.balance >= getTotalPrice() ? 'Voucher After:' : 'You Pay:'}
                        </span>
                        <span className="text-lg font-bold" style={{ color: voucherVerified.balance >= getTotalPrice() ? '#10b981' : '#f59e0b' }}>
                          {voucherVerified.balance >= getTotalPrice() 
                            ? formatPrice(voucherVerified.balance - getTotalPrice(), currency)
                            : formatPrice(getTotalPrice() - voucherVerified.balance, currency)
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (!selectedLocation || !selectedStaff || selectedServices.length === 0 || !selectedDate || !selectedTime) {
                      setToast({ message: 'Please complete all booking selections first', type: 'error' });
                      return;
                    }
                    // If voucher covers full amount, complete booking immediately
                    if (voucherVerified && voucherVerified.balance >= getTotalPrice()) {
                      handleBookingComplete();
                    } else {
                      handlePaymentTypeSelection('full');
                    }
                  }}
                  disabled={!clientInfo.name || !clientInfo.email || !clientInfo.phone}
                  className="w-full text-white py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = colorScheme.colors.primaryDark)}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = colorScheme.colors.primary)}
                >
                  {(() => {
                    // Check if payment processor is connected
                    const paymentProvider = business?.paymentProvider || business?.paymentConfig?.provider;
                    const stripeConnected = paymentProvider === 'stripe' && (business?.paymentConfig?.stripe?.connected || business?.paymentConfig?.stripe?.accountId);
                    const squareConnected = paymentProvider === 'square' && business?.paymentConfig?.square?.connected;
                    
                    if (!stripeConnected && !squareConnected) {
                      return 'Complete Booking (Pay in Store)';
                    }
                    
                    if (voucherVerified && voucherVerified.balance >= getTotalPrice()) {
                      return `Complete Booking (Free - Voucher Covers All)`;
                    } else if (voucherVerified) {
                      return `Pay Remaining ${formatPrice(getTotalPrice() - voucherVerified.balance, currency)}`;
                    } else {
                      return `Pay Full Amount (${formatPrice(getTotalPrice(), currency)})`;
                    }
                  })()}
                </button>
                {selectedServices[0]?.depositRequired && !voucherVerified && (() => {
                  // Check if payment processor is connected
                  const paymentProvider = business?.paymentProvider || business?.paymentConfig?.provider;
                  const stripeConnected = paymentProvider === 'stripe' && (business?.paymentConfig?.stripe?.connected || business?.paymentConfig?.stripe?.accountId);
                  const squareConnected = paymentProvider === 'square' && business?.paymentConfig?.square?.connected;
                  
                  // Only show deposit button if payment processor is connected
                  if (!stripeConnected && !squareConnected) {
                    return null;
                  }
                  
                  return (
                    <button 
                      onClick={() => {
                        if (!selectedLocation || !selectedStaff || selectedServices.length === 0 || !selectedDate || !selectedTime) {
                          setToast({ message: 'Please complete all booking selections first', type: 'error' });
                          return;
                        }
                        handlePaymentTypeSelection('deposit');
                      }}
                      disabled={!clientInfo.name || !clientInfo.email || !clientInfo.phone}
                      className="w-full bg-white hover:bg-gray-50 border-2 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ color: colorScheme.colors.primary, borderColor: colorScheme.colors.primary }}
                    >
                      Pay Deposit ({formatPrice(getTotalPrice() * ((selectedServices[0]?.depositPercentage || 30) / 100), currency)})
                    </button>
                  );
                })()}
              </div>

              <p className="text-sm text-gray-600 text-center mt-4">
                {business?.paymentConfig?.provider === 'stripe' && 'Secure payment powered by Stripe'}
                {business?.paymentConfig?.provider === 'square' && 'Payment processed by Square'}
                {!business?.paymentConfig?.provider && 'Payment at appointment'}
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Payment */}
        {step === 5 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Complete Payment</h2>

            <div className="mb-6 p-4 bg-soft-pink/30 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">
                  {paymentType === 'deposit' ? 'Deposit Amount' : 'Total Amount'}
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(
                    paymentType === 'deposit' 
                      ? getTotalPrice() * ((selectedServices[0]?.depositPercentage || 30) / 100)
                      : getTotalPrice(),
                    currency
                  )}
                </span>
              </div>
              {paymentType === 'deposit' && (
                <p className="text-sm text-gray-600">
                  Remaining balance of {formatPrice(getTotalPrice() * (1 - (selectedServices[0]?.depositPercentage || 30) / 100), currency)} due at appointment
                </p>
              )}
            </div>

            {/* Stripe Payment */}
            {((business?.paymentProvider === 'stripe' || business?.paymentConfig?.provider === 'stripe') && clientSecret) && (
              <Elements 
                stripe={stripePromise} 
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#d4a574',
                      borderRadius: '8px',
                    },
                  },
                }}
              >
                <CheckoutForm
                  amount={paymentType === 'deposit' 
                    ? getTotalPrice() * ((selectedServices[0]?.depositPercentage || 30) / 100)
                    : getTotalPrice()
                  }
                  onSuccess={handleBookingComplete}
                  isDeposit={paymentType === 'deposit'}
                  appointmentData={{
                    services: selectedServices,
                    staff: selectedStaff,
                    date: selectedDate,
                    time: selectedTime,
                    client: clientInfo,
                  }}
                  colorScheme={colorScheme}
                  businessWebsite={business?.website || ''}
                />
              </Elements>
            )}

            {/* Square Payment */}
            {((business?.paymentProvider === 'square' || business?.paymentConfig?.provider === 'square') && !clientSecret) && (
              <div>
                <p className="text-center text-gray-600 mb-6">
                  Complete your booking and pay at your appointment
                </p>
                <button
                  onClick={() => handleBookingComplete()}
                  disabled={savingBooking}
                  className="w-full py-3 sm:py-4 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                  onMouseEnter={(e) => !savingBooking && (e.currentTarget.style.backgroundColor = colorScheme.colors.primaryDark)}
                  onMouseLeave={(e) => !savingBooking && (e.currentTarget.style.backgroundColor = colorScheme.colors.primary)}
                >
                  {savingBooking ? 'Creating Booking...' : 'Confirm Booking'}
                </button>
                <p className="text-xs text-center text-gray-500 mt-4">
                  💳 You'll be able to pay with Square at your appointment
                </p>
              </div>
            )}

            <button
              onClick={() => setStep(4)}
              disabled={savingBooking}
              className="w-full mt-4 py-2 text-sm text-gray-600 hover:opacity-80 disabled:opacity-50"
              style={{ '--hover-color': colorScheme.colors.primary } as React.CSSProperties}
            >
              ← Back to details
            </button>
          </div>
        )}
      </div>

      {/* Pay in Store Modal */}
      {showPayInStoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pay in Store</h3>
                  <p className="text-sm text-gray-600">No online payment required</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Online payment is not available for this business. Your booking will be created and you can pay at your appointment.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPayInStoreModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowPayInStoreModal(false);
                    await handleBookingComplete();
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
                  style={{ backgroundColor: colorScheme.colors.primary }}
                >
                  Continue Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Sign In</h3>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={loginForm.phone}
                  onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Send Verification Code
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                We'll create an account for you when you verify your phone number.
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Toast Container for useToast hook */}
      <ToastContainer />
    </div>
  );
}
