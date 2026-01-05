import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    console.log('⏰ Starting loyalty points expiration check...');
    
    const now = new Date();
    
    // Get all businesses with active loyalty programs
    const businessesQuery = query(
      collection(db, 'businesses'),
      where('loyaltyProgram.active', '==', true)
    );
    const businessesSnapshot = await getDocs(businessesQuery);
    
    let totalProcessed = 0;
    let totalExpired = 0;
    
    for (const businessDoc of businessesSnapshot.docs) {
      const businessData = businessDoc.data();
      const businessId = businessDoc.id;
      
      if (!businessData.loyaltyProgram?.settings?.expirationMonths) continue;
      
      const expirationMonths = businessData.loyaltyProgram.settings.expirationMonths;
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() - expirationMonths);
      
      // Get clients with points older than expiration period
      const clientsQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', businessId),
        where('loyaltyPoints', '>', 0)
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      
      for (const clientDoc of clientsSnapshot.docs) {
        const clientData = clientDoc.data();
        
        // Check if client has been inactive for the expiration period
        const lastVisit = clientData.lastVisit;
        if (lastVisit) {
          const lastVisitDate = lastVisit.toDate ? lastVisit.toDate() : new Date(lastVisit);
          
          if (lastVisitDate < expirationDate) {
            try {
              // Expire points
              await updateDoc(doc(db, 'clients', clientDoc.id), {
                loyaltyPoints: 0,
                pointsExpired: (clientData.pointsExpired || 0) + (clientData.loyaltyPoints || 0),
                lastExpiration: serverTimestamp(),
                updatedAt: serverTimestamp(),
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
    
    return NextResponse.json({ 
      success: true, 
      message: `${totalExpired} points expired across ${totalProcessed} businesses`,
      totalExpired,
      totalProcessed 
    });
  } catch (error: any) {
    console.error('❌ Error in points expiration cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}










