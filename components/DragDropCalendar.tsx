'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { formatPrice, getCurrencySymbol } from '@/lib/currency';
import { useToast } from '@/hooks/useToast';

interface Appointment {
  id: string;
  clientName: string;
  serviceName: string;
  serviceCategory?: string;
  services?: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
    category: string;
  }>;
  time: string;
  duration: number;
  bufferTime?: number;
  price: number;
  status: string;
  staffId: string;
  staffName: string;
  date: any;
  isNewClient?: boolean;
  payment?: {
    status: string;
    amount: number;
  };
}

interface DragDropCalendarProps {
  appointments: Appointment[];
  selectedLocation?: any;
  onMoveAppointment: (appointmentId: string, newDate: string, newTime: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onAddAppointment?: (date: string, time: string) => void;
  onBlockTime?: (date: string, time: string) => void;
  onEditBlockTime?: (blockedTime: any) => void;
  currency: string;
  businessHours: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ITEM_TYPE = 'APPOINTMENT';

// Helper functions for coloring (defined at top level for access by all components)
const getServiceCategoryColor = (category: string) => {
  // Generate consistent colors based on service category
  const categoryColors: { [key: string]: string } = {
    'Hair': 'bg-pink-100 border-pink-400 text-pink-800',
    'Beauty': 'bg-purple-100 border-purple-400 text-purple-800',
    'Massage': 'bg-green-100 border-green-400 text-green-800',
    'Facial': 'bg-blue-100 border-blue-400 text-blue-800',
    'Facial & Skincare': 'bg-blue-100 border-blue-400 text-blue-800',
    'Nails': 'bg-orange-100 border-orange-400 text-orange-800',
    'Nail Services': 'bg-orange-100 border-orange-400 text-orange-800',
    'Waxing': 'bg-red-100 border-red-400 text-red-800',
    'Lash': 'bg-indigo-100 border-indigo-400 text-indigo-800',
    'Brow': 'bg-teal-100 border-teal-400 text-teal-800',
    'Makeup': 'bg-rose-100 border-rose-400 text-rose-800',
    'Spa': 'bg-emerald-100 border-emerald-400 text-emerald-800',
    'Other': 'bg-gray-100 border-gray-400 text-gray-800',
  };
  
  return categoryColors[category] || categoryColors['Other'];
};

const getStaffColor = (staffName: string) => {
  // Generate consistent colors based on staff name for star highlighting
  const colors = [
    'text-purple-600',
    'text-pink-600',
    'text-indigo-600',
    'text-teal-600',
    'text-orange-600',
    'text-cyan-600',
    'text-emerald-600',
    'text-rose-600',
    'text-violet-600',
    'text-amber-600',
  ];
  
  // Simple hash function to get consistent color for each staff member
  let hash = 0;
  for (let i = 0; i < staffName.length; i++) {
    const char = staffName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Draggable Appointment Component
const DraggableAppointment: React.FC<{
  appointment: Appointment;
  currency: string;
  onEditAppointment: (appointment: Appointment) => void;
  style?: React.CSSProperties;
}> = ({ appointment, currency, onEditAppointment, style }) => {
  const isCancelled = appointment.status === 'cancelled';
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: appointment.id, appointment },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isCancelled, // Prevent dragging cancelled appointments
  }));


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'arrived': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'started': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'did_not_show': return 'bg-red-100 border-red-300 text-red-800';
      case 'cancelled': return 'bg-gray-200 border-gray-400 text-gray-600';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };


  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditAppointment(appointment);
  };

  // Touch event handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isCancelled) return;
    
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsTouchDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isCancelled) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // Start dragging if moved more than 10px
    if ((deltaX > 10 || deltaY > 10) && !isTouchDragging) {
      setIsTouchDragging(true);
      e.preventDefault(); // Prevent scrolling
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isCancelled) return;
    
    if (!isTouchDragging) {
      // If not dragging, treat as click
      onEditAppointment(appointment);
    }
    
    setIsTouchDragging(false);
  };

  // Hover event handlers
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={drag as any}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        p-1 rounded-md border-2 transition-all duration-200
        ${isCancelled 
          ? 'bg-gray-200 border-gray-400 text-gray-600 cursor-not-allowed opacity-60' 
          : `${getServiceCategoryColor(appointment.serviceCategory || 'Other')} cursor-pointer ${(isDragging || isTouchDragging) ? 'opacity-50 scale-95' : 'hover:shadow-md hover:scale-105'}`
        }
      `}
      style={{ 
        minHeight: '60px', 
        ...style,
        zIndex: isHovered ? 999 : (style?.zIndex || 10)
      }}
    >
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-medium text-xs truncate">
          {appointment.clientName || 'Unknown Client'}
          {appointment.isNewClient && (
            <span className="ml-1 px-1 py-0.5 bg-blue-500 text-white text-xs rounded">NEW</span>
          )}
          {isCancelled && (
            <span className="ml-1 px-1 py-0.5 bg-gray-500 text-white text-xs rounded">CANCELLED</span>
          )}
        </div>
        <div className="text-xs font-medium">
          {formatPrice(appointment.price || 0, currency)}
        </div>
      </div>
      
      {/* Services list */}
      <div className="mb-0.5">
        <div className="text-xs text-gray-600 mb-1">
          {appointment.services && appointment.services.length > 0 ? (
            <div className="space-y-0.5">
              {appointment.services.map((service, index) => (
                <div key={service.id} className="leading-tight text-xs">
                  {service.name}
                </div>
              ))}
            </div>
          ) : (
            <div className="leading-tight text-xs">
              {appointment.serviceName || 'Unknown Service'}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <div className={`
            px-1.5 py-0.5 rounded-full text-xs font-medium
            ${getStatusColor(appointment.status)}
          `}>
            {appointment.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 flex items-center">
        <span>{appointment.duration || 0} min</span>
        <span className="mx-1">•</span>
        <span className="flex items-center">
          <svg className={`mr-1 w-3 h-3 ${getStaffColor(appointment.staffName || 'Unknown Staff')}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className={getStaffColor(appointment.staffName || 'Unknown Staff')}>
            {appointment.staffName || 'Unknown Staff'}
          </span>
        </span>
      </div>
    </div>
  );
};

