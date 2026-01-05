import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateEmailTemplate, generateDailyReminderEmail } from '@/lib/emailTemplates';

// Initialize Resend lazily to avoid build-time errors
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

// This is a test endpoint to manually trigger daily reminders
// Can be called from Settings page or directly
export async function POST(request: Request) {
  try {
    console.log('🧪 Manual test: Sending daily appointment reminders...');

    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Get business data
    const businessDoc = await getDocs(query(
      collection(db, 'businesses'),
      where('__name__', '==', businessId)
    ));

    if (businessDoc.empty) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = { id: businessDoc.docs[0].id, ...businessDoc.docs[0].data() } as any;
    
    if (!businessData.dailyReminders?.enabled) {
      return NextResponse.json({ 
        error: 'Daily reminders are not enabled for this business' 
      }, { status: 400 });
    }

    const recipientEmail = businessData.email;
    
    if (!recipientEmail) {
      return NextResponse.json({ error: 'No email configured' }, { status: 400 });
    }

    // Calculate tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Fetch tomorrow's appointments
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('businessId', '==', businessId)
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    
    // Filter for tomorrow's appointments
    const tomorrowAppointments = appointmentsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((apt: any) => {
        const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === tomorrow.getTime() && 
               apt.status !== 'cancelled';
      })
      .sort((a: any, b: any) => {
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });

    if (tomorrowAppointments.length === 0) {
      return NextResponse.json({ 
        message: 'No appointments scheduled for tomorrow',
        appointments: 0
      });
    }

    // Get staff member email if specified
    let recipientStaffEmail = recipientEmail;
    if (businessData.dailyReminders?.recipientStaffId && 
        businessData.dailyReminders?.recipientStaffId !== businessId) {
      const staffQuery = query(
        collection(db, 'staff'),
        where('__name__', '==', businessData.dailyReminders.recipientStaffId)
      );
      const staffSnapshot = await getDocs(staffQuery);
      if (!staffSnapshot.empty) {
        const staffData = staffSnapshot.docs[0].data();
        recipientStaffEmail = staffData.email || recipientEmail;
      }
    }

    // Fetch business settings for branding
    let businessSettings = {};
    try {
      businessSettings = {
        logo: businessData.emailSettings?.logo || businessData.logo,
        signature: businessData.emailSettings?.signature,
        footerText: businessData.emailSettings?.footerText,
        businessName: businessData.businessName || businessData.name,
        businessPhone: businessData.phone,
        businessEmail: businessData.email,
        businessAddress: businessData.address,
        colorScheme: businessData.colorScheme || 'classic'
      };
    } catch (error) {
      console.error('❌ Error preparing business settings:', error);
    }

    // Generate email HTML using new template system
    const reminderData = {
      businessName: businessData.businessName || businessData.name,
      tomorrowDate: tomorrow,
      appointments: tomorrowAppointments as any[],
      currency: businessData.currency || 'usd',
      totalRevenue: tomorrowAppointments.reduce((sum, apt) => sum + ((apt as any).payment?.price || 0), 0)
    };

    const emailHtml = generateDailyReminderEmail(reminderData, businessSettings);

    // Send email
        const resend = getResend();
        const emailResult = await resend.emails.send({
      from: 'Zentra <noreply@mail.zentrabooking.com>',
      to: [recipientStaffEmail],
      subject: `Tomorrow's Appointments - ${businessData.businessName}`,
      html: emailHtml,
      replyTo: 'support@mail.zentrabooking.com',
    });

    console.log(`✅ Test reminder sent successfully:`, emailResult);

    return NextResponse.json({
      success: true,
      recipient: recipientStaffEmail,
      appointments: tomorrowAppointments.length,
      date: tomorrow.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      }),
      emailId: emailResult.data?.id
    });

  } catch (error: any) {
    console.error('❌ Error sending test reminder:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test reminder' },
      { status: 500 }
    );
  }
}


