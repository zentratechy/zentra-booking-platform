import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { trackApiRequest } from '@/lib/api-middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function GET(request: NextRequest) {
  try {
    // Track API call
    await trackApiRequest(request, '/api/subscriptions/current');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({
        subscription: null,
        message: 'No business ID provided'
      });
    }

    // Get the Stripe customer ID from Firestore
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists()) {
      return NextResponse.json({
        subscription: null,
        message: 'Business not found'
      });
    }

    const businessData = businessDoc.data();
    const stripeCustomerId = businessData?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json({
        subscription: null,
        message: 'No Stripe customer found for this business'
      });
    }

    // Fetch active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        subscription: null,
        message: 'No active subscription found'
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    
    // Map price ID to plan name
    const planMapping: { [key: string]: string } = {
      [process.env.STRIPE_STARTER_PRICE_ID!]: 'Starter',
      [process.env.STRIPE_PROFESSIONAL_PRICE_ID!]: 'Professional', 
      [process.env.STRIPE_BUSINESS_PRICE_ID!]: 'Business',
    };

    const planName = planMapping[priceId] || 'Unknown Plan';

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: planName,
        currentPeriodEnd: subscription.items.data.length > 0 ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString() : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        priceId: priceId,
      },
      message: 'Subscription found'
    });

  } catch (error: any) {
    console.error('Error fetching current subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