// Drop Zone Component
const DropZone: React.FC<{
  date: string;
  time: string;
  onDrop: (appointmentId: string, date: string, time: string) => void;
  onSlotClick?: (e: React.MouseEvent, date: string, time: string) => void;
  children: React.ReactNode;
  appointments: Appointment[];
  timeSlots: string[];
  filteredAppointments: Appointment[];
  isBusinessHours: (timeSlot: string, date: Date) => boolean;
}> = ({ date, time, onDrop, onSlotClick, children, appointments, timeSlots, filteredAppointments, isBusinessHours }) => {
  // Helper function to calculate appointment slots
  const getAppointmentSlots = (duration: number) => {
    return Math.ceil(duration / 15);
  };

  // Helper function to convert time to 24-hour format
  const convertTo24Hour = (time12: string) => {
    const [time, period] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours, 10);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  };

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { id: string; appointment: Appointment }) => {
      onDrop(item.id, date, time);
    },
    canDrop: (item: { id: string; appointment: Appointment }) => {
      // Don't allow drops to closed time slots
      return isBusinessHours(time, new Date(date));
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    })
  }));

  // Touch event handlers for mobile drop zones
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Check if we have a dragged appointment (this would be handled by the drag system)
    // For now, just handle the slot click
    if (onSlotClick) {
      // Convert touch event to mouse event for compatibility
      const mouseEvent = {
        ...e,
        clientX: e.changedTouches[0].clientX,
        clientY: e.changedTouches[0].clientY,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation()
      } as any;
      onSlotClick(mouseEvent, date, time);
    }
  };

  // Check if this time slot is during business hours for this specific date
  const isOpen = isBusinessHours(time, new Date(date));
  
  return (
    <div
      ref={drop as any}
      onClick={(e) => onSlotClick && onSlotClick(e, date, time)}
      onTouchEnd={handleTouchEnd}
      className={`
        h-[60px] p-1 border border-gray-200 transition-colors duration-200 relative overflow-visible
        ${isOpen 
          ? `cursor-pointer ${isOver ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`
          : 'bg-gray-100 border-gray-300 cursor-not-allowed'
        }
      `}
    >
      {children}
    </div>
  );
};

