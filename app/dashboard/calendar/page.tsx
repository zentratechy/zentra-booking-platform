'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CalendarComponent from '@/components/Calendar';
import { formatPrice, getCurrencySymbol } from '@/lib/currency';
import { awardLoyaltyPoints } from '@/lib/loyalty';
import DashboardSidebar from '@/components/DashboardSidebar';
import DragDropCalendar from '@/components/DragDropCalendar';
import { useToast } from '@/hooks/useToast';

function CalendarContent() {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showClientSearchModal, setShowClientSearchModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [aftercareTemplates, setAftercareTemplates] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currency, setCurrency] = useState('usd');
  const [cancellationReasons, setCancellationReasons] = useState<string[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    staffId: '',
    locationId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    bufferTime: 0,
    notes: '',
    status: 'confirmed',
    paymentStatus: 'pending',
    paymentMethod: 'cash',
    aftercareTemplateId: '',
  });
  const [paymentData, setPaymentData] = useState({
    method: 'cash',
    amount: 0,
    isPartial: false,
    notes: '',
    voucherCode: '',
  });
  const [blockTimeData, setBlockTimeData] = useState({
    staffId: '',
    title: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '17:00',
    reason: '',
    isRecurring: false,
    recurrencePattern: 'weekly',
  });
  const [saving, setSaving] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState<any[]>([]);

  // Fetch all data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch all calendar data via API
        const response = await fetch(`/api/calendar/data?businessId=${user.uid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch calendar data');
        }
        
        const result = await response.json();
        const { appointments: appointmentsData, clients: clientsData, staff: staffData, services: servicesData, business: businessData } = result.data;
        
        // Set business currency and cancellation reasons
        if (businessData) {
          setCurrency(businessData.currency || 'usd');
          
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
        }

        // Fetch locations
        const locationsQuery = query(
          collection(db, 'locations'),
          where('businessId', '==', user.uid)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch blocked times
        const blockedTimesQuery = query(
          collection(db, 'blockedTimes'),
          where('businessId', '==', user.uid)
        );
        const blockedTimesSnapshot = await getDocs(blockedTimesQuery);
        const blockedTimesData = blockedTimesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch aftercare templates
        const aftercareQuery = query(
          collection(db, 'aftercareTemplates'),
          where('businessId', '==', user.uid)
        );
        const aftercareSnapshot = await getDocs(aftercareQuery);
        const aftercareData = aftercareSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Enrich appointments with service category, services array, and bufferTime if missing
        const enrichedAppointments = appointmentsData.map((apt: any) => {
          let enrichedApt = { ...apt };
          
          // Add service category if missing
          if (!enrichedApt.serviceCategory && enrichedApt.serviceId) {
            const service: any = servicesData.find((s: any) => s.id === enrichedApt.serviceId);
            if (service) {
              enrichedApt.serviceCategory = service.category;
            }
          }
          
          // Add bufferTime if missing (for backward compatibility with old appointments)
          if (enrichedApt.bufferTime === undefined && enrichedApt.serviceId) {
            const service: any = servicesData.find((s: any) => s.id === enrichedApt.serviceId);
            if (service && service.bufferTime !== undefined) {
              enrichedApt.bufferTime = service.bufferTime;
            } else {
              enrichedApt.bufferTime = 0;
            }
          }
          
          // Add services array for multi-service appointments
          if (enrichedApt.services && enrichedApt.services.length > 0) {
            // Services array already exists, ensure each service has category
            enrichedApt.services = enrichedApt.services.map((service: any) => {
              if (!service.category) {
                const serviceData: any = servicesData.find((s: any) => s.id === service.id);
                if (serviceData) {
                  return { ...service, category: serviceData.category };
                }
              }
              return service;
            });
          } else if (enrichedApt.serviceId) {
            // Single service appointment - create services array for consistency
            const service: any = servicesData.find((s: any) => s.id === enrichedApt.serviceId);
            if (service) {
              enrichedApt.services = [{
                id: service.id,
                name: service.name,
                duration: service.duration,
                price: service.price,
                category: service.category
              }];
            }
          }
          
          return enrichedApt;
        });
        
        setAppointments(enrichedAppointments);
        setClients(clientsData);
        setStaff(staffData);
        setServices(servicesData);
        setLocations(locationsData);
        setAftercareTemplates(aftercareData);
        setBlockedTimes(blockedTimesData);
        
        // Set default location if only one exists
        if (locationsData.length === 1) {
          setSelectedLocation(locationsData[0]);
        } else if (locationsData.length > 1 && !selectedLocation) {
          // If multiple locations exist, default to the first one
          setSelectedLocation(locationsData[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time listener for appointments
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('businessId', '==', user.uid)
    );
    
    const unsubscribeAppointments = onSnapshot(appointmentsQuery, async (snapshot) => {
      const appointmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Enrich appointments with the same logic as initial fetch
      const enrichedAppointments = appointmentsData.map((apt: any) => {
        let enrichedApt = { ...apt };
        
        // Add service category if missing
        if (!enrichedApt.serviceCategory && enrichedApt.serviceId) {
          const service: any = services.find((s: any) => s.id === enrichedApt.serviceId);
          if (service) {
            enrichedApt.serviceCategory = service.category;
          }
        }
        
        // Add bufferTime if missing (for backward compatibility with old appointments)
        if (enrichedApt.bufferTime === undefined && enrichedApt.serviceId) {
          const service: any = services.find((s: any) => s.id === enrichedApt.serviceId);
          if (service && service.bufferTime !== undefined) {
            enrichedApt.bufferTime = service.bufferTime;
          } else {
            enrichedApt.bufferTime = 0;
          }
        }
        
        // Add services array for multi-service appointments
        if (enrichedApt.services && enrichedApt.services.length > 0) {
          // Services array already exists, ensure each service has category
          enrichedApt.services = enrichedApt.services.map((service: any) => {
            if (!service.category) {
              const serviceData: any = services.find((s: any) => s.id === service.id);
              if (serviceData) {
                return { ...service, category: serviceData.category };
              }
            }
            return service;
          });
        } else if (enrichedApt.serviceId) {
          // Single service appointment - create services array for consistency
          const service: any = services.find((s: any) => s.id === enrichedApt.serviceId);
          if (service) {
            enrichedApt.services = [{
              id: service.id,
              name: service.name,
              duration: service.duration,
              price: service.price,
              category: service.category
            }];
          }
        }
        
        return enrichedApt;
      });
      
      setAppointments(enrichedAppointments);
    }, (error) => {
      console.error('❌ Real-time listener error:', error);
    });

        // Cleanup listener on unmount
        return () => {
          unsubscribeAppointments();
        };
  }, [user]);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      let clientId = formData.clientId;
      let clientData: any = null;

      // Create new client if needed
      if (isNewClient) {
        // Check if email already exists
        const existingClient = clients.find(c => c.email.toLowerCase() === newClientData.email.toLowerCase());
        if (existingClient) {
          showToast('A client with this email already exists', 'error');
          setSaving(false);
          return;
        }

        // Create new client
        const newClient = {
          businessId: user.uid,
          name: newClientData.name,
          email: newClientData.email,
          phone: newClientData.phone || '',
          createdAt: serverTimestamp(),
        };

        const clientRef = await addDoc(collection(db, 'clients'), newClient);
        clientId = clientRef.id;
        clientData = { id: clientRef.id, ...newClient, createdAt: new Date() };

        // Add to local state
        setClients(prev => [...prev, clientData]);

        // Reset new client form
        setNewClientData({ name: '', email: '', phone: '' });
        setIsNewClient(false);

        showToast('New client created successfully!', 'success');
      } else {
        clientData = clients.find(c => c.id === clientId);
      }

      const selectedService = services.find(s => s.id === formData.serviceId);
      const selectedStaff = staff.find(s => s.id === formData.staffId);
      const selectedLocation = locations.find(l => l.id === formData.locationId);

      if (!selectedService || !clientData) {
        showToast('Please select a service and client', 'error');
        setSaving(false);
        return;
      }

      // Calculate end time based on service duration
      const [hours, minutes] = formData.time.split(':');
      const startTime = new Date(formData.date);
      startTime.setHours(parseInt(hours), parseInt(minutes));
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration);

      // Create date without timezone issues - use the date string directly
      const [year, month, day] = formData.date.split('-').map(Number);
      const appointmentDate = new Date(year, month - 1, day, 12, 0, 0); // month is 0-indexed, set to noon
      
      const newAppointment = {
        businessId: user.uid,
        clientId: clientId,
        clientName: clientData.name,
        clientEmail: clientData.email,
        serviceId: formData.serviceId,
        serviceName: selectedService.name,
        serviceCategory: selectedService.category,
        staffId: formData.staffId || null,
        staffName: selectedStaff?.name || 'Any Staff',
        locationId: formData.locationId || null,
        locationName: selectedLocation?.name || 'Main Location',
        date: Timestamp.fromDate(appointmentDate),
        time: formData.time,
        duration: selectedService.duration,
        bufferTime: formData.bufferTime || 0,
        endTime: endTime.toTimeString().substring(0, 5),
        price: selectedService.price,
        status: formData.status,
        payment: {
          status: formData.paymentStatus,
          method: formData.paymentMethod,
          amount: formData.paymentStatus === 'paid' ? selectedService.price : 0,
          remainingBalance: formData.paymentStatus === 'paid' ? 0 : selectedService.price,
          depositRequired: selectedService.depositRequired,
          depositPercentage: selectedService.depositPercentage,
          depositPaid: false,
        },
        notes: formData.notes,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'appointments'), newAppointment);
      
      // Add to local state with fresh data
      setAppointments(prev => {
        const updated = [...prev, { 
          id: docRef.id, 
          ...newAppointment,
          date: appointmentDate,
          createdAt: new Date()
        }];
        
        return updated;
      });

      // Send confirmation email to customer
      try {
        const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
        const businessData = businessDoc.exists() ? businessDoc.data() : {};
        
        
        const emailResponse = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: clientData.email,
            subject: `Appointment Confirmation - ${selectedService.name}`,
            type: 'booking_confirmation',
            businessId: user.uid,
            appointmentData: {
              customerName: clientData.name,
              clientEmail: clientData.email,
              serviceName: selectedService.name,
              staffName: selectedStaff?.name || 'Any Staff',
              appointmentDate: appointmentDate.toISOString(),
              appointmentTime: formData.time,
              locationName: selectedLocation?.name || 'Main Location',
              businessName: businessData.businessName || businessData.name,
              totalPrice: selectedService.price,
              currency: businessData.currency || 'gbp',
              notes: formData.notes,
              appointmentId: docRef.id,
              businessId: user.uid
            }
          })
        });
        
        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          throw new Error(emailResult.error || 'Failed to send email');
        }
      } catch (emailError: any) {
        console.error('❌ Failed to send confirmation email:', emailError);
        showToast('Appointment created but email failed to send', 'error');
        // Don't block appointment creation if email fails
      }
      
      // Reset form
      setFormData({
        clientId: '',
        serviceId: '',
        staffId: '',
        locationId: selectedLocation?.id || '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        duration: 60,
        bufferTime: 0,
        notes: '',
        status: 'confirmed',
        paymentStatus: 'pending',
        paymentMethod: 'cash',
        aftercareTemplateId: '',
      });
      setShowAddModal(false);
      setSaving(false);
      setIsNewClient(false);
      setNewClientData({ name: '', email: '', phone: '' });
      showToast('Appointment created and confirmation email sent!', 'success');
    } catch (error: any) {
      console.error('Error adding appointment:', error);
      showToast('Failed to add appointment: ' + (error.message || 'Please try again.'), 'error');
      setSaving(false);
    }
  };

  const handleEditClick = async (appointment: any) => {
    setSelectedAppointment(appointment);
    // Handle both Firestore Timestamp objects and ISO date strings
    let dateObj;
    if (appointment.date?.toDate) {
      dateObj = appointment.date.toDate();
    } else if (typeof appointment.date === 'string') {
      dateObj = new Date(appointment.date);
    } else {
      dateObj = new Date(appointment.date);
    }
    
    // Convert 12-hour time to 24-hour format (for time input)
    const convertTo24Hour = (time12h: string) => {
      if (!time12h) return '09:00';
      
      // If already in 24-hour format (no AM/PM), return as is
      if (!time12h.includes('AM') && !time12h.includes('PM')) {
        return time12h;
      }
      
      const [time, modifier] = time12h.split(' ');
      let [hours, minutes] = time.split(':');
      
      if (hours === '12') {
        hours = modifier === 'AM' ? '00' : '12';
      } else {
        hours = modifier === 'PM' ? String(parseInt(hours, 10) + 12) : hours;
      }
      
      return `${hours.padStart(2, '0')}:${minutes}`;
    };
    
    const formDataToSet = {
      clientId: appointment.clientId || '',
      serviceId: appointment.serviceId || '',
      staffId: appointment.staffId || '',
      locationId: appointment.locationId || '',
      date: dateObj.toISOString().split('T')[0],
      time: convertTo24Hour(appointment.time),
      duration: appointment.duration || 60,
      bufferTime: appointment.bufferTime || 0,
      notes: appointment.notes || '',
      status: appointment.status || 'confirmed',
      paymentStatus: appointment.payment?.status || 'pending',
      paymentMethod: appointment.payment?.method || 'cash',
      aftercareTemplateId: appointment.aftercareTemplateId || '',
    };
    
    // Fix for appointments with incorrect payment data
    if (appointment.payment?.status === 'pending' && appointment.payment?.method === 'cash' && 
        appointment.selectedRewardId && appointment.loyaltyPointsUsed > 0) {
      // Check if this was a deposit payment (has remainingBalance)
      const hasRemainingBalance = appointment.payment?.remainingBalance > 0;
      const isDepositPayment = hasRemainingBalance || appointment.payment?.depositPaid;
      
      const correctedFormData = {
        ...formDataToSet,
        paymentStatus: isDepositPayment ? 'partial' : 'paid',
        paymentMethod: 'card'
      };
      setFormData(correctedFormData);
      setShowEditModal(true);
      return;
    }
    
    setFormData(formDataToSet);
    setShowEditModal(true);
  };

  const handleSendAftercare = async () => {
    if (!selectedAppointment || !formData.aftercareTemplateId) return;

    try {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      if (!selectedClient?.email) {
        showToast('Client email not found', 'error');
        return;
      }

      // Get the selected template
      const selectedTemplate = aftercareTemplates.find(t => t.id === formData.aftercareTemplateId);
      if (!selectedTemplate) {
        showToast('Aftercare template not found', 'error');
        return;
      }

      // Get business information
      const businessDoc = await getDoc(doc(db, 'businesses', user!.uid));
      const businessData = businessDoc.exists() ? businessDoc.data() : {};
      const businessName = businessData.businessName || 'Your Business';
      const businessLogo = businessData.logoURL || null;

      const response = await fetch('/api/email/send-aftercare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: selectedAppointment.id,
          aftercareTemplateId: formData.aftercareTemplateId,
          clientEmail: selectedClient.email,
          clientName: selectedClient.name,
          businessId: user!.uid,
          templateName: selectedTemplate.name,
          templateContent: selectedTemplate.content,
          businessName: businessName,
          businessLogo: businessLogo,
        }),
      });

      if (response.ok) {
        showToast('Aftercare document sent successfully!', 'success');
      } else {
        const error = await response.json();
        showToast('Failed to send aftercare document: ' + error.error, 'error');
      }
    } catch (error) {
      console.error('Error sending aftercare:', error);
      showToast('Failed to send aftercare document', 'error');
    }
  };

  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedAppointment) return;

    setSaving(true);
    try {
      const selectedService = services.find(s => s.id === formData.serviceId);
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const selectedStaff = staff.find(s => s.id === formData.staffId);

      const [hours, minutes] = formData.time.split(':');
      const startTime = new Date(formData.date);
      startTime.setHours(parseInt(hours), parseInt(minutes));
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (formData.duration || 60));

      // Create date without timezone issues - use the date string directly
      const [year, month, day] = formData.date.split('-').map(Number);
      const appointmentDate = new Date(year, month - 1, day, 12, 0, 0); // month is 0-indexed, set to noon
      
      // Handle multi-service vs single-service appointments
      const isMultiService = selectedAppointment?.services?.length > 1;
      
      const updatedData = {
        clientId: formData.clientId,
        clientName: selectedClient?.name,
        // For multi-service appointments, preserve the original service data
        serviceId: isMultiService ? (selectedAppointment.serviceId || null) : formData.serviceId,
        serviceName: isMultiService ? selectedAppointment.serviceName : selectedService?.name,
        serviceCategory: isMultiService ? (selectedAppointment.serviceCategory || null) : selectedService?.category,
        // Preserve services array for multi-service appointments
        ...(isMultiService && { services: selectedAppointment.services }),
        staffId: formData.staffId || null,
        staffName: selectedStaff?.name || 'Any Staff',
        date: Timestamp.fromDate(appointmentDate),
        time: formData.time,
        duration: formData.duration,
        bufferTime: formData.bufferTime || 0,
        endTime: endTime.toTimeString().substring(0, 5),
        price: isMultiService ? selectedAppointment.price : selectedService?.price,
        status: formData.status,
        payment: {
          ...(selectedAppointment.payment ? Object.fromEntries(
            Object.entries(selectedAppointment.payment).filter(([_, value]) => value !== undefined)
          ) : {}),
          status: formData.paymentStatus,
          method: formData.paymentMethod,
        },
        notes: formData.notes,
        aftercareTemplateId: formData.aftercareTemplateId || null,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'appointments', selectedAppointment.id), updatedData);
      
      // Award loyalty points if appointment is being marked as completed
      const wasCompleted = selectedAppointment.status === 'completed';
      const isNowCompleted = formData.status === 'completed';
      
      if (isNowCompleted && !wasCompleted && formData.clientId) {
        // Calculate total price for loyalty points and client stats
        const totalPrice = isMultiService 
          ? (selectedAppointment as any)?.price || 0
          : selectedService?.price || (selectedAppointment as any)?.price || 0;
        
        // Check if customer used points or rewards for this booking
        const usedPoints = (selectedAppointment as any)?.loyaltyPointsUsed || 0;
        const usedReward = (selectedAppointment as any)?.selectedRewardId || null;
        const isUsingPoints = usedPoints > 0 || usedReward;
        
        // Only award points if customer did NOT use points/rewards
        if (!isUsingPoints) {
          
          // Award loyalty points
          const pointsAwarded = await awardLoyaltyPoints(
            user.uid,
            formData.clientId,
            selectedClient?.email || '',
            totalPrice
          );
          
          if (pointsAwarded) {
            // Get business loyalty settings to calculate points correctly
            const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
            const businessData = businessDoc.data();
            const pointsPerDollar = businessData?.loyaltyProgram?.settings?.pointsPerDollar || 1;
            const pointsToAward = Math.floor(totalPrice * pointsPerDollar);
            
            // Update local client data
            setClients(clients.map(c => 
              c.id === formData.clientId 
                ? { ...c, loyaltyPoints: (c.loyaltyPoints || 0) + pointsToAward } 
                : c
            ));
          }
        }

        // Update client's totalVisits and totalSpent
        if (formData.clientId) {
          try {
            await updateDoc(doc(db, 'clients', formData.clientId), {
              totalVisits: increment(1),
              totalSpent: increment(totalPrice),
              lastVisit: serverTimestamp(),
            });
            
            // Update local client data
            setClients(clients.map(c => 
              c.id === formData.clientId 
                ? { 
                    ...c, 
                    totalVisits: (c.totalVisits || 0) + 1,
                    totalSpent: (c.totalSpent || 0) + totalPrice,
                    lastVisit: new Date()
                  } 
                : c
            ));
          } catch (error) {
            console.error('Failed to update client stats:', error);
          }
        }
      }
      
      // Update local state with fresh data - force new array reference
      setAppointments(prev => {
        const updated = prev.map(a => 
          a.id === selectedAppointment.id ? { 
            ...a, 
            ...updatedData,
            date: appointmentDate,
            updatedAt: new Date()
          } : a
        );
        
        // Return new array to force prop update
        return [...updated];
      });
      
      setFormData({
        clientId: '',
        serviceId: '',
        staffId: '',
        locationId: selectedLocation?.id || '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        duration: 60,
        bufferTime: 0,
        notes: '',
        status: 'confirmed',
        paymentStatus: 'pending',
        paymentMethod: 'cash',
        aftercareTemplateId: '',
      });
      setSelectedAppointment(null);
      setShowEditModal(false);
      setSaving(false);
      showToast('Appointment updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      showToast('Failed to update appointment: ' + (error.message || 'Please try again.'), 'error');
      setSaving(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;

    setSaving(true);
    try {
      // Instead of deleting, mark as cancelled to preserve payment records
      await updateDoc(doc(db, 'appointments', selectedAppointment.id), {
        status: 'cancelled',
        cancellationReason: cancelReason || 'No reason provided',
        cancelledAt: serverTimestamp(),
        cancelledBy: 'staff',
        updatedAt: serverTimestamp(),
      });
      
      // Update local state with fresh data
      setAppointments(prev => {
        const updated = prev.map(a => 
          a.id === selectedAppointment.id 
            ? { ...a, status: 'cancelled', updatedAt: new Date() }
            : a
        );
        
        return [...updated];
      });
      
      setSelectedAppointment(null);
      setShowDeleteModal(false);
      setShowEditModal(false);
      setSaving(false);
      showToast('Appointment cancelled successfully!', 'success');
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      showToast('Failed to cancel appointment: ' + (error.message || 'Please try again.'), 'error');
      setSaving(false);
    }
  };

  // Client search functionality
  const handleClientSearch = (searchTerm: string) => {
    setClientSearchTerm(searchTerm);
    if (searchTerm.trim() === '') {
      setFilteredClients([]);
      return;
    }
    
    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  };

  const handleSelectClient = (client: any) => {
    setFormData({ ...formData, clientId: client.id });
    setIsNewClient(false);
    setShowClientSearchModal(false);
    setClientSearchTerm('');
    setFilteredClients([]);
  };

  const handleMoveAppointment = async (appointmentId: string, newDate: string, newTime: string) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      // Parse the date string manually to avoid timezone issues
      // Use noon (12:00) instead of midnight to avoid timezone shifts
      const [year, month, day] = newDate.split('-').map(Number);
      const appointmentDate = new Date(year, month - 1, day, 12, 0, 0); // month is 0-indexed, set to noon
      
      await updateDoc(appointmentRef, {
        date: Timestamp.fromDate(appointmentDate),
        time: newTime,
        updatedAt: serverTimestamp(),
      });

      // Update local state immediately with the correct date
      // Force a completely new array reference to ensure React re-renders child components
      setAppointments(prev => {
        const updated = prev.map(apt => 
          apt.id === appointmentId 
            ? { 
                ...apt, 
                date: Timestamp.fromDate(appointmentDate), 
                time: newTime,
                updatedAt: new Date()
              }
            : apt
        );
        
        // Return a new array (not just mapped) to force prop update
        return [...updated];
      });
      
      // Show success message
      showToast('Appointment moved successfully!', 'success');
    } catch (error) {
      console.error('❌ ERROR MOVING APPOINTMENT:', {
        appointmentId,
        newDate,
        newTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      showToast('Failed to move appointment. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream">
        <DashboardSidebar />
        <div className="ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />
      <ToastContainer />

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Calendar & Appointments</h2>
                <p className="text-gray-600">Manage your schedule and bookings</p>
              </div>
              <div className="flex items-center space-x-4">
                {locations.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Location:</label>
                    <select
                      value={selectedLocation?.id || ''}
                      onChange={(e) => {
                        const location = locations.find(loc => loc.id === e.target.value);
                        setSelectedLocation(location || null);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                    >
                      <option value="">All Locations</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    + New Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">
                {selectedLocation ? `${selectedLocation.name} Appointments` : 'Total Appointments'}
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {selectedLocation 
                  ? appointments.filter(apt => apt.locationId === selectedLocation.id).length
                  : appointments.length
                }
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">This Week</div>
              <div className="text-3xl font-bold text-gray-900">
                {(selectedLocation 
                  ? appointments.filter(apt => apt.locationId === selectedLocation.id)
                  : appointments
                ).filter(apt => {
                  const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
                  const now = new Date();
                  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
                  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7));
                  return aptDate >= startOfWeek && aptDate <= endOfWeek;
                }).length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Completed</div>
              <div className="text-3xl font-bold text-gray-900">
                {(selectedLocation 
                  ? appointments.filter(apt => apt.locationId === selectedLocation.id)
                  : appointments
                ).filter(a => a.status === 'completed').length}
              </div>
            </div>
          </div>

                      {/* Drag & Drop Calendar */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <DragDropCalendar
                          key={appointments.map(a => `${a.id}-${a.time}-${a.date}`).join('|')}
                          appointments={appointments}
                          selectedLocation={selectedLocation}
                          onMoveAppointment={handleMoveAppointment}
                          onEditAppointment={handleEditClick}
                          onAddAppointment={(date, time) => {
                            setFormData({
                              ...formData,
                              date: date,
                              time: time,
                              locationId: selectedLocation?.id || ''
                            });
                            setShowAddModal(true);
                          }}
                          onBlockTime={(date, time) => {
                            setBlockTimeData({
                              staffId: '',
                              title: '',
                              startDate: date,
                              startTime: time,
                              endDate: date,
                              endTime: time,
                              reason: '',
                              isRecurring: false,
                              recurrencePattern: 'weekly'
                            });
                            setShowBlockTimeModal(true);
                          }}
                          currency={currency}
                          businessHours={selectedLocation?.hours || {
                            monday: { open: '09:00', close: '19:00' },
                            tuesday: { open: '09:00', close: '19:00' },
                            wednesday: { open: '09:00', close: '19:00' },
                            thursday: { open: '09:00', close: '19:00' },
                            friday: { open: '09:00', close: '19:00' },
                            saturday: { open: '09:00', close: '19:00' },
                            sunday: { open: '09:00', close: '19:00' }
                          }}
                          showToast={showToast}
                        />
                      </div>
        </div>
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add New Appointment</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setIsNewClient(false);
                  setNewClientData({ name: '', email: '', phone: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="space-y-6">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <div className="space-y-2">
                  {/* Selected Client Display */}
                  {formData.clientId && !isNewClient && (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-semibold text-sm">
                            {clients.find(c => c.id === formData.clientId)?.name?.charAt(0) || 'C'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {clients.find(c => c.id === formData.clientId)?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {clients.find(c => c.id === formData.clientId)?.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, clientId: '' });
                          setClientSearchTerm('');
                          setFilteredClients([]);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Search and Add Buttons */}
                  {!formData.clientId && !isNewClient && (
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowClientSearchModal(true)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left text-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      >
                        🔍 Search clients...
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewClient(true);
                          setFormData({ ...formData, clientId: '' });
                        }}
                        className="px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                      >
                        + Add New
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* New Client Fields */}
              {isNewClient && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900">New Client Details</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={newClientData.name}
                      onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      required
                      placeholder="Enter client name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      required
                      placeholder="Enter client email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="Enter phone number (optional)"
                    />
                  </div>
                </div>
              )}

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => {
                    const selectedService = services.find(s => s.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      serviceId: e.target.value,
                      bufferTime: selectedService?.bufferTime || 0
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {formatPrice(service.price, currency)} ({service.duration} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Buffer Time */}
              {(formData.serviceId || selectedAppointment?.services?.length > 1) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time (minutes)</label>
                  <input 
                    type="number"
                    value={formData.bufferTime}
                    onChange={(e) => setFormData({ ...formData, bufferTime: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="120"
                    step="5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Extra time added after this appointment</p>
                </div>
              )}

              {/* Location Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
                <select
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">Any Staff</option>
                  {staff
                    .filter(staffMember => !selectedLocation || !staffMember.locationId || staffMember.locationId === selectedLocation.id)
                    .map((staffMember) => (
                    <option key={staffMember.id} value={staffMember.id}>
                      {staffMember.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="arrived">Arrived</option>
                  <option value="started">Started</option>
                  <option value="completed">Completed</option>
                  <option value="did_not_show">Did Not Show</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="voucher">Voucher</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Add any notes about this appointment..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setIsNewClient(false);
                    setNewClientData({ name: '', email: '', phone: '' });
                  }}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Appointment</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateAppointment} className="space-y-6">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedAppointment?.services?.length > 1 ? 'Services' : 'Service'}
                </label>
                
                {/* Multi-service appointments - show as list */}
                {selectedAppointment?.services?.length > 1 ? (
                  <div className="space-y-2">
                    {selectedAppointment.services.map((service: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{service.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({service.duration} min) - {formatPrice(service.price, currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="text-sm text-gray-600">
                      Total: {selectedAppointment.services.reduce((total: number, service: any) => total + service.duration, 0)} min
                    </div>
                  </div>
                ) : (
                  /* Single service appointments - show as dropdown */
                  <select
                    value={formData.serviceId}
                    onChange={(e) => {
                      const selectedService = services.find(s => s.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        serviceId: e.target.value,
                        duration: selectedService?.duration || 60,
                        bufferTime: selectedService?.bufferTime || 0
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select a service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - {formatPrice(service.price, currency)} ({service.duration} min)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Enter duration in minutes"
                />
                <p className="text-xs text-gray-500 mt-1">Duration in minutes (15-minute increments recommended)</p>
              </div>

              {/* Buffer Time */}
              {(formData.serviceId || selectedAppointment?.services?.length > 1) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time (minutes)</label>
                  <input 
                    type="number"
                    value={formData.bufferTime}
                    onChange={(e) => setFormData({ ...formData, bufferTime: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="120"
                    step="5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Extra time added after this appointment</p>
                </div>
              )}

              {/* Location Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
                <select
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">Any Staff</option>
                  {staff
                    .filter(staffMember => !selectedLocation || !staffMember.locationId || staffMember.locationId === selectedLocation.id)
                    .map((staffMember) => (
                    <option key={staffMember.id} value={staffMember.id}>
                      {staffMember.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="arrived">Arrived</option>
                  <option value="started">Started</option>
                  <option value="completed">Completed</option>
                  <option value="did_not_show">Did Not Show</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="voucher">Voucher</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Add any notes about this appointment..."
                />
              </div>

              {/* Aftercare Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aftercare Document (Optional)</label>
                <select
                  value={formData.aftercareTemplateId}
                  onChange={(e) => setFormData({ ...formData, aftercareTemplateId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">No aftercare document</option>
                  {aftercareTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </option>
                  ))}
                </select>
                {formData.aftercareTemplateId && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">
                      Selected: {aftercareTemplates.find(t => t.id === formData.aftercareTemplateId)?.name}
                    </p>
                    <button
                      type="button"
                      onClick={handleSendAftercare}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      📧 Send Aftercare Document
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel Appointment
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Update Appointment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Cancel Appointment</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to cancel this appointment?
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="font-medium text-gray-900">
                  {selectedAppointment.clientName} - {selectedAppointment.serviceName}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedAppointment.date?.toDate ? selectedAppointment.date.toDate().toLocaleDateString() : new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time}
                </p>
                <p className="text-sm text-gray-600">
                  Staff: {selectedAppointment.staffName || 'Any Staff'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation Reason</label>
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
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCancelReason('');
                }}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleDeleteAppointment}
                disabled={saving}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Search Modal */}
      {showClientSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Search Clients</h3>
                <button 
                  onClick={() => {
                    setShowClientSearchModal(false);
                    setClientSearchTerm('');
                    setFilteredClients([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Search Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by name or email
                </label>
                <input
                  type="text"
                  value={clientSearchTerm}
                  onChange={(e) => handleClientSearch(e.target.value)}
                  placeholder="Type to search clients..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  autoFocus
                />
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {clientSearchTerm.trim() === '' ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>Start typing to search for clients</p>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709" />
                    </svg>
                    <p>No clients found matching "{clientSearchTerm}"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {client.name?.charAt(0) || 'C'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{client.name}</p>
                            <p className="text-sm text-gray-600">{client.email}</p>
                            {client.phone && (
                              <p className="text-sm text-gray-500">{client.phone}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarContent />
    </ProtectedRoute>
  );
}