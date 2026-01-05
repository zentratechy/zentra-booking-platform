import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Resend } from 'resend';
import { generateBirthdayBonusEmail } from '@/lib/emailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    console.log('🎂 Starting birthday bonus check...');
    
    const today = new Date();
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;
    
    // Get all businesses with active loyalty programs
    const businessesQuery = query(
      collection(db, 'businesses'),
      where('loyaltyProgram.active', '==', true)
    );
    const businessesSnapshot = await getDocs(businessesQuery);
    
    let totalProcessed = 0;
    let totalAwarded = 0;
    
    for (const businessDoc of businessesSnapshot.docs) {
      const businessData = businessDoc.data();
      const businessId = businessDoc.id;
      
      if (!businessData.loyaltyProgram?.settings?.birthdayBonus) continue;
      
      const birthdayBonus = businessData.loyaltyProgram.settings.birthdayBonus;
      
      // Get clients with birthdays today
      const clientsQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', businessId),
        where('birthday', '!=', null)
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      
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
            const lastAward = new Date(lastBirthdayAward.toDate ? lastBirthdayAward.toDate() : lastBirthdayAward);
            if (lastAward.getFullYear() === today.getFullYear()) {
              continue; // Already awarded this year
            }
          }
          
          try {
            // Award birthday bonus points
            await updateDoc(doc(db, 'clients', clientDoc.id), {
              loyaltyPoints: (clientData.loyaltyPoints || 0) + birthdayBonus,
              lastBirthdayAward: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            
            // Send birthday bonus email
            const emailHtml = generateBirthdayBonusEmail({
              clientName: clientData.name,
              pointsAwarded: birthdayBonus,
              businessName: businessData.businessName || businessData.name,
            }, {
              logo: businessData.emailSettings?.logo || businessData.logo,
              businessName: businessData.businessName || businessData.name,
              businessPhone: businessData.phone,
              businessEmail: businessData.email,
              businessAddress: businessData.address,
              colorScheme: businessData.colorScheme || 'classic'
            });
            
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
    
    return NextResponse.json({ 
      success: true, 
      message: `${totalAwarded} birthday bonuses awarded across ${totalProcessed} businesses`,
      totalAwarded,
      totalProcessed 
    });
  } catch (error: any) {
    console.error('❌ Error in birthday bonus cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}










