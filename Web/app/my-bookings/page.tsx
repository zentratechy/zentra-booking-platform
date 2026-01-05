'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPrice } from '@/lib/currency';
import { getColorScheme, defaultColorScheme, type ColorScheme } from '@/lib/colorSchemes';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import Toast from '@/components/Toast';

export default function MyBookingsPage() {
  const { customer, loading: authLoading } = useCustomerAuth();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const businessId = searchParams.get('businessId');
  
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [currency, setCurrency] = useState('usd');
  const [colorScheme, setColorScheme] = useState<ColorScheme>(defaultColorScheme);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancellationReasons, setCancellationReasons] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [customerAppointments, setCustomerAppointments] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);

  useEffect(() => {
    const customerEmail = customer?.email || email;
    if (!customerEmail) {
      setLoading(false);
      return;
    }
    
    if (!businessId) {
      // Customer is authenticated but no businessId provided
      setLoading(false);
      return;
    }

    fetchBookings();
  }, [customer, email, businessId]);

  const fetchBookings = async () => {
    try {
      const customerEmail = customer?.email || email;
      if (!customerEmail) return;
      
      // Fetch business info
      const businessDoc = await getDocs(query(collection(db, 'businesses'), where('__name__', '==', businessId)));
      if (!businessDoc.empty) {
        const businessData = { id: businessDoc.docs[0].id, ...businessDoc.docs[0].data() } as any;
        setBusiness(businessData);
        
        // Set cancellation reasons from business settings
        if (businessData.cancellationReasons && Array.isArray(businessData.cancellationReasons)) {
          setCancellationReasons(businessData.cancellationReasons);
        } else {
          // Default reasons if none set
          setCancellationReasons([
            'Poorly',
            'Other commitments', 
            'Not necessary now',
            'Did not show',
            'Appointment made in error',
            'Reacted to patch test'
          ]);
        }
        setCurrency(businessData.currency || 'usd');
        const scheme = getColorScheme(businessData.colorScheme || 'classic');
        setColorScheme(scheme);
      }

      // Fetch all data needed for reschedule functionality
      const [staffSnapshot, servicesSnapshot, locationsSnapshot, appointmentsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'staff'), where('businessId', '==', businessId))),
        getDocs(query(collection(db, 'services'), where('businessId', '==', businessId))),
        getDocs(query(collection(db, 'locations'), where('businessId', '==', businessId))),
        getDocs(query(collection(db, 'appointments'), where('businessId', '==', businessId)))
      ]);

      const staffData = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const servicesData = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const locationsData = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const allAppointmentsData = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      setStaff(staffData);
      setServices(servicesData);
      setLocations(locationsData);
      setAllAppointments(allAppointmentsData);

      // Fetch appointments for this email
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('businessId', '==', businessId),
        where('clientEmail', '==', customerEmail?.toLowerCase())
      );
      
      const appointmentsSnapshot2 = await getDocs(appointmentsQuery);
      const appointmentsData = appointmentsSnapshot2.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Sort by date (upcoming first)
      appointmentsData.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      setCustomerAppointments(appointmentsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    setProcessing(true);
    try {
      await updateDoc(doc(db, 'appointments', selectedAppointment.id), {
        status: 'cancelled',
        cancellationReason: cancelReason,
        cancelledAt: serverTimestamp(),
        cancelledBy: 'customer',
        updatedAt: serverTimestamp(),
      });

      setCustomerAppointments(customerAppointments.map(apt =>
        apt.id === selectedAppointment.id
          ? { ...apt, status: 'cancelled', cancellationReason: cancelReason }
          : apt
      ));

      setToast({ message: 'Appointment cancelled successfully. You will receive a confirmation email shortly.', type: 'success' });
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancelReason('');
      setProcessing(false);
    } catch (error: any) {
      setToast({ message: 'Failed to cancel appointment: ' + (error.message || 'Please try again.'), type: 'error' });
      setProcessing(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment || !newDate || !newTime) return;

    setProcessing(true);
    try {
      const [year, month, day] = newDate.split('-').map(Number);
      // Create date at noon to avoid timezone issues
      const appointmentDate = new Date(year, month - 1, day, 12, 0, 0);

      await updateDoc(doc(db, 'appointments', selectedAppointment.id), {
        date: appointmentDate,
        time: newTime,
        rescheduled: true,
        previousDate: selectedAppointment.date,
        previousTime: selectedAppointment.time,
        updatedAt: serverTimestamp(),
      });

      setCustomerAppointments(customerAppointments.map(apt =>
        apt.id === selectedAppointment.id
          ? { ...apt, date: appointmentDate, time: newTime, rescheduled: true }
          : apt
      ));

      // Send confirmation email
      try {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedAppointment.clientEmail,
            subject: `Appointment Rescheduled - ${selectedAppointment.serviceName}`,
            type: 'reschedule_confirmation',
            businessId: selectedAppointment.businessId,
            appointmentDetails: {
              customerName: selectedAppointment.clientName,
              serviceName: selectedAppointment.serviceName,
              staffName: selectedAppointment.staffName,
              newDate: appointmentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
              newTime: newTime,
              locationName: selectedAppointment.locationName,
              businessName: business?.businessName || 'Your appointment',
            }
          })
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't block the reschedule if email fails
      }

      setToast({ message: 'Appointment rescheduled successfully! Confirmation email sent.', type: 'success' });
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      setNewDate('');
      setNewTime('');
      setProcessing(false);
    } catch (error: any) {
      setToast({ message: 'Failed to reschedule appointment: ' + (error.message || 'Please try again.'), type: 'error' });
      setProcessing(false);
    }
  };

  // Generate available time slots for reschedule
  const generateAvailableTimes = (selectedDate: string, appointmentToReschedule: any) => {
    if (!selectedDate || !business || !appointmentToReschedule) {
      return [];
    }

    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Get location hours for this day (from the appointment's location)
    const location = locations.find(loc => loc.id === appointmentToReschedule.locationId);
    if (!location || !location.hours) {
      return [];
    }

    const locationHours = location.hours;
    // Convert numeric day to string day name
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[dayOfWeek];
    const dayHours = locationHours[dayKey];
    
    if (!dayHours || dayHours.closed) {
      return [];
    }

    const startTime = dayHours.open || '09:00';
    const endTime = dayHours.close || '17:00';
    const interval = business.bookingTimeInterval || 30; // minutes

    // Convert time to minutes for easier calculation
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const minutesToTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const times: string[] = [];

    // Generate time slots
    for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
      const timeString = minutesToTime(minutes);
      times.push(timeString);
    }

    // Filter out times that are already booked (excluding the appointment being rescheduled)
    const availableTimes = times.filter(time => {
      // Check if this time slot conflicts with existing appointments
      const conflictingAppointment = allAppointments.find(apt => {
        if (apt.id === appointmentToReschedule.id) return false; // Skip the appointment being rescheduled
        
        const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        const isSameDate = aptDate.getFullYear() === year && 
                          aptDate.getMonth() === month - 1 && 
                          aptDate.getDate() === day;
        
        if (!isSameDate) return false;

        // Check if the time slots overlap
        const aptStartMinutes = timeToMinutes(apt.time);
        const aptEndMinutes = aptStartMinutes + (apt.duration || 60);
        const slotStartMinutes = timeToMinutes(time);
        const slotEndMinutes = slotStartMinutes + (appointmentToReschedule.duration || 60);

        return (slotStartMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes);
      });

      return !conflictingAppointment;
    });

    return availableTimes;
  };

  // Update available times when date changes
  useEffect(() => {
    if (newDate && selectedAppointment) {
      const times = generateAvailableTimes(newDate, selectedAppointment);
      setAvailableTimes(times);
      
      // Reset time selection if current time is not available
      if (newTime && !times.includes(newTime)) {
        setNewTime('');
      }
    }
  }, [newDate, selectedAppointment, allAppointments, business, locations]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-soft-pink via-white to-soft-lavender flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if customer is authenticated
  if (!customer && !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-soft-pink via-white to-soft-lavender flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You need to sign in to view your bookings.</p>
          <a href="/customer-login" className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Check if businessId is provided
  if (!businessId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-soft-pink via-white to-soft-lavender flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Business Selected</h2>
          <p className="text-gray-600 mb-4">Please use the link from your booking confirmation email to view your appointments.</p>
          <p className="text-sm text-gray-500">If you're looking for your bookings, please check your email for the correct link.</p>
        </div>
      </div>
    );
  }

  // Get business policies
  const cancellationNoticeHours = business?.bookingPolicies?.cancellationNoticeHours || 24;
  const rescheduleNoticeHours = business?.bookingPolicies?.rescheduleNoticeHours || 0;
  const depositRefundOnCancel = business?.bookingPolicies?.depositRefundOnCancel || 'full';
  const depositOnReschedule = business?.bookingPolicies?.depositOnReschedule || 'keep';

  const upcomingAppointments = customerAppointments.filter(apt => {
    const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
    return aptDate >= new Date() && apt.status !== 'cancelled';
  });

  const pastAppointments = customerAppointments.filter(apt => {
    const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
    return aptDate < new Date() || apt.status === 'cancelled';
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-pink via-white to-soft-lavender py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {business?.logoURL && (
            <img 
              src={business.logoURL} 
              alt={business.businessName} 
              className="w-24 h-24 object-contain mx-auto mb-4 rounded-lg"
            />
          )}
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            {business?.businessName || 'My Bookings'}
          </h1>
          <p className="text-gray-600">Manage your appointments</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        ) : (
          <>
            {/* Upcoming Appointments */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Appointments</h2>
              {upcomingAppointments.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600">No upcoming appointments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map(apt => {
                    const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
                    const hoursUntilAppointment = (aptDate.getTime() - new Date().getTime()) / (60 * 60 * 1000);
                    const canCancel = hoursUntilAppointment > cancellationNoticeHours;
                    const canReschedule = hoursUntilAppointment > rescheduleNoticeHours;
                    
                    return (
                      <div key={apt.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{apt.serviceName}</h3>
                            <p className="text-gray-600">{apt.staffName}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{formatPrice(apt.price, currency)}</div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              apt.payment?.status === 'paid' ? 'bg-green-100 text-green-700' :
                              apt.payment?.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {apt.payment?.status === 'paid' ? 'Paid' : 
                               apt.payment?.status === 'partial' ? 'Deposit Paid' : 'Payment Pending'}
                            </span>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center text-gray-700">
                            <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {aptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </div>
                          <div className="flex items-center text-gray-700">
                            <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {apt.time}
                          </div>
                          <div className="flex items-center text-gray-700">
                            <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {apt.duration} mins
                          </div>
                        </div>

                        {apt.payment?.status === 'partial' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700">Deposit Paid:</span>
                              <span className="font-semibold text-blue-900">{formatPrice(apt.payment?.amount || 0, currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-blue-700">Balance Due:</span>
                              <span className="font-semibold text-blue-900">{formatPrice(apt.payment?.remainingBalance || 0, currency)}</span>
                            </div>
                          </div>
                        )}

                        {(apt.payment?.status === 'pending' || apt.payment?.status === 'partial') && (
                          <div className="mb-4">
                            <a
                              href={`/pay/${apt.id}`}
                              className="block w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold text-center transition-colors shadow-sm hover:shadow-md"
                            >
                              {apt.payment?.status === 'partial' 
                                ? `Pay Remaining ${formatPrice(apt.payment?.remainingBalance || 0, currency)}`
                                : `Pay ${formatPrice(apt.price || 0, currency)}`
                              }
                            </a>
                          </div>
                        )}

                        <div className="flex space-x-3">
                          {canReschedule ? (
                            <button
                              onClick={() => {
                                setSelectedAppointment(apt);
                                const aptDateStr = aptDate.toISOString().split('T')[0];
                                setNewDate(aptDateStr);
                                setNewTime(apt.time);
                                setShowRescheduleModal(true);
                              }}
                              className="flex-1 px-4 py-2 text-primary hover:bg-primary/10 border border-primary rounded-lg font-semibold transition-colors"
                            >
                              Reschedule
                            </button>
                          ) : (
                            <div className="flex-1 px-4 py-2 text-gray-400 border border-gray-300 rounded-lg font-semibold text-center">
                              <span className="text-xs">Cannot reschedule</span>
                            </div>
                          )}
                          {canCancel ? (
                            <button
                              onClick={() => {
                                setSelectedAppointment(apt);
                                setShowCancelModal(true);
                              }}
                              className="flex-1 px-4 py-2 text-red-600 hover:bg-red-50 border border-red-600 rounded-lg font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          ) : (
                            <div className="flex-1 px-4 py-2 text-gray-400 border border-gray-300 rounded-lg font-semibold text-center">
                              <span className="text-xs">Cannot cancel ({cancellationNoticeHours}h notice required)</span>
                            </div>
                          )}
                        </div>

                        {apt.rescheduled && (
                          <div className="mt-3 text-xs text-blue-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            This appointment has been rescheduled
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Past Appointments</h2>
                <div className="space-y-4">
                  {pastAppointments.map(apt => {
                    const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
                    
                    return (
                      <div key={apt.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 opacity-75">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{apt.serviceName}</h3>
                            <p className="text-gray-600 text-sm">{apt.staffName}</p>
                            <p className="text-gray-500 text-sm mt-2">
                              {aptDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {apt.time}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-primary mb-2">{formatPrice(apt.price, currency)}</div>
                            <span className={`text-xs px-3 py-1 rounded-full ${
                              apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                              apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {apt.status === 'completed' ? 'Completed' : 
                               apt.status === 'cancelled' ? 'Cancelled' : apt.status}
                            </span>
                            {apt.payment?.status && (
                              <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                                apt.payment?.status === 'paid' ? 'bg-green-100 text-green-700' :
                                apt.payment?.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {apt.payment?.status === 'paid' ? 'Paid' : 
                                 apt.payment?.status === 'partial' ? 'Deposit Paid' : 'Unpaid'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {(apt.payment?.status === 'pending' || apt.payment?.status === 'partial') && (
                          <div className="mt-4">
                            <a
                              href={`/pay/${apt.id}`}
                              className="block w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold text-center transition-colors shadow-sm hover:shadow-md"
                            >
                              {apt.payment?.status === 'partial' 
                                ? `Pay Remaining ${formatPrice(apt.payment?.remainingBalance || 0, currency)}`
                                : `Pay ${formatPrice(apt.price || 0, currency)}`
                              }
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Book Another Button */}
        {business && (
          <div className="mt-8 text-center">
            <a
              href={`/book/${businessId}`}
              className="inline-block px-8 py-4 text-white rounded-lg font-semibold transition-colors shadow-lg"
              style={{ backgroundColor: colorScheme.colors.primary }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colorScheme.colors.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colorScheme.colors.primary}
            >
              Book Another Appointment
            </a>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Cancel Appointment</h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to cancel your appointment for <span className="font-semibold">{selectedAppointment.serviceName}</span>?
              </p>

              {selectedAppointment.payment?.depositPaid && (
                <div className={`mb-4 p-4 rounded-lg border ${
                  depositRefundOnCancel === 'full' ? 'bg-green-50 border-green-200' :
                  depositRefundOnCancel === 'partial' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <p className="text-sm font-medium mb-1">
                    {depositRefundOnCancel === 'full' ? '✓ Deposit Refund' :
                     depositRefundOnCancel === 'partial' ? '⚠️ Partial Deposit Refund' :
                     '❌ No Deposit Refund'}
                  </p>
                  <p className="text-xs">
                    {depositRefundOnCancel === 'full' 
                      ? 'Your full deposit will be refunded.'
                      : depositRefundOnCancel === 'partial'
                      ? 'You will receive a 50% refund of your deposit.'
                      : 'Your deposit is non-refundable and will be forfeited.'}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for cancellation (optional)</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">Select a reason (optional)</option>
                  {cancellationReasons.map((reason, index) => (
                    <option key={index} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedAppointment(null);
                    setCancelReason('');
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={handleCancelAppointment}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {processing ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Reschedule Appointment</h3>
              <p className="text-gray-600 text-center mb-6">
                {selectedAppointment.serviceName}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Time</label>
                  {availableTimes.length === 0 ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-center">
                      No available times for this date
                    </div>
                  ) : (
                    <select
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="">Select time...</option>
                      {availableTimes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedAppointment.payment?.depositPaid && depositOnReschedule === 'forfeit' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-red-800 mb-1">❌ Deposit Will Be Forfeited</p>
                    <p className="text-xs text-red-700">
                      Your deposit of {formatPrice(selectedAppointment.payment?.amount || 0, currency)} will be lost when rescheduling.
                    </p>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> The business will be notified of your reschedule request. They may contact you to confirm availability.
                    {selectedAppointment.payment?.depositPaid && depositOnReschedule === 'keep' && (
                      <span className="block mt-1">✓ Your deposit will transfer to the new appointment.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setSelectedAppointment(null);
                    setNewDate('');
                    setNewTime('');
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={processing || !newDate || !newTime || availableTimes.length === 0}
                  className="flex-1 px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {processing ? 'Rescheduling...' : 
                   availableTimes.length === 0 ? 'No Times Available' : 
                   'Confirm Reschedule'}
                </button>
              </div>
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
    </div>
  );
}

