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
    if (!loyaltyProgram?.active) {
      return false;
    }

    // Get points per dollar setting (default to 1)
    const pointsPerDollar = loyaltyProgram.settings?.pointsPerDollar || 1;
    
    // Calculate points to award
    const pointsToAward = Math.floor(appointmentAmount * pointsPerDollar);

    if (pointsToAward <= 0) {
      return false;
    }

    // If we have clientId, update that client
    if (clientId) {
      await updateDoc(doc(db, 'clients', clientId), {
        loyaltyPoints: increment(pointsToAward),
      });
      return true;
    }

    // If no clientId but we have email, try to find client
    if (clientEmail) {
      // This would require a query, but for now we'll skip
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
 * Award referral bonus points to referrer (the person who shared the link)
 * Note: The referee gets their normal loyalty points from completing the appointment,
 * but does NOT get bonus referral points - only the referrer gets the referral bonus
 * @param businessId - The business ID
 * @param referrerId - The client ID who made the referral
 * @param refereeId - The client ID who was referred (used for logging/validation only)
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
      return false;
    }

    // Check if referral bonuses are enabled
    const referralEnabled = (loyaltyProgram.settings?.referral?.enabled ?? loyaltyProgram.settings?.referralEnabled ?? true) === true;
    if (!referralEnabled) {
      return false;
    }

    // Get referral bonus points (default to 100)
    const referralBonus = (loyaltyProgram.settings?.referral?.points ?? loyaltyProgram.settings?.referralBonus) || 100;

    if (referralBonus <= 0) {
      return false;
    }

    // Award points to referrer (the person who shared the link)
    // Note: The referee gets their normal loyalty points from completing the appointment,
    // but does NOT get bonus referral points - only the referrer gets the referral bonus
    try {
      await updateDoc(doc(db, 'clients', referrerId), {
        loyaltyPoints: increment(referralBonus),
      });
    } catch (error) {
      console.error('Error awarding points to referrer:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error awarding referral points:', error);
    return false;
  }
}


