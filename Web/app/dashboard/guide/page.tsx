'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function GuideContent() {
  const { colorScheme } = useTheme();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);

  // Fetch business name and pre-fill form if user is logged in
  useEffect(() => {
    if (user) {
      const fetchBusinessData = async () => {
        try {
          const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
          if (businessDoc.exists()) {
            const businessData = businessDoc.data();
            setBusinessName(businessData.businessName || null);
            // Pre-fill form with user's information
            setFormData(prev => ({
              ...prev,
              name: businessData.businessName || businessData.ownerName || user.email?.split('@')[0] || '',
              email: user.email || '',
            }));
          } else {
            // Still pre-fill email if available
            if (user.email) {
              setFormData(prev => ({
                ...prev,
                email: user.email || '',
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching business data:', error);
          // Still pre-fill email if available
          if (user.email) {
            setFormData(prev => ({
              ...prev,
              email: user.email || '',
            }));
          }
        }
      };
      fetchBusinessData();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/support/create-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          businessId: user?.uid || null,
          businessName: businessName || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Support ticket created successfully! We\'ll get back to you soon.', 'success');
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
        });
      } else {
        showToast('Failed to create ticket: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      showToast('Failed to create ticket. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />
      
      <div className="ml-64 flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Zentra User Guide</h1>
          <p className="text-gray-600 mb-8">Learn how to use all the features of Zentra to manage your business effectively.</p>

          {/* Table of Contents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Table of Contents</h2>
            <ul className="space-y-2 text-gray-700">
              <li><a href="#dashboard" className="hover:underline" style={{ color: colorScheme.colors.primary }}>1. Dashboard Overview</a></li>
              <li><a href="#calendar" className="hover:underline" style={{ color: colorScheme.colors.primary }}>2. Calendar & Appointments</a></li>
              <li><a href="#staff" className="hover:underline" style={{ color: colorScheme.colors.primary }}>3. Staff Management</a></li>
              <li><a href="#services" className="hover:underline" style={{ color: colorScheme.colors.primary }}>4. Services Management</a></li>
              <li><a href="#clients" className="hover:underline" style={{ color: colorScheme.colors.primary }}>5. Client Management</a></li>
              <li><a href="#payments" className="hover:underline" style={{ color: colorScheme.colors.primary }}>6. Payments</a></li>
              <li><a href="#loyalty" className="hover:underline" style={{ color: colorScheme.colors.primary }}>7. Loyalty Program</a></li>
              <li><a href="#consultations" className="hover:underline" style={{ color: colorScheme.colors.primary }}>8. Digital Consultations</a></li>
              <li><a href="#aftercare" className="hover:underline" style={{ color: colorScheme.colors.primary }}>9. Aftercare Documents</a></li>
              <li><a href="#settings" className="hover:underline" style={{ color: colorScheme.colors.primary }}>10. Settings</a></li>
            </ul>
          </div>

          {/* Dashboard Section */}
          <section id="dashboard" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">1. Dashboard Overview</h2>
            <p className="text-gray-700 mb-4">
              Your dashboard is the central hub for your business. It provides a quick overview of your key metrics and today's activities.
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Key Features:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li><strong>Today's Appointments:</strong> View all appointments scheduled for today with client names, times, and services</li>
              <li><strong>Quick Stats:</strong> See total appointments, revenue, and client count at a glance</li>
              <li><strong>Revenue Tracking:</strong> Monitor your daily, weekly, and monthly revenue</li>
              <li><strong>Quick Actions:</strong> Fast access to create appointments, add clients, or view the calendar</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> The dashboard updates in real-time, so you'll always see the latest information about your business.
              </p>
            </div>
          </section>

          {/* Calendar Section */}
          <section id="calendar" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">2. Calendar & Appointments</h2>
            <p className="text-gray-700 mb-4">
              The calendar is where you manage all your appointments. You can view, create, edit, and reschedule appointments with ease.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Creating Appointments:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>Click the <strong>"+ New Appointment"</strong> button or click on any time slot in the calendar</li>
              <li>Search for or add a new client</li>
              <li>Select a service (grouped by category for easy navigation)</li>
              <li>Choose a location and staff member (auto-selected if you only have one)</li>
              <li>Set the date and time</li>
              <li>Add buffer time if needed (extra time after the appointment)</li>
              <li>Add any notes and set payment status</li>
              <li>Click <strong>"Create Appointment"</strong></li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Editing Appointments:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Click on any appointment in the calendar to open the edit modal</li>
              <li>Update any details (service, time, staff, payment status, etc.)</li>
              <li>Click <strong>"Update Appointment"</strong> to save changes</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Rescheduling Appointments:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Drag and drop appointments to different time slots or dates</li>
              <li>The system will check for conflicts and notify you if there are any</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Busy Time (Blocked Time):</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Right-click on a time slot or use the context menu to add busy time</li>
              <li>Block time for lunch breaks, meetings, or when staff are unavailable</li>
              <li>Set recurring busy time (daily, weekly, or monthly)</li>
              <li>Click on any busy time block to edit or delete it</li>
              <li>Use <strong>"Delete All Recurring"</strong> to remove all occurrences of a recurring busy time</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Filtering:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Use the staff dropdown to filter appointments by staff member</li>
              <li>Use the category dropdown to filter by service category</li>
              <li>Filters are saved automatically and persist across sessions</li>
            </ul>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-green-800">
                <strong>✨ Pro Tip:</strong> Closed days (like Sundays) will show all time slots greyed out. You can set your business hours in Settings.
              </p>
            </div>
          </section>

          {/* Staff Section */}
          <section id="staff" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">3. Staff Management</h2>
            <p className="text-gray-700 mb-4">
              Manage your team members, assign them to services, and track their performance.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Adding Staff:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>Click <strong>"+ Add Staff Member"</strong></li>
              <li>Enter their name, email, and phone number</li>
              <li>Assign them to specific services they can perform</li>
              <li>Choose a color for them (used on the calendar for visual identification)</li>
              <li>Click <strong>"Add Staff"</strong></li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Editing Staff:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Click on any staff member card to edit their details</li>
              <li>Update their information, service assignments, or color</li>
              <li>Click <strong>"Update Staff"</strong> to save changes</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Staff Colors:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Each staff member can have a custom color assigned</li>
              <li>This color appears on the calendar to quickly identify which staff member has appointments</li>
              <li>Choose from preset colors or use a custom hex color</li>
            </ul>
          </section>

          {/* Services Section */}
          <section id="services" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">4. Services Management</h2>
            <p className="text-gray-700 mb-4">
              Create and manage your service catalog with pricing, duration, and categories.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Service Categories:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Create custom categories to organize your services (e.g., "Facial & Skincare", "Massage", "Nails")</li>
              <li>Assign a color to each category for visual organization</li>
              <li>Categories appear in the service dropdown when creating appointments</li>
              <li>Edit or delete categories (you can't delete categories that are in use)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Adding Services:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>Click <strong>"+ Add Service"</strong></li>
              <li>Enter the service name, price, and duration</li>
              <li>Select a category (or create a new one)</li>
              <li>Optionally enable deposit requirements with a percentage</li>
              <li>Add buffer time if needed (extra time after the service)</li>
              <li>Click <strong>"Add Service"</strong></li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Deposits:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Enable deposits for services that require upfront payment</li>
              <li>Set a deposit percentage (e.g., 30% of the service price)</li>
              <li>When clients book, they can choose to pay the deposit or full amount</li>
              <li>The remaining balance is tracked in the appointment</li>
            </ul>
          </section>

          {/* Clients Section */}
          <section id="clients" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">5. Client Management</h2>
            <p className="text-gray-700 mb-4">
              Manage your client database, track their history, and monitor loyalty points.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Adding Clients:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>Click <strong>"+ Add Client"</strong></li>
              <li>Enter their name, email, and phone number</li>
              <li>Click <strong>"Add Client"</strong></li>
              <li>Clients can also be added automatically when they book online</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Client Search:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Use the search bar to quickly find clients by name or email</li>
              <li>Click on a client card to view their full details</li>
              <li>View their appointment history and loyalty points</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Loyalty Points:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Clients automatically earn loyalty points when they complete appointments</li>
              <li>Points are tracked per client and displayed on their profile</li>
              <li>Membership tiers (Bronze, Silver, Gold) are automatically assigned based on points</li>
            </ul>
          </section>

          {/* Payments Section */}
          <section id="payments" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">6. Payments</h2>
            <p className="text-gray-700 mb-4">
              Track payments, send payment links, and manage deposits.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Recording Payments:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Click on any appointment to view payment details</li>
              <li>Record payments manually (cash, card, bank transfer, or voucher)</li>
              <li>Update payment status (pending, partial, paid, refunded)</li>
              <li>Track deposits and remaining balances</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Payment Links:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Send payment links to clients via email</li>
              <li>Clients can pay online using the secure payment link</li>
              <li>Payment status updates automatically when payment is received</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Payment Provider Setup:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Connect Stripe or Square in Settings to enable online payments</li>
              <li>Once connected, you can accept card payments online</li>
              <li>All payments go directly to your connected account</li>
            </ul>
          </section>

          {/* Loyalty Section */}
          <section id="loyalty" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">7. Loyalty Program</h2>
            <p className="text-gray-700 mb-4">
              Reward your clients with a points-based loyalty program.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">How It Works:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Clients automatically earn points when they complete appointments</li>
              <li>Points are based on the appointment value (configurable in settings)</li>
              <li>Membership tiers unlock automatically as clients earn more points</li>
              <li>Clients can redeem points for rewards (if configured)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Membership Tiers:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li><strong>Bronze:</strong> Entry level (0+ points)</li>
              <li><strong>Silver:</strong> Mid tier (configurable threshold)</li>
              <li><strong>Gold:</strong> Top tier (configurable threshold)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Referral Program:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Enable referrals in Settings to reward clients for bringing in new customers</li>
              <li>Both the referrer and new client can earn bonus points</li>
              <li>Referral links are automatically included in booking confirmation emails</li>
            </ul>
          </section>

          {/* Consultations Section */}
          <section id="consultations" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">8. Digital Consultations</h2>
            <p className="text-gray-700 mb-4">
              Schedule and manage virtual consultations with your clients.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Scheduling Consultations:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Create consultation appointments just like regular appointments</li>
              <li>Clients receive a link to join the video consultation</li>
              <li>Track consultation history and client notes</li>
            </ul>
          </section>

          {/* Aftercare Section */}
          <section id="aftercare" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">9. Aftercare Documents</h2>
            <p className="text-gray-700 mb-4">
              Send personalized aftercare instructions to clients after their appointments.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Using Aftercare:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>When editing an appointment, select an aftercare template</li>
              <li>Click <strong>"Send Aftercare Document"</strong> to email it to the client</li>
              <li>Aftercare documents are sent as branded HTML emails</li>
              <li>Create and manage aftercare templates in the Aftercare section</li>
            </ul>
          </section>

          {/* Settings Section */}
          <section id="settings" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">10. Settings</h2>
            <p className="text-gray-700 mb-4">
              Configure your business settings, payment providers, and automated features.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Business Information:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Update your business name, address, and contact information</li>
              <li>Upload your business logo</li>
              <li>Set your business hours for each day of the week</li>
              <li>Mark days as closed (they'll appear greyed out on the calendar)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Payment Providers:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Connect Stripe or Square to accept online payments</li>
              <li>Follow the connection flow to link your payment account</li>
              <li>Once connected, clients can pay online when booking</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Daily Appointment Reminders:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Enable automatic daily reminders to receive tomorrow's schedule</li>
              <li>Choose which staff member should receive the reminder</li>
              <li>Set the time (in UTC) when reminders are sent</li>
              <li>Use the test button to send a reminder immediately</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Email Settings:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Configure email templates and branding</li>
              <li>Customize booking confirmation emails</li>
              <li>Set up automated email notifications</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Loyalty Program Settings:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Configure points earning rates</li>
              <li>Set membership tier thresholds</li>
              <li>Enable or disable referral rewards</li>
              <li>Create reward catalog items</li>
            </ul>
          </section>

          {/* Tips Section */}
          <section className="rounded-xl shadow-sm border p-8 mb-8" style={{ 
            background: `linear-gradient(to right, ${colorScheme.colors.primary}15, ${colorScheme.colors.primary}08)`,
            borderColor: `${colorScheme.colors.primary}33`
          }}>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">💡 Pro Tips</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <span>Use service categories to keep your service list organized and easy to navigate</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <span>Assign colors to staff members and categories for quick visual identification on the calendar</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <span>Set up recurring busy time for regular breaks or meetings to prevent double-booking</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <span>Use buffer time on services to account for cleanup or preparation time</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <span>Enable deposits on high-value services to secure bookings</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <span>Filter the calendar by staff or category to focus on specific views</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <span>Drag and drop appointments to quickly reschedule without opening the edit modal</span>
              </li>
            </ul>
          </section>

          {/* Support Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-700 mb-4">
              If you have questions or need assistance, please submit a support ticket below or refer to this guide.
            </p>

            {/* Support Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Please provide as much detail as possible about your question or issue..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{ 
                  backgroundColor: submitting ? '#9ca3af' : colorScheme.colors.primary 
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Support Ticket'}
              </button>
            </form>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-800">
                <strong>📧 Support Email:</strong> support@zentrabooking.com<br />
                <strong>⏱️ Response Time:</strong> We typically respond within 24 hours during business days.
              </p>
            </div>
          </section>
          
          <ToastContainer />
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <ProtectedRoute>
      <GuideContent />
    </ProtectedRoute>
  );
}

