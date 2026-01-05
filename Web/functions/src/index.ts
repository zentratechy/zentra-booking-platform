import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { generateDailyReminderEmail, generateBirthdayBonusEmail } from './emailTemplates';
// import { voucherPaymentWebhook } from './webhooks/voucher-payment';

// Initialize Firebase Admin
admin.initializeApp();

const resend = new Resend(process.env.RESEND_API_KEY || functions.config().resend?.api_key || 're_placeholder');

// Scheduled function that runs every hour to check for businesses that need reminders
export const sendDailyReminders = functions.pubsub
  .schedule('0 * * * *') // Every hour at minute 0
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('🔔 Starting hourly reminder check...');

    try {
      const db = admin.firestore();
      
      // Get current UTC time
      const now = new Date();
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      
      console.log(`⏰ Current UTC time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
      
      // Get all businesses with reminders enabled
      const businessesSnapshot = await db.collection('businesses').get();
      
      const businesses = businessesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((business: any) => business.dailyReminders?.enabled);

      console.log(`📊 Found ${businesses.length} businesses with reminders enabled`);

      let totalEmailsSent = 0;

      for (const business of businesses) {
        try {
          const businessData = business as any;
          const recipientEmail = businessData.email;
          
          if (!recipientEmail) {
            console.log(`⚠️ No email for business ${businessData.businessName}`);
            continue;
          }

          // Check if this business should receive reminders at this hour
          const sendTime = businessData.dailyReminders?.sendTime || '18:00'; // Default to 6 PM
          const [sendHour] = sendTime.split(':').map(Number);
          
          // Only send if current hour matches the business's send time
          if (currentHour !== sendHour) {
            console.log(`⏭️ Skipping ${businessData.businessName} - send time is ${sendTime}, current time is ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
            continue;
          }
          
          console.log(`✅ Processing ${businessData.businessName} - send time matches (${sendTime})`);

          // Calculate tomorrow's date range
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          const dayAfterTomorrow = new Date(tomorrow);
          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

          // Fetch tomorrow's appointments
          const appointmentsSnapshot = await db
            .collection('appointments')
            .where('businessId', '==', businessData.id)
            .get();
          
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
            console.log(`📅 No appointments for ${businessData.businessName} tomorrow`);
            continue;
          }

          // Get staff member email if specified
          let recipientStaffEmail = recipientEmail;
          if (businessData.dailyReminders?.recipientStaffId && 
              businessData.dailyReminders?.recipientStaffId !== businessData.id) {
            const staffDoc = await db
              .collection('staff')
              .doc(businessData.dailyReminders.recipientStaffId)
              .get();
            
            if (staffDoc.exists) {
              const staffData = staffDoc.data();
              recipientStaffEmail = staffData?.email || recipientEmail;
            }
          }

          // Prepare business settings for branding
          const businessSettings = {
            logo: businessData.emailSettings?.logo || businessData.logo,
            signature: businessData.emailSettings?.signature,
            footerText: businessData.emailSettings?.footerText,
            businessName: businessData.businessName || businessData.name,
            businessPhone: businessData.phone,
            businessEmail: businessData.email,
            businessAddress: businessData.address,
            colorScheme: businessData.colorScheme || 'classic'
          };

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
          await resend.emails.send({
            from: 'Zentra <noreply@mail.zentrabooking.com>',
            to: [recipientStaffEmail],
            subject: `Tomorrow's Appointments - ${businessData.businessName}`,
            html: emailHtml,
            replyTo: 'support@mail.zentrabooking.com',
          });

          console.log(`✅ Sent reminder to ${businessData.businessName} (${tomorrowAppointments.length} appointments)`);
          totalEmailsSent++;

        } catch (businessError: any) {
          console.error(`❌ Error processing business ${business.id}:`, businessError);
        }
      }

      console.log(`🎉 Daily reminders complete! Sent ${totalEmailsSent} emails`);
      return null;

    } catch (error: any) {
      console.error('❌ Error in daily reminders function:', error);
      throw error;
    }
  });

