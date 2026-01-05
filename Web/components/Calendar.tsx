'use client';

import { useState } from 'react';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  appointments: any[];
}

export default function Calendar({ selectedDate, onDateSelect, appointments }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Generate calendar days
  const calendarDays: (number | null)[] = [];
  
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get appointments for a specific day
  const getAppointmentsForDay = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    const dayAppointments = appointments.filter(apt => {
      const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
      const aptDateStr = aptDate.toISOString().split('T')[0];
      return aptDateStr === dateStr;
    });
    
    // Debug: Show what dates we're checking
    
    
    return dayAppointments;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg font-medium transition-colors"
          >
            Today
          </button>
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dayAppointments = getAppointmentsForDay(day);
          const hasAppointments = dayAppointments.length > 0;

          return (
            <button
              key={day}
              onClick={() => {
                const newDate = new Date(year, month, day);
                setCurrentMonth(newDate);
                onDateSelect(newDate);
              }}
              className={`
                aspect-square p-2 rounded-lg border-2 transition-all relative
                ${isSelected(day) 
                  ? 'border-primary bg-primary text-white font-bold shadow-md' 
                  : isToday(day)
                  ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
                  : 'border-gray-200 hover:border-primary/30 hover:bg-soft-pink/30'
                }
              `}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span className={isSelected(day) ? 'text-white' : ''}>{day}</span>
                {hasAppointments && (
                  <div className="flex justify-center space-x-0.5 mt-1">
                    {dayAppointments.slice(0, 3).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected(day) ? 'bg-white' : 'bg-primary'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {dayAppointments.length > 0 && (
                <div className={`absolute top-1 right-1 text-xs font-bold ${
                  isSelected(day) ? 'text-white' : 'text-primary'
                }`}>
                  {dayAppointments.length}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
          <span className="text-gray-600">Has Appointments</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full border-2 border-primary mr-2"></div>
          <span className="text-gray-600">Today</span>
        </div>
      </div>
    </div>
  );
}


