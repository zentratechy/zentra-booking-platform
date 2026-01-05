import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateEmailTemplate } from '@/lib/emailTemplates';

// Initialize Resend lazily to avoid build-time errors
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

// This is a test endpoint to manually trigger client reminders
// Can be called from Settings page or directly
export async function POST(request: NextRequest) {
  console.log('🧪 [ENTRY] Manual test: Sending client appointment reminders...');
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('📝 Route file loaded and executing');
  try {

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (jsonError: any) {
      console.error('❌ Error parsing request JSON:', jsonError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { businessId } = requestBody;

    if (!businessId) {
      console.error('❌ No businessId provided');
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    console.log('📋 Business ID:', businessId);

    // Get business data
    let businessDoc;
    try {
      businessDoc = await getDoc(doc(db, 'businesses', businessId));
    } catch (docError: any) {
      console.error('❌ Error fetching business document:', docError);
      return NextResponse.json({ error: `Failed to fetch business: ${docError.message}` }, { status: 500 });
    }

    if (!businessDoc.exists()) {
      console.error('❌ Business document does not exist:', businessId);
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = businessDoc.data() as any;
    console.log('📋 Business data loaded, clientReminders:', businessData.clientReminders);
    
    if (!businessData.clientReminders?.enabled) {
      return NextResponse.json({ 
        error: 'Client reminders are not enabled for this business' 
      }, { status: 400 });
    }

    const daysBefore = businessData.clientReminders?.daysBefore || 1;
    console.log(`\n========== STARTING DATE CALCULATION ==========`);
    console.log(`⚙️ Client reminders settings: daysBefore = ${daysBefore}, enabled = ${businessData.clientReminders?.enabled}`);

    // Calculate target date (appointments happening in X days)
    const today = new Date();
    console.log(`📅 Today (raw): ${today.toISOString()}`);
    console.log(`📅 Today (formatted): ${today.toLocaleDateString('en-GB')}`);
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);
    targetDate.setHours(0, 0, 0, 0);

    console.log(`📅 Target date (after calculation): ${targetDate.toISOString()}`);
    console.log(`📅 Target date (formatted): ${targetDate.toLocaleDateString('en-GB')}`);
    console.log(`📅 Target date (ISO string): ${targetDate.toISOString().split('T')[0]}`);
    console.log(`📅 This is ${daysBefore} day${daysBefore !== 1 ? 's' : ''} from today`);

    // Fetch appointments for this business
    let appointmentsSnapshot;
    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('businessId', '==', businessId)
      );
      appointmentsSnapshot = await getDocs(appointmentsQuery);
      console.log(`📋 Found ${appointmentsSnapshot.docs.length} total appointments for business`);
    } catch (queryError: any) {
      console.error('❌ Error fetching appointments:', queryError);
      return NextResponse.json({ error: `Failed to fetch appointments: ${queryError.message}` }, { status: 500 });
    }
    
    // Log ALL appointments to see what we're working with
    console.log('\n📋 ALL APPOINTMENTS FOR THIS BUSINESS:');
    const allAppointmentsData = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Group appointments by date
    const appointmentsByDate: { [key: string]: any[] } = {};
    
    allAppointmentsData.forEach((apt: any) => {
      try {
        let aptDate: Date;
        if (apt.date?.toDate && typeof apt.date.toDate === 'function') {
          aptDate = apt.date.toDate();
        } else if (apt.date) {
          aptDate = new Date(apt.date);
        } else {
          console.log(`  ❌ Appointment ${apt.id}: No date field`);
          return;
        }
        
        if (isNaN(aptDate.getTime())) {
          console.log(`  ❌ Appointment ${apt.id}: Invalid date`);
          return;
        }
        
        const dateKey = aptDate.toISOString().split('T')[0];
        if (!appointmentsByDate[dateKey]) {
          appointmentsByDate[dateKey] = [];
        }
        appointmentsByDate[dateKey].push({
          id: apt.id,
          date: aptDate,
          status: apt.status,
          clientName: apt.clientName,
          clientEmail: apt.clientEmail,
          serviceName: apt.serviceName,
          time: apt.time,
          reminderSent: apt.reminderSent
        });
      } catch (e) {
        console.log(`  ❌ Appointment ${apt.id}: Error processing - ${e}`);
      }
    });
    
    // Show appointments grouped by date
    const targetDateKey = targetDate.toISOString().split('T')[0];
    console.log(`\n🎯 APPOINTMENTS ON TARGET DATE (${targetDateKey}):`);
    const targetDayAppointments = appointmentsByDate[targetDateKey] || [];
    console.log(`   Found ${targetDayAppointments.length} appointment(s) on target date`);
    
    targetDayAppointments.forEach((apt: any) => {
      const aptDateISO = apt.date.toISOString().split('T')[0];
      const targetDateISO = targetDate.toISOString().split('T')[0];
      const datesMatch = aptDateISO === targetDateISO;
      
      console.log(`   📍 ${apt.id}:`);
      console.log(`      - Appointment date (ISO): ${aptDateISO}`);
      console.log(`      - Target date (ISO): ${targetDateISO}`);
      console.log(`      - Dates match: ${datesMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`      - Status: ${apt.status}`);
      console.log(`      - Time: ${apt.time}`);
      console.log(`      - Client: ${apt.clientName} (${apt.clientEmail ? apt.clientEmail : 'NO EMAIL'})`);
      console.log(`      - Service: ${apt.serviceName}`);
      console.log(`      - Reminder Sent: ${apt.reminderSent || false}`);
      
      const willBeIncluded = datesMatch && 
                             apt.status !== 'cancelled' && 
                             apt.status !== 'completed' && 
                             !apt.reminderSent && 
                             apt.clientEmail;
      
      console.log(`      - Will be included: ${willBeIncluded ? '✅ YES' : '❌ NO'}`);
      if (!datesMatch) {
        console.log(`         Reason: Date doesn't match (${aptDateISO} vs ${targetDateISO})`);
      }
      if (apt.status === 'cancelled' || apt.status === 'completed') {
        console.log(`         Reason: Status is "${apt.status}"`);
      }
      if (apt.reminderSent) {
        console.log(`         Reason: Reminder already sent`);
      }
      if (!apt.clientEmail) {
        console.log(`         Reason: No client email`);
      }
    });
    
    // Also show other dates for context
    console.log(`\n📅 APPOINTMENTS ON OTHER DATES (for reference):`);
    Object.keys(appointmentsByDate)
      .filter(dateKey => dateKey !== targetDateKey)
      .sort()
      .forEach(dateKey => {
        console.log(`   ${dateKey}: ${appointmentsByDate[dateKey].length} appointment(s)`);
      });
    
      // Filter for target date appointments that haven't been cancelled and haven't received a reminder
      console.log(`🔍 Debugging appointment filtering...`);
      console.log(`📅 Target date: ${targetDate.toISOString()} (${targetDate.toLocaleDateString('en-GB')})`);
      
      const allAppointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`📋 Total appointments to check: ${allAppointments.length}`);
      
      // Debug: log all appointment dates near the target
      allAppointments.forEach((apt: any) => {
        try {
          let aptDate: Date;
          if (apt.date?.toDate && typeof apt.date.toDate === 'function') {
            aptDate = apt.date.toDate();
          } else if (apt.date) {
            aptDate = new Date(apt.date);
          } else {
            console.log(`  ⚠️ Appointment ${apt.id}: No date`);
            return;
          }
          
          if (isNaN(aptDate.getTime())) {
            console.log(`  ⚠️ Appointment ${apt.id}: Invalid date`);
            return;
          }
          
          aptDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.round((aptDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Only log appointments within 3 days of target
          if (Math.abs(daysDiff) <= 3) {
            console.log(`  📍 Appointment ${apt.id}: ${aptDate.toLocaleDateString('en-GB')} (${daysDiff} days from target), status: ${apt.status}, reminderSent: ${apt.reminderSent}, clientEmail: ${apt.clientEmail ? 'yes' : 'no'}`);
          }
        } catch (e) {
          // Skip
        }
      });
      
      const targetAppointments = allAppointments.filter((apt: any) => {
          try {
            let aptDate: Date;
            if (apt.date?.toDate && typeof apt.date.toDate === 'function') {
              aptDate = apt.date.toDate();
            } else if (apt.date) {
              aptDate = new Date(apt.date);
            } else {
              return false; // Skip appointments without dates
            }
            
            if (isNaN(aptDate.getTime())) {
              return false;
            }
            
            aptDate.setHours(0, 0, 0, 0);
            
            const dateMatch = aptDate.getTime() === targetDate.getTime();
            const statusOk = apt.status !== 'cancelled' && apt.status !== 'completed';
            const noReminder = !apt.reminderSent;
            const hasEmail = !!apt.clientEmail;
            
            if (!dateMatch) return false;
            if (!statusOk) {
              console.log(`  ❌ Appointment ${apt.id} filtered out: status = ${apt.status}`);
              return false;
            }
            if (!noReminder) {
              console.log(`  ❌ Appointment ${apt.id} filtered out: reminderSent = ${apt.reminderSent}`);
              return false;
            }
            if (!hasEmail) {
              console.log(`  ❌ Appointment ${apt.id} filtered out: no clientEmail`);
              return false;
            }
            
            return true;
          } catch (e) {
            console.warn(`⚠️ Error processing appointment ${apt.id} in filter:`, e);
            return false;
          }
        })
      .sort((a: any, b: any) => {
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });

    if (targetAppointments.length === 0) {
      const noAppointmentsResponse = { 
        success: true,
        message: `No appointments need reminders for ${targetDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        appointments: 0,
        emailsSent: 0,
        targetDateISO: targetDate.toISOString().split('T')[0],
        daysBefore: daysBefore,
        debug: {
          totalAppointmentsFound: appointmentsSnapshot.docs.length,
          targetDateKey: targetDate.toISOString().split('T')[0],
          appointmentsByDateKeys: Object.keys(appointmentsByDate || {}),
        }
      };
      console.log('\n========== NO APPOINTMENTS RESPONSE ==========');
      console.log(JSON.stringify(noAppointmentsResponse, null, 2));
      console.log('===============================================\n');
      return NextResponse.json(noAppointmentsResponse);
    }

    console.log(`✉️ Found ${targetAppointments.length} appointment(s) to remind`);

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


    let emailsSent = 0;
    const results = [];

    // Send reminder email for each appointment
    for (const appointment of targetAppointments) {
      try {
        const apt = appointment as any;
        const clientEmail = apt.clientEmail;
        
        if (!clientEmail) {
          console.log(`⚠️ Skipping appointment ${apt.id} - no client email`);
          continue;
        }

        // Prepare appointment data for email template
        let appointmentDate: Date;
        try {
          if (apt.date?.toDate && typeof apt.date.toDate === 'function') {
            appointmentDate = apt.date.toDate();
          } else if (apt.date) {
            appointmentDate = new Date(apt.date);
          } else {
            throw new Error('No date found in appointment');
          }
          
          if (isNaN(appointmentDate.getTime())) {
            throw new Error('Invalid date in appointment');
          }
        } catch (dateError: any) {
          console.error(`❌ Invalid date for appointment ${apt.id}:`, dateError);
          results.push({ appointmentId: apt.id, success: false, error: `Invalid date: ${dateError.message}` });
          continue;
        }
        
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
          locationName: apt.locationName || '',
          businessName: businessSettings.businessName || 'Your Business',
          businessPhone: businessSettings.businessPhone,
          businessEmail: businessSettings.businessEmail,
          businessAddress: apt.locationAddress || businessSettings.businessAddress || '',
          totalPrice: apt.price || 0,
          currency: businessData.currency || 'GBP',
          notes: apt.notes || '',
          businessId: businessId, // Use the parameter, not businessData.id
          clientId: apt.clientId,
          appointmentId: apt.id,
        };

        // Generate reminder email (inline to avoid webpack bundling issues)
        let emailHtml: string;
        try {
          // Generate the reminder email HTML inline (same logic as generateAppointmentReminderEmail)
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
              ${appointmentData.totalPrice ? `
              <div class="detail-row">
                <div class="detail-label">Price</div>
                <div class="detail-value">${new Intl.NumberFormat('en-GB', {
                  style: 'currency',
                  currency: appointmentData.currency || 'GBP',
                }).format(appointmentData.totalPrice)}</div>
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
          
          emailHtml = generateEmailTemplate('Appointment Reminder', content, businessSettings, appointmentData);
          
          if (!emailHtml || typeof emailHtml !== 'string') {
            throw new Error(`Generated HTML is invalid: ${typeof emailHtml}`);
          }
          console.log(`📧 Generated email HTML for ${clientEmail}, length: ${emailHtml.length}`);
        } catch (templateError: any) {
          console.error(`❌ Error generating email template for appointment ${apt.id}:`, templateError);
          console.error(`❌ Template error stack:`, templateError.stack);
          results.push({ appointmentId: apt.id, success: false, error: `Template error: ${templateError.message}` });
          continue;
        }

        // Send email
        const resend = getResend();
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: `${businessSettings.businessName || 'Zentra'} <noreply@mail.zentrabooking.com>`,
          replyTo: businessSettings.businessEmail || 'support@mail.zentrabooking.com',
          to: [clientEmail],
          subject: `🔔 Reminder: Your appointment is ${daysBefore} day${daysBefore !== 1 ? 's' : ''} away - ${businessSettings.businessName}`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`❌ Error sending reminder to ${clientEmail}:`, emailError);
          results.push({ clientEmail, success: false, error: emailError });
          continue;
        }

        // Mark reminder as sent in Firestore
        await updateDoc(doc(db, 'appointments', apt.id), {
          reminderSent: true,
          reminderSentAt: Timestamp.now(),
        });

        console.log(`✅ Reminder sent to ${clientEmail} for appointment on ${formattedDate} at ${apt.time}`);
        emailsSent++;
        results.push({ clientEmail, success: true, appointmentId: apt.id });

      } catch (aptError: any) {
        const appointmentId = (appointment as any)?.id || 'unknown';
        console.error(`❌ Error processing appointment ${appointmentId}:`, aptError);
        results.push({ appointmentId, success: false, error: aptError?.message || String(aptError) });
      }
    }

    const responseData = {
      success: true,
      message: `Sent ${emailsSent} reminder email(s)`,
      appointments: targetAppointments.length,
      emailsSent: emailsSent,
      date: targetDate.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      targetDateISO: targetDate.toISOString().split('T')[0],
      daysBefore: daysBefore,
      results,
      debug: {
        totalAppointmentsFound: appointmentsSnapshot.docs.length,
        targetDateKey: targetDate.toISOString().split('T')[0],
        appointmentsByDateKeys: Object.keys(appointmentsByDate || {}),
      }
    };
    
    console.log('\n========== FINAL RESPONSE ==========');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('=====================================\n');
    
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('❌ [CATCH] Error sending test client reminders:', error);
    console.error('❌ [CATCH] Error type:', typeof error);
    console.error('❌ [CATCH] Error name:', error?.name);
    console.error('❌ [CATCH] Error message:', error?.message);
    console.error('❌ [CATCH] Error stack:', error?.stack);
    
    // Try to stringify error details
    let errorDetails = 'Unknown error';
    try {
      errorDetails = JSON.stringify({
        name: error?.name,
        message: error?.message,
        stack: error?.stack?.substring(0, 500), // Limit stack trace length
      }, null, 2);
    } catch (stringifyError) {
      errorDetails = String(error);
    }
    
    console.error('❌ [CATCH] Error details:', errorDetails);
    
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to send test reminders',
        errorType: error?.name || typeof error,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