// Scheduled function that runs daily at 9 AM UTC to award birthday bonuses
export const sendBirthdayBonuses = functions.pubsub
  .schedule('0 9 * * *') // Every day at 9:00 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('🎂 Starting birthday bonus check...');

    try {
      const db = admin.firestore();
      
      const today = new Date();
      const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;
      
      // Get all businesses with active loyalty programs
      const businessesSnapshot = await db
        .collection('businesses')
        .where('loyaltyProgram.active', '==', true)
        .get();
      
      let totalProcessed = 0;
      let totalAwarded = 0;
      
      for (const businessDoc of businessesSnapshot.docs) {
        const businessData = businessDoc.data();
        const businessId = businessDoc.id;
        
        if (!businessData.loyaltyProgram?.settings?.birthdayBonus) continue;
        
        const birthdayBonus = businessData.loyaltyProgram.settings.birthdayBonus;
        
        // Get clients with birthdays
        const clientsSnapshot = await db
          .collection('clients')
          .where('businessId', '==', businessId)
          .get();
        
        for (const clientDoc of clientsSnapshot.docs) {
          const clientData = clientDoc.data();
          if (!clientData.birthday || !clientData.email) continue;
          
          // Check if birthday is today
          const birthday = new Date(clientData.birthday);
          const birthdayStr = `${birthday.getMonth() + 1}-${birthday.getDate()}`;
          
          if (birthdayStr === todayStr) {
            // Check if already awarded this year
            const lastBirthdayAward = clientData.lastBirthdayAward;
            if (lastBirthdayAward) {
              const lastAward = lastBirthdayAward.toDate ? lastBirthdayAward.toDate() : new Date(lastBirthdayAward);
              if (lastAward.getFullYear() === today.getFullYear()) {
                continue; // Already awarded this year
              }
            }
            
            try {
              // Award birthday bonus points
              await clientDoc.ref.update({
                loyaltyPoints: admin.firestore.FieldValue.increment(birthdayBonus),
                lastBirthdayAward: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              
              // Send birthday bonus email
              const businessSettings = {
                logo: businessData.emailSettings?.logo || businessData.logo,
                businessName: businessData.businessName || businessData.name,
                businessPhone: businessData.phone,
                businessEmail: businessData.email,
                businessAddress: businessData.address,
                colorScheme: businessData.colorScheme || 'classic'
              };
              
              const emailHtml = generateBirthdayBonusEmail({
                clientName: clientData.name,
                pointsAwarded: birthdayBonus,
                businessName: businessData.businessName || businessData.name,
              }, businessSettings);
              
              await resend.emails.send({
                from: `${businessData.businessName || businessData.name} <noreply@mail.zentrabooking.com>`,
                to: [clientData.email],
                subject: `🎂 Happy Birthday! You've earned ${birthdayBonus} loyalty points!`,
                html: emailHtml,
                replyTo: businessData.email || 'support@mail.zentrabooking.com',
              });
              
              totalAwarded++;
              console.log(`🎂 Birthday bonus awarded to ${clientData.name} (${clientData.email})`);
            } catch (error) {
              console.error(`❌ Error awarding birthday bonus to ${clientData.name}:`, error);
            }
          }
        }
        
        totalProcessed++;
      }
      
      console.log(`✅ Birthday bonus check complete: ${totalAwarded} bonuses awarded across ${totalProcessed} businesses`);
      return null;

    } catch (error: any) {
      console.error('❌ Error in birthday bonus function:', error);
      throw error;
    }
  });

// Scheduled function that runs daily at 2 AM UTC to expire loyalty points
export const expireLoyaltyPoints = functions.pubsub
  .schedule('0 2 * * *') // Every day at 2:00 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('⏰ Starting loyalty points expiration check...');

    try {
      const db = admin.firestore();
      
      // Get all businesses with active loyalty programs
      const businessesSnapshot = await db
        .collection('businesses')
        .where('loyaltyProgram.active', '==', true)
        .get();
      
      let totalProcessed = 0;
      let totalExpired = 0;
      
      for (const businessDoc of businessesSnapshot.docs) {
        const businessData = businessDoc.data();
        const businessId = businessDoc.id;
        
        if (!businessData.loyaltyProgram?.settings?.expirationMonths) continue;
        
        const expirationMonths = businessData.loyaltyProgram.settings.expirationMonths;
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() - expirationMonths);
        
        // Get clients with points
        const clientsSnapshot = await db
          .collection('clients')
          .where('businessId', '==', businessId)
          .where('loyaltyPoints', '>', 0)
          .get();
        
        for (const clientDoc of clientsSnapshot.docs) {
          const clientData = clientDoc.data();
          
          // Check if client has been inactive for the expiration period
          const lastVisit = clientData.lastVisit;
          if (lastVisit) {
            const lastVisitDate = lastVisit.toDate ? lastVisit.toDate() : new Date(lastVisit);
            
            if (lastVisitDate < expirationDate) {
              try {
                // Expire points
                await clientDoc.ref.update({
                  loyaltyPoints: 0,
                  pointsExpired: admin.firestore.FieldValue.increment(clientData.loyaltyPoints || 0),
                  lastExpiration: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                
                totalExpired++;
                console.log(`⏰ Expired ${clientData.loyaltyPoints} points for ${clientData.name} (${clientData.email})`);
              } catch (error) {
                console.error(`❌ Error expiring points for ${clientData.name}:`, error);
              }
            }
          }
        }
        
        totalProcessed++;
      }
      
      console.log(`✅ Points expiration check complete: ${totalExpired} points expired across ${totalProcessed} businesses`);
      return null;

    } catch (error: any) {
      console.error('❌ Error in points expiration function:', error);
      throw error;
    }
  });

// Export the webhook function
// Temporarily disabled due to module loading issues
// export { voucherPaymentWebhook };
