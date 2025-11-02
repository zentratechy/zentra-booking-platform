import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateEmailTemplate } from '@/lib/emailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    console.log('🔔 Starting client appointment reminders cron job...');

    // Verify the request is from Vercel Cron (optional security check)
    // Allow manual testing via ?test=true query parameter
    const url = new URL(request.url);
    const isTestMode = url.searchParams.get('test') === 'true';
    
    if (!isTestMode) {
      const authHeader = request.headers.get('authorization');
      if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('❌ Unauthorized cron request');
        return NextResponse.json({ 
          error: 'Unauthorized',
          message: 'This endpoint requires authorization. Add ?test=true for manual testing or use the test endpoint at /api/test/send-client-reminders'
        }, { status: 401 });
      }
    } else {
      console.log('🧪 Manual test mode enabled via ?test=true');
    }

    // Get all businesses with client reminders enabled
    const businessesQuery = query(collection(db, 'businesses'));
    const businessesSnapshot = await getDocs(businessesQuery);
    
    const businesses = businessesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((business: any) => business.clientReminders?.enabled);

    console.log(`📊 Found ${businesses.length} businesses with client reminders enabled`);

    let totalEmailsSent = 0;
    const results = [];

    for (const business of businesses) {
      try {
        const businessData = business as any;
        const daysBefore = businessData.clientReminders?.daysBefore || 1;

        // Calculate target date (appointments happening in X days)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysBefore);
        targetDate.setHours(0, 0, 0, 0);

        const dayAfterTarget = new Date(targetDate);
        dayAfterTarget.setDate(dayAfterTarget.getDate() + 1);

        console.log(`📅 Looking for appointments on ${targetDate.toISOString().split('T')[0]} (${daysBefore} day${daysBefore !== 1 ? 's' : ''} from now)`);

        // Fetch appointments for this business
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('businessId', '==', business.id) // Use business.id from the loop
        );
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        
        // Filter for target date appointments that haven't been cancelled and haven't received a reminder
        const targetAppointments = appointmentsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((apt: any) => {
            const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
            aptDate.setHours(0, 0, 0, 0);
            
            // Only process confirmed/pending appointments that haven't been cancelled
            // and haven't already received a reminder
            return aptDate.getTime() === targetDate.getTime() && 
                   apt.status !== 'cancelled' &&
                   apt.status !== 'completed' &&
                   !apt.reminderSent && // Check if reminder already sent
                   apt.clientEmail; // Must have client email
          })
          .sort((a: any, b: any) => {
            // Sort by time
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
            return timeA.localeCompare(timeB);
          });

        if (targetAppointments.length === 0) {
          console.log(`📭 No appointments need reminders for ${businessData.businessName}`);
          continue;
        }

        console.log(`✉️ Found ${targetAppointments.length} appointment(s) to remind for ${businessData.businessName}`);

        // Get business settings for email branding
        const businessSettings = {
          logo: businessData.emailSettings?.logo || businessData.logo,
          signature: businessData.emailSettings?.signature,
          footerText: businessData.emailSettings?.footerText,
          businessName: businessData.businessName || businessData.name,
          businessPhone: businessData.phone,
          businessEmail: businessData.email,
          businessAddress: businessData.address,
          colorScheme: businessData.colorScheme || 'classic',
          loyaltyProgram: businessData.loyaltyProgram || {},
        };

        let businessEmailsSent = 0;

        // Send reminder email for each appointment
        for (const appointment of targetAppointments) {
          const apt = appointment as any;
          const appointmentId = apt.id;
          try {
            const clientEmail = apt.clientEmail;
            
            if (!clientEmail) {
              console.log(`⚠️ Skipping appointment ${apt.id} - no client email`);
              continue;
            }

            // Prepare appointment data for email template
            const appointmentDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
            const formattedDate = appointmentDate.toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            const appointmentData = {
              customerName: apt.clientName || 'Valued Guest',
              appointmentDate: formattedDate,
              appointmentTime: apt.time || 'TBD',
              serviceName: apt.serviceName || 'Service',
              staffName: apt.staffName || 'TBD',
              locationName: apt.locationName,
              locationAddress: apt.locationAddress,
              price: apt.price || 0,
              currency: businessData.currency || 'GBP',
              notes: apt.notes || '',
              businessId: business.id, // Use business.id from the loop
              clientId: apt.clientId,
              appointmentId: apt.id,
            };

            // Generate reminder email (inline to avoid webpack bundling issues)
            const reminderText = daysBefore === 1 
              ? 'tomorrow' 
              : daysBefore === 7 
                ? 'in one week' 
                : `in ${daysBefore} days`;

            const content = `
              <p style="font-size: 18px; margin-bottom: 25px; font-family: Georgia, serif;">
                Dear <strong style="color: #8b7355;">${appointmentData.customerName}</strong>,
              </p>
              
              <div class="divider"></div>
              
              <p style="font-size: 16px; margin-bottom: 25px; font-style: italic; text-align: center; color: #8b7355;">
                This is a friendly reminder that you have an upcoming appointment ${reminderText}.
              </p>

              <div class="appointment-card">
                <div style="text-align: center; margin-bottom: 25px;">
                  <div style="font-size: 12px; color: #8b7355; margin-bottom: 15px; letter-spacing: 3px; font-weight: 300; text-transform: uppercase;">Your Appointment</div>
                  <div style="font-size: 26px; font-weight: 300; color: #2c2c2c; margin-bottom: 12px; font-family: Georgia, serif;">
                    ${appointmentData.appointmentDate}
                  </div>
                  <div style="font-size: 18px; color: #8b7355; font-weight: 300;">
                    ${appointmentData.appointmentTime}
                  </div>
                </div>
              </div>

              <div class="appointment-details">
                <div class="detail-row">
                  <div class="detail-label">Service</div>
                  <div class="detail-value">${appointmentData.serviceName}</div>
                </div>
                ${appointmentData.staffName ? `
                <div class="detail-row">
                  <div class="detail-label">Staff Member</div>
                  <div class="detail-value">${appointmentData.staffName}</div>
                </div>
                ` : ''}
                ${appointmentData.locationName ? `
                <div class="detail-row">
                  <div class="detail-label">Location</div>
                  <div class="detail-value">${appointmentData.locationName}</div>
                </div>
                ` : ''}
                ${appointmentData.price ? `
                <div class="detail-row">
                  <div class="detail-label">Price</div>
                  <div class="detail-value">${new Intl.NumberFormat('en-GB', {
                    style: 'currency',
                    currency: appointmentData.currency || 'GBP',
                  }).format(appointmentData.price)}</div>
                </div>
                ` : ''}
                ${appointmentData.notes ? `
                <div class="detail-row">
                  <div class="detail-label">Notes</div>
                  <div class="detail-value">${appointmentData.notes}</div>
                </div>
                ` : ''}
              </div>

              ${appointmentData.businessId ? `
              <div style="text-align: center; margin: 35px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://zentrabooking.com'}/my-bookings?businessId=${appointmentData.businessId}" 
                   class="cta-button">
                  View or Manage Booking
                </a>
              </div>
              ` : ''}

              <div class="divider"></div>

              <p style="font-size: 15px; color: #8b7355; margin-top: 35px; text-align: center; font-style: italic;">
                We look forward to seeing you ${reminderText === 'tomorrow' ? 'tomorrow' : 'soon'}!
              </p>
              
              <p style="font-size: 14px; color: #666666; margin-top: 25px; text-align: center; line-height: 1.8;">
                If you need to reschedule or cancel, please contact us as soon as possible.
              </p>
            `;
            
            const emailHtml = generateEmailTemplate('Appointment Reminder', content, businessSettings, appointmentData);

            // Send email
            const { data: emailData, error: emailError } = await resend.emails.send({
              from: `${businessSettings.businessName || 'Zentra'} <noreply@mail.zentrabooking.com>`,
              replyTo: businessSettings.businessEmail || 'support@mail.zentrabooking.com',
              to: [clientEmail],
              subject: `🔔 Reminder: Your appointment is ${daysBefore} day${daysBefore !== 1 ? 's' : ''} away - ${businessSettings.businessName}`,
              html: emailHtml,
            });

            if (emailError) {
              console.error(`❌ Error sending reminder to ${clientEmail}:`, emailError);
              continue;
            }

            // Mark reminder as sent in Firestore
            await updateDoc(doc(db, 'appointments', apt.id), {
              reminderSent: true,
              reminderSentAt: Timestamp.now(),
            });

            console.log(`✅ Reminder sent to ${clientEmail} for appointment on ${formattedDate} at ${apt.time}`);
            businessEmailsSent++;
            totalEmailsSent++;

          } catch (aptError: any) {
            console.error(`❌ Error processing appointment ${appointmentId}:`, aptError);
            continue;
          }
        }

        results.push({
          businessId: business.id, // Use business.id from the loop
          businessName: businessData.businessName || businessData.name,
          emailsSent: businessEmailsSent,
          appointments: targetAppointments.length,
        });

      } catch (businessError: any) {
        console.error(`❌ Error processing business ${business.id}:`, businessError);
        continue;
      }
    }

    console.log(`✅ Client reminder cron job completed. Total emails sent: ${totalEmailsSent}`);

    return NextResponse.json({
      success: true,
      totalEmailsSent,
      businessesProcessed: results.length,
      results,
    });

  } catch (error: any) {
    console.error('❌ Error in client reminders cron job:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process client reminders' },
      { status: 500 }
    );
  }
}

