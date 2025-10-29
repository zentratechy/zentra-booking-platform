import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Award loyalty points to a client based on appointment completion
 * @param businessId - The business ID
 * @param clientId - The client ID (or null if from booking page)
 * @param clientEmail - The client email (for finding client if no ID)
 * @param appointmentAmount - The amount paid for the appointment
 * @returns Promise<boolean> - Success status
 */
export async function awardLoyaltyPoints(
  businessId: string,
  clientId: string | null,
  clientEmail: string,
  appointmentAmount: number
): Promise<boolean> {
  try {
    // Get business loyalty settings
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists()) {
      console.error('Business not found');
      return false;
    }

    const businessData = businessDoc.data();
    const loyaltyProgram = businessData.loyaltyProgram;

    // Check if loyalty program is active
    console.log('🔍 Loyalty program check:', { loyaltyProgram, active: loyaltyProgram?.active });
    if (!loyaltyProgram?.active) {
      console.log('❌ Loyalty program is not active');
      return false;
    }

    // Get points per dollar setting (default to 1)
    const pointsPerDollar = loyaltyProgram.settings?.pointsPerDollar || 1;
    
    // Calculate points to award
    const pointsToAward = Math.floor(appointmentAmount * pointsPerDollar);
    console.log('💰 Points calculation:', { appointmentAmount, pointsPerDollar, pointsToAward });

    if (pointsToAward <= 0) {
      console.log('❌ No points to award');
      return false;
    }

    // If we have clientId, update that client
    if (clientId) {
      await updateDoc(doc(db, 'clients', clientId), {
        loyaltyPoints: increment(pointsToAward),
      });
      console.log(`✅ Awarded ${pointsToAward} points to client ${clientId}`);
      return true;
    }

    // If no clientId but we have email, try to find client
    if (clientEmail) {
      // This would require a query, but for now we'll skip
      console.log('Client ID required to award points');
      return false;
    }

    return false;
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
    return false;
  }
}

/**
 * Get client's loyalty tier based on points
 * @param points - The number of loyalty points
 * @returns Tier name
 */
export function getLoyaltyTier(points: number): 'Bronze' | 'Silver' | 'Gold' {
  if (points >= 300) return 'Gold';
  if (points >= 100) return 'Silver';
  return 'Bronze';
}

/**
 * Get discount percentage for a loyalty tier
 * @param tier - The loyalty tier
 * @returns Discount percentage
 */
export function getTierDiscount(tier: 'Bronze' | 'Silver' | 'Gold'): number {
  switch (tier) {
    case 'Gold':
      return 15;
    case 'Silver':
      return 10;
    case 'Bronze':
      return 5;
    default:
      return 0;
  }
}

/**
 * Award referral bonus points to referrer and referee
 * @param businessId - The business ID
 * @param referrerId - The client ID who made the referral
 * @param refereeId - The client ID who was referred (the new customer)
 * @returns Promise<boolean> - Success status
 */
export async function awardReferralPoints(
  businessId: string,
  referrerId: string,
  refereeId: string
): Promise<boolean> {
  try {
    // Get business loyalty settings
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists()) {
      console.error('Business not found');
      return false;
    }

    const businessData = businessDoc.data();
    const loyaltyProgram = businessData.loyaltyProgram;

    // Check if loyalty program is active
    if (!loyaltyProgram?.active) {
      console.log('Loyalty program is not active, skipping referral bonus');
      return false;
    }

    // Get referral bonus points (default to 100)
    const referralBonus = loyaltyProgram.settings?.referralBonus || 100;

    if (referralBonus <= 0) {
      console.log('Referral bonus is set to 0, skipping');
      return false;
    }

    // Award points to referrer (the person who shared the link)
    try {
      await updateDoc(doc(db, 'clients', referrerId), {
        loyaltyPoints: increment(referralBonus),
      });
      console.log(`✅ Awarded ${referralBonus} referral bonus points to referrer ${referrerId}`);
    } catch (error) {
      console.error('Error awarding points to referrer:', error);
      // Continue to award to referee even if referrer fails
    }

    // Award points to referee (the new customer who was referred)
    try {
      await updateDoc(doc(db, 'clients', refereeId), {
        loyaltyPoints: increment(referralBonus),
      });
      console.log(`✅ Awarded ${referralBonus} referral bonus points to referee ${refereeId}`);
    } catch (error) {
      console.error('Error awarding points to referee:', error);
      // Don't fail the whole operation if referee fails
    }

    return true;
  } catch (error) {
    console.error('Error awarding referral points:', error);
    return false;
  }
}


