import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Initialize Stripe lazily to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
};

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe secret key is available
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        error: 'Stripe configuration missing'
      }, { status: 500 });
    }
    
    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json({
        error: 'Business ID is required'
      }, { status: 400 });
    }

    // Get the Stripe customer ID from Firestore
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists()) {
      return NextResponse.json({
        error: 'Business not found'
      }, { status: 404 });
    }

    const businessData = businessDoc.data();
    const stripeCustomerId = businessData?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json({
        error: 'No Stripe customer found for this business'
      }, { status: 404 });
    }

    // Get active subscriptions
    const stripe = getStripe();
    let subscriptions;
    try {
      subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        limit: 1,
      });
    } catch (stripeError: any) {
      return NextResponse.json({
        error: 'Failed to fetch subscriptions from Stripe',
        details: stripeError.message
      }, { status: 500 });
    }

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        error: 'No active subscription found'
      }, { status: 404 });
    }

    const subscription = subscriptions.data[0];

    // Cancel the subscription at the end of the current period
    let canceledSubscription;
    try {
      canceledSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
    } catch (stripeError: any) {
      return NextResponse.json({
        error: 'Failed to cancel subscription in Stripe',
        details: stripeError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        currentPeriodEnd: canceledSubscription.items.data.length > 0 ? new Date(canceledSubscription.items.data[0].current_period_end * 1000).toISOString() : null,
      },
      message: 'Subscription will be canceled at the end of the current billing period'
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to cancel subscription',
        details: error.message 
      },
      { status: 500 }
    );
  }
}