// Main Calendar Component
const DragDropCalendar: React.FC<DragDropCalendarProps> = ({
  appointments,
  selectedLocation,
  onMoveAppointment,
  onEditAppointment,
  onAddAppointment,
  onBlockTime,
  onEditBlockTime,
  currency,
  businessHours,
  showToast,
}) => {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    return today;
  });
  
  // Filter states
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-staff-filters');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  
  
  
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    time: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    date: '',
    time: ''
  });

  // Handle staff filter changes
  const handleStaffFilterChange = (staffName: string, checked: boolean) => {
    const newSelectedStaff = new Set(selectedStaff);
    if (checked) {
      newSelectedStaff.add(staffName);
    } else {
      newSelectedStaff.delete(staffName);
    }
    setSelectedStaff(newSelectedStaff);
    
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendar-staff-filters', JSON.stringify([...newSelectedStaff]));
    }
  };

  // Generate time slots (1 hour before earliest opening to 1 hour after latest closing)
  const timeSlots = useMemo(() => {
    const slots = [];
    
    // Find the earliest opening time and latest closing time across all days
    let earliestOpen = 23; // Start with latest possible hour
    let latestClose = 0; // Start with earliest possible hour
    
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    dayNames.forEach(day => {
      const dayHours = businessHours[day as keyof typeof businessHours];
      if (dayHours && dayHours.open && dayHours.close) {
        const openHour = parseInt(dayHours.open.split(':')[0]);
        const closeHour = parseInt(dayHours.close.split(':')[0]);
        
        if (openHour < earliestOpen) earliestOpen = openHour;
        if (closeHour > latestClose) latestClose = closeHour;
      }
    });
    
    // If no hours found, use defaults
    if (earliestOpen === 23) earliestOpen = 9;
    if (latestClose === 0) latestClose = 19;
    
    const startHour = earliestOpen - 1; // 1 hour before earliest opening
    const endHour = latestClose + 1; // 1 hour after latest closing
    
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:15`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
      slots.push(`${hour.toString().padStart(2, '0')}:45`);
    }
    
    return slots;
  }, [businessHours]);

  // Helper function to check if a time slot is during business hours for a specific date
  const isBusinessHours = (timeSlot: string, date: Date) => {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotTime = hours * 60 + minutes; // Convert to minutes
    
    // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    // Get the hours for this specific day
    const dayHours = businessHours[dayName as keyof typeof businessHours];
    
    // If no hours set for this day, consider it closed
    if (!dayHours || !dayHours.open || !dayHours.close) {
      return false;
    }
    
    const [openHours, openMinutes] = dayHours.open.split(':').map(Number);
    const openTime = openHours * 60 + openMinutes;
    
    const [closeHours, closeMinutes] = dayHours.close.split(':').map(Number);
    const closeTime = closeHours * 60 + closeMinutes;
    
    return slotTime >= openTime && slotTime < closeTime;
  };

  const weekDates = useMemo(() => {
    const dates = [];
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Start on Monday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  }, [currentWeek]);

  // Filter appointments by selected location, staff, and exclude cancelled appointments
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    
    
    // Always filter out cancelled appointments - they should not be visible
    filtered = filtered.filter(apt => apt.status !== 'cancelled');
    
    // Filter by location
    if (selectedLocation) {
      filtered = filtered.filter(apt => (apt as any).locationId === selectedLocation.id);
    }
    
    // Filter by staff (if any staff are selected)
    // If no staff are selected, show all staff. If staff are selected, show only those staff.
    if (selectedStaff.size > 0) {
      filtered = filtered.filter(apt => selectedStaff.has(apt.staffName || 'Unknown Staff'));
    }
    
    
    return filtered;
  }, [appointments, selectedLocation, selectedStaff]);

  // Helper function to convert time to 24-hour format
  const convertTo24Hour = (time: string) => {
    if (!time) return '';
    
    // If already in 24-hour format (no AM/PM), return as is
    if (!time.includes('AM') && !time.includes('PM')) {
      return time;
    }
    
    const [timePart, modifier] = time.split(' ');
    let [hours, minutes] = timePart.split(':');
    
    if (hours === '12') {
      hours = modifier === 'AM' ? '00' : '12';
    } else {
      hours = modifier === 'PM' ? String(parseInt(hours, 10) + 12) : hours;
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  // Handle drag and drop
  const handleDrop = useCallback((appointmentId: string, newDate: string, newTime: string) => {
    // Find the appointment being moved (use full appointments array, not filtered)
    const movingAppointment = appointments.find(apt => apt.id === appointmentId);
    if (!movingAppointment) {
      showToast('Appointment not found. Please refresh the page.', 'error');
      return;
    }

    // Use the existing timeSlots that are already generated
    // No need to regenerate them here
    const movingAppointmentSlots = Math.ceil((movingAppointment.duration || 60) / 15);
    const newTimeIndex = timeSlots.indexOf(newTime);
    
    if (newTimeIndex === -1) return;

    // Check if the new time slot and duration would conflict with existing appointments
    // Only check for conflicts with the same staff member and same location
    const hasConflict = appointments.some(apt => {
      // Skip checking against the appointment being moved
      if (apt.id === appointmentId) {
        return false; // Don't check against itself
      }
      
      // Skip cancelled appointments
      if (apt.status === 'cancelled') {
        return false;
      }
      
      // Skip appointments at different locations
      if (selectedLocation && (apt as any).locationId !== selectedLocation.id) {
        return false;
      }
      
      // Only check for conflicts with the same staff member
      if (apt.staffName !== movingAppointment.staffName) {
        return false; // Different staff members can have overlapping appointments
      }
      
      // Handle both Firestore Timestamp and regular Date objects
      let aptDate;
      if (apt.date?.toDate) {
        aptDate = apt.date.toDate();
      } else if (apt.date instanceof Date) {
        aptDate = apt.date;
      } else {
        aptDate = new Date(apt.date);
      }
      
      const aptDateString = aptDate.toISOString().split('T')[0];
      
      if (aptDateString !== newDate) return false; // Different dates, no conflict
      
      const aptTime24Hour = convertTo24Hour(apt.time);
      const aptTimeIndex = timeSlots.indexOf(aptTime24Hour);
      if (aptTimeIndex === -1) return false;
      
      const aptSlots = Math.ceil((apt.duration || 60) / 15);
      const aptBufferSlots = Math.ceil((apt.bufferTime || 0) / 15);
      
      // Check if the time ranges overlap (including buffer time)
      const movingEndIndex = newTimeIndex + movingAppointmentSlots;
      const aptEndIndex = aptTimeIndex + aptSlots + aptBufferSlots; // Include buffer time
      
      const hasTimeConflict = (newTimeIndex < aptEndIndex && movingEndIndex > aptTimeIndex);
      
      return hasTimeConflict;
    });

    if (hasConflict) {
      // Show a toast about the conflict with more details
      const conflictingAppointment = appointments.find(apt => {
        if (apt.id === appointmentId) return false;
        if (apt.staffName !== movingAppointment.staffName) return false;
        
        // Check if this appointment conflicts
        let aptDate;
        if (apt.date?.toDate) {
          aptDate = apt.date.toDate();
        } else if (apt.date instanceof Date) {
          aptDate = apt.date;
        } else {
          aptDate = new Date(apt.date);
        }
        
        const aptDateString = aptDate.toISOString().split('T')[0];
        if (aptDateString !== newDate) return false;
        
        const aptTime24Hour = convertTo24Hour(apt.time);
        const aptTimeIndex = timeSlots.indexOf(aptTime24Hour);
        if (aptTimeIndex === -1) return false;
        
        const aptSlots = Math.ceil((apt.duration || 60) / 15);
        const movingEndIndex = newTimeIndex + movingAppointmentSlots;
        const aptEndIndex = aptTimeIndex + aptSlots;
        
        return (newTimeIndex < aptEndIndex && movingEndIndex > aptTimeIndex);
      });
      
      const toastMessage = conflictingAppointment 
        ? `Cannot move ${movingAppointment.clientName}'s appointment - ${movingAppointment.staffName} already has an appointment at ${conflictingAppointment.time} (${conflictingAppointment.duration} min)`
        : `Cannot move ${movingAppointment.clientName}'s appointment - ${movingAppointment.staffName} has a scheduling conflict at ${newTime}`;
      
      showToast(toastMessage, 'error');
      return;
    }

    // Convert the time slot back to 12-hour format for consistency
    const convertTo12Hour = (time24: string) => {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}:${minutes} ${ampm}`;
    };
    
    const time12Hour = convertTo12Hour(newTime);
    
    onMoveAppointment(appointmentId, newDate, time12Hour);
  }, [onMoveAppointment, appointments, showToast]);

  // Handle context menu
  const handleSlotClick = (e: React.MouseEvent, date: string, time: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      date,
      time
    });
  };

  const handleContextMenuAction = (action: 'add' | 'block') => {
    if (action === 'add' && onAddAppointment) {
      onAddAppointment(contextMenu.date, contextMenu.time);
    } else if (action === 'block' && onBlockTime) {
      onBlockTime(contextMenu.date, contextMenu.time);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Close context menu when clicking elsewhere
  const handleClickOutside = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };



  // Get unique staff members from all appointments (not filtered)
  const getUniqueStaff = () => {
    const staffSet = new Set();
    appointments.forEach(apt => {
      if (apt.staffName && apt.staffName !== 'Unknown Staff') {
        staffSet.add(apt.staffName);
      }
    });
    return Array.from(staffSet) as string[];
  };

  const uniqueStaff = getUniqueStaff();



  // Get appointments for a specific date and time slot
  const getAppointmentsForSlot = (date: Date, timeSlot: string) => {
    const dateString = date.toISOString().split('T')[0];
    
    const matches = filteredAppointments.filter(apt => {
      // Handle both Firestore Timestamp and regular Date objects
      let aptDate;
      if (apt.date?.toDate) {
        aptDate = apt.date.toDate();
      } else if (apt.date instanceof Date) {
        aptDate = apt.date;
      } else {
        aptDate = new Date(apt.date);
      }
      
      const aptDateString = aptDate.toISOString().split('T')[0];
      const dateMatch = aptDateString === dateString;
      
      // Convert appointment time to 24-hour format for comparison
      const aptTime24Hour = convertTo24Hour(apt.time);
      const appointmentSlots = Math.ceil((apt.duration || 60) / 15);
      
      
      if (!dateMatch) return false;
      
      // Check if this time slot falls within the appointment's duration
      const timeSlotIndex = timeSlots.indexOf(timeSlot);
      let aptTimeIndex = timeSlots.indexOf(aptTime24Hour);
      
      // If exact time not found, find the closest time slot
      if (aptTimeIndex === -1) {
        
        // Find the closest time slot by converting to minutes and finding the nearest slot
        const [aptHours, aptMinutes] = aptTime24Hour.split(':').map(Number);
        const aptTotalMinutes = aptHours * 60 + aptMinutes;
        
        let closestIndex = -1;
        let minDifference = Infinity;
        
        for (let i = 0; i < timeSlots.length; i++) {
          const [slotHours, slotMinutes] = timeSlots[i].split(':').map(Number);
          const slotTotalMinutes = slotHours * 60 + slotMinutes;
          const difference = Math.abs(slotTotalMinutes - aptTotalMinutes);
          
          if (difference < minDifference) {
            minDifference = difference;
            closestIndex = i;
          }
        }
        
        if (closestIndex !== -1) {
          aptTimeIndex = closestIndex;
        } else {
          return false;
        }
      }
      
      // Check if current time slot is within the appointment's duration
      const isWithinDuration = timeSlotIndex >= aptTimeIndex && timeSlotIndex < aptTimeIndex + appointmentSlots;
      
      // Only return true if this is the starting time slot
      // This ensures appointments are only rendered once at their start time
      if (timeSlotIndex === aptTimeIndex) {
        return true;
      }
      
      return false;
    });
    
    return matches;
  };




  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  // Show empty state if no appointments (removed loading check - handled by parent)

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
            <div className="flex items-center justify-between lg:justify-start space-x-2 lg:space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Previous week"
              >
                ←
              </button>
              <h2 className="text-base lg:text-xl font-bold text-gray-900 text-center lg:text-left flex-1 min-w-0">
                <span className="block lg:inline">
                  {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="hidden lg:inline"> - </span>
                <span className="lg:hidden"> - </span>
                <span className="block lg:inline">
                  {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </h2>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Next week"
              >
                →
              </button>
            </div>
            <div className="text-xs lg:text-sm text-gray-600 text-center lg:text-right hidden lg:block">
              Drag appointments to reschedule
            </div>
          </div>
        </div>

            {/* Staff Filter */}
            {uniqueStaff.length > 0 && (
              <div className="mt-3 lg:mt-4 p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-wrap gap-2 lg:gap-4 items-center">
                  <span className="text-xs lg:text-sm font-medium text-gray-700 w-full lg:w-auto mb-1 lg:mb-0">Staff:</span>
                  {uniqueStaff.map((staffName) => (
                    <label key={staffName} className="flex items-center space-x-2 cursor-pointer px-2 lg:px-3 py-2 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={selectedStaff.has(staffName)}
                        onChange={(e) => handleStaffFilterChange(staffName, e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <svg 
                        className={`w-4 h-4 ${getStaffColor(staffName)}`}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs lg:text-sm text-gray-600">{staffName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

        {/* Calendar Grid */}
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <div className="min-w-[800px] lg:min-w-[1200px]">
            {/* Day Headers */}
            <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: 'minmax(70px, 90px) repeat(7, 1fr)' }}>
              <div className="p-2 lg:p-2 bg-gray-50 font-medium text-gray-700 text-xs lg:text-sm whitespace-nowrap text-center">Time</div>
              {weekDates.map((date, index) => (
                <div key={index} className="p-1.5 lg:p-2 bg-gray-50 text-center">
                  <div className="font-medium text-gray-900 text-xs lg:text-sm">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-xs lg:text-xs text-gray-600">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            {timeSlots.map((timeSlot, timeIndex) => (
              <div key={timeIndex} className="grid border-b border-gray-100" style={{ gridTemplateColumns: 'minmax(70px, 90px) repeat(7, 1fr)' }}>
                {/* Time Label */}
                <div className="p-1 lg:p-1 bg-gray-50 text-xs text-gray-600 font-medium whitespace-nowrap text-center">
                  {timeSlot}
                </div>
                
                {/* Day Columns */}
                {weekDates.map((date, dayIndex) => {
                  const slotAppointments = getAppointmentsForSlot(date, timeSlot);
                  return (
                    <DropZone
                      key={dayIndex}
                      date={date.toISOString().split('T')[0]}
                      time={timeSlot}
                      onDrop={handleDrop}
                      onSlotClick={handleSlotClick}
                      appointments={appointments}
                      timeSlots={timeSlots}
                      filteredAppointments={filteredAppointments}
                      isBusinessHours={isBusinessHours}
                    >
                      {slotAppointments.map((appointment) => {
                        // Only render the appointment in its starting slot
                        const aptTime24Hour = convertTo24Hour(appointment.time);
                        
                        // Find the closest time slot for the appointment (same logic as in getAppointmentsForSlot)
                        let aptTimeIndex = timeSlots.indexOf(aptTime24Hour);
                        if (aptTimeIndex === -1) {
                          // Find the closest time slot by converting to minutes and finding the nearest slot
                          const [aptHours, aptMinutes] = aptTime24Hour.split(':').map(Number);
                          const aptTotalMinutes = aptHours * 60 + aptMinutes;
                          
                          let closestIndex = -1;
                          let minDifference = Infinity;
                          
                          for (let i = 0; i < timeSlots.length; i++) {
                            const [slotHours, slotMinutes] = timeSlots[i].split(':').map(Number);
                            const slotTotalMinutes = slotHours * 60 + slotMinutes;
                            const difference = Math.abs(slotTotalMinutes - aptTotalMinutes);
                            
                            if (difference < minDifference) {
                              minDifference = difference;
                              closestIndex = i;
                            }
                          }
                          
                          if (closestIndex !== -1) {
                            aptTimeIndex = closestIndex;
                          }
                        }
                        
                        const currentTimeIndex = timeSlots.indexOf(timeSlot);
                        const isStartingSlot = currentTimeIndex === aptTimeIndex;
                        
                        if (!isStartingSlot) return null;
                        
                        const appointmentSlots = Math.ceil((appointment.duration || 60) / 15);
                        const slotHeight = 60; // Height of each slot in pixels
                        const appointmentHeight = Math.max(appointmentSlots * slotHeight - 16, 60); // Ensure minimum height of 60px
                        const bufferTime = appointment.bufferTime || 0;
                        const bufferSlots = bufferTime > 0 ? Math.ceil(bufferTime / 15) : 0;
                        const bufferHeight = bufferSlots * slotHeight - 16;
                        
                        
                        return (
                          <React.Fragment key={appointment.id}>
                            <DraggableAppointment
                              appointment={appointment}
                              currency={currency}
                              onEditAppointment={onEditAppointment}
                              style={{
                                height: `${appointmentHeight}px`,
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                right: '4px',
                                zIndex: 10
                              }}
                            />
                            {bufferTime > 0 && (
                              <div
                                style={{
                                  height: `${bufferHeight}px`,
                                  position: 'absolute',
                                  top: `${appointmentHeight + 8}px`,
                                  left: '4px',
                                  right: '4px',
                                  zIndex: 5
                                }}
                                className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-md p-1 flex items-center justify-center"
                              >
                                <span className="text-xs text-gray-500 font-medium">
                                  Buffer: {bufferTime} min
                                </span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </DropZone>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-900">
              {new Date(contextMenu.date).toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
              })}, {contextMenu.time}
            </div>
          </div>
          
          {/* Actions */}
          <div className="py-2">
            <button
              onClick={() => handleContextMenuAction('add')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Add appointment
            </button>
            <button
              onClick={() => handleContextMenuAction('block')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Add busy time
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close context menu */}
      {contextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleClickOutside}
        />
      )}
    </DndProvider>
  );
};

export default DragDropCalendar;
