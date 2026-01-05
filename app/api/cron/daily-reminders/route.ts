import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Initialize Resend lazily to avoid build-time errors
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export async function GET(request: Request) {
  try {
    console.log('🔔 Starting daily appointment reminders cron job...');

    // Verify the request is from Vercel Cron (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all businesses with reminders enabled
    const businessesQuery = query(collection(db, 'businesses'));
    const businessesSnapshot = await getDocs(businessesQuery);
    
    const businesses = businessesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((business: any) => business.dailyReminders?.enabled);

    console.log(`📊 Found ${businesses.length} businesses with reminders enabled`);

    let totalEmailsSent = 0;
    const results = [];

    for (const business of businesses) {
      try {
        const businessData = business as any;
        const recipientEmail = businessData.email; // Business owner email
        
        if (!recipientEmail) {
          console.log(`⚠️ No email for business ${businessData.businessName}`);
          continue;
        }

        // Calculate tomorrow's date range
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        // Fetch tomorrow's appointments
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('businessId', '==', businessData.id)
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
            // Sort by time
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
            return timeA.localeCompare(timeB);
          });

        if (tomorrowAppointments.length === 0) {
          console.log(`📅 No appointments for ${businessData.businessName} tomorrow`);
          continue;
        }

        // Get staff member email if specified
        let recipientStaffEmail = recipientEmail;
        if (businessData.dailyReminders?.recipientStaffId && 
            businessData.dailyReminders?.recipientStaffId !== businessData.id) {
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

        // Generate email HTML
        const emailHtml = generateDailyReminderEmail(
          businessData.businessName,
          tomorrow,
          tomorrowAppointments as any[],
          businessData.currency || 'usd'
        );

        // Send email
        const resend = getResend();
        const emailResult = await resend.emails.send({
          from: 'Zentra <noreply@mail.zentrabooking.com>',
          to: [recipientStaffEmail],
          subject: `Tomorrow's Appointments - ${businessData.businessName}`,
          html: emailHtml,
          replyTo: 'support@mail.zentrabooking.com',
        });

        console.log(`✅ Sent reminder to ${businessData.businessName} (${tomorrowAppointments.length} appointments)`);
        totalEmailsSent++;
        
        results.push({
          business: businessData.businessName,
          appointments: tomorrowAppointments.length,
          recipient: recipientStaffEmail,
          success: true
        });

      } catch (businessError: any) {
        console.error(`❌ Error processing business ${business.id}:`, businessError);
        results.push({
          business: (business as any).businessName,
          success: false,
          error: businessError.message
        });
      }
    }

    console.log(`🎉 Daily reminders complete! Sent ${totalEmailsSent} emails`);

    return NextResponse.json({
      success: true,
      totalBusinesses: businesses.length,
      emailsSent: totalEmailsSent,
      results
    });

  } catch (error: any) {
    console.error('❌ Error in daily reminders cron:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send daily reminders' },
      { status: 500 }
    );
  }
}

function generateDailyReminderEmail(
  businessName: string,
  tomorrowDate: Date,
  appointments: any[],
  currency: string
): string {
  const formatPrice = (price: number) => {
    const symbols: { [key: string]: string } = {
      usd: '$', gbp: '£', eur: '€', cad: 'C$', aud: 'A$'
    };
    const symbol = symbols[currency.toLowerCase()] || '$';
    return `${symbol}${price.toFixed(2)}`;
  };

  const dateString = tomorrowDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0);

  const appointmentRows = appointments.map(apt => `
    <tr style="border-bottom: 1px solid #e5e5e5;">
      <td style="padding: 15px 10px; color: #333333; font-size: 14px;">${apt.time}</td>
      <td style="padding: 15px 10px; color: #333333; font-size: 14px; font-weight: 500;">${apt.clientName}</td>
      <td style="padding: 15px 10px; color: #333333; font-size: 14px;">${apt.serviceName}</td>
      <td style="padding: 15px 10px; color: #333333; font-size: 14px;">${apt.staffName || 'Any Staff'}</td>
      <td style="padding: 15px 10px; color: #333333; font-size: 14px; text-align: right;">${formatPrice(apt.price || 0)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tomorrow's Appointments</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f7;">
      <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B7355 0%, #A8B5A0 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Tomorrow's Schedule</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${dateString}</p>
        </div>
        
        <!-- Summary -->
        <div style="padding: 30px; background-color: #f9f9f9; border-bottom: 2px solid #e5e5e5;">
          <div style="display: flex; justify-content: space-around; text-align: center;">
            <div>
              <div style="font-size: 32px; font-weight: 700; color: #8B7355; margin-bottom: 5px;">${appointments.length}</div>
              <div style="font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Appointments</div>
            </div>
            <div>
              <div style="font-size: 32px; font-weight: 700; color: #A8B5A0; margin-bottom: 5px;">${formatPrice(totalRevenue)}</div>
              <div style="font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Expected Revenue</div>
            </div>
          </div>
        </div>
        
        <!-- Appointments Table -->
        <div style="padding: 30px;">
          <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Appointment Schedule</h2>
          
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f9f9f9;">
                <th style="padding: 15px 10px; text-align: left; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Time</th>
                <th style="padding: 15px 10px; text-align: left; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Client</th>
                <th style="padding: 15px 10px; text-align: left; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Service</th>
                <th style="padding: 15px 10px; text-align: left; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Staff</th>
                <th style="padding: 15px 10px; text-align: right; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${appointmentRows}
            </tbody>
          </table>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
          <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
            ${businessName} - Daily Appointment Reminder
          </p>
          <p style="color: #999999; font-size: 12px; margin: 0;">
            Sent via Zentra Booking System
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}









