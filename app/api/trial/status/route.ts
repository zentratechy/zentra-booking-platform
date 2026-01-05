import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Stripe from 'stripe';
import { trackApiRequest } from '@/lib/api-middleware';

// Initialize Stripe lazily to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
};

export async function GET(request: NextRequest) {
  try {
    // Track API call
    await trackApiRequest(request, '/api/trial/status');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({
        error: 'Business ID is required'
      }, { status: 400 });
    }

    // Get business data from Firestore
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    
    if (!businessDoc.exists()) {
      return NextResponse.json({
        error: 'Business not found'
      }, { status: 404 });
    }

    const businessData = businessDoc.data();
    const trial = businessData?.trial;
    const stripeCustomerId = businessData?.stripeCustomerId;

    console.log('Trial Status API Debug:', {
      businessId,
      hasStripeCustomerId: !!stripeCustomerId,
      stripeCustomerId: stripeCustomerId || 'none',
      trialActive: trial?.active,
      trialExpired: trial?.endDate ? new Date() > (typeof trial.endDate.toDate === 'function' ? trial.endDate.toDate() : new Date(trial.endDate)) : 'no endDate'
    });

    // Check if user has an active subscription
    let hasActiveSubscription = false;
    if (stripeCustomerId) {
      try {
        const stripe = getStripe();
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
          limit: 1,
        });
        hasActiveSubscription = subscriptions.data.length > 0;
        console.log('Trial Status API Debug: Subscription check', {
          foundActiveSubscriptions: subscriptions.data.length,
          hasActiveSubscription
        });
      } catch (error: any) {
        console.error('Error checking subscription status:', error);
        // If customer doesn't exist in Stripe, it means the customer ID in Firestore is incorrect
        // Don't treat this as an active subscription
        console.log('Trial Status API Debug: Customer not found in Stripe, assuming no subscription');
        hasActiveSubscription = false;
      }
    }

    console.log('Trial Status API Debug: Final result', {
      hasActiveSubscription,
      willReturnOverridden: hasActiveSubscription
    });

    // If user has active subscription, trial is overridden
    if (hasActiveSubscription) {
      return NextResponse.json({
        trial: {
          active: false,
          expired: false,
          overridden: true,
          startDate: trial?.startDate,
          endDate: trial?.endDate,
          daysRemaining: 0,
          totalDays: 14
        },
        message: 'Trial overridden by active subscription'
      });
    }

    if (!trial) {
      return NextResponse.json({
        trial: null,
        message: 'No trial found'
      });
    }

    // Calculate current trial status
    const now = new Date();
    
    // Safely get endDate - handle both Timestamp and regular Date objects
    let trialEndDate: Date;
    if (trial.endDate && typeof trial.endDate.toDate === 'function') {
      trialEndDate = trial.endDate.toDate();
    } else if (trial.endDate) {
      trialEndDate = new Date(trial.endDate);
    } else {
      // If no endDate, set to a past date so trial is expired
      trialEndDate = new Date(0);
    }
    
    const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = now > trialEndDate;
    const isActive = trial.active && !isExpired;

    return NextResponse.json({
      trial: {
        active: isActive,
        expired: isExpired,
        overridden: false,
        startDate: trial.startDate,
        endDate: trial.endDate,
        daysRemaining: Math.max(0, daysRemaining),
        totalDays: 14
      },
      message: isActive ? 'Trial is active' : isExpired ? 'Trial has expired' : 'No active trial'
    });

  } catch (error: any) {
    console.error('Error fetching trial status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trial status' },
      { status: 500 }
    );
  }
}
