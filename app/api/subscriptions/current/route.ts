import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
    const stripe = getStripe();
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
    const price = subscription.items.data[0].price;
    const priceAmount = price.unit_amount ? price.unit_amount / 100 : 0; // Convert from cents
    
    // Try multiple methods to determine plan name
    let planName = 'Unknown Plan';
    let planId = 'unknown';
    
    // Method 1: Check subscription metadata (most reliable)
    if (subscription.metadata?.planName) {
      planName = subscription.metadata.planName;
      planId = planName.toLowerCase();
    }
    // Method 2: Check environment variable price ID mapping
    else {
      const planMapping: { [key: string]: string } = {
        [process.env.STRIPE_STARTER_PRICE_ID || '']: 'Starter',
        [process.env.STRIPE_PROFESSIONAL_PRICE_ID || '']: 'Professional', 
        [process.env.STRIPE_BUSINESS_PRICE_ID || '']: 'Business',
      };
      
      if (planMapping[priceId]) {
        planName = planMapping[priceId];
        planId = planName.toLowerCase();
      }
      // Method 3: Determine by price amount (fallback)
      else if (priceAmount > 0) {
        // Match price to known plan amounts
        if (priceAmount === 29 || (priceAmount >= 28 && priceAmount <= 30)) {
          planName = 'Starter';
          planId = 'starter';
        } else if (priceAmount === 79 || (priceAmount >= 78 && priceAmount <= 80)) {
          planName = 'Professional';
          planId = 'professional';
        } else if (priceAmount === 149 || (priceAmount >= 148 && priceAmount <= 150)) {
          planName = 'Business';
          planId = 'business';
        }
        // Method 4: Check product name for clues
        else if (price.product) {
          try {
            const product = typeof price.product === 'string' 
              ? await stripe.products.retrieve(price.product)
              : price.product;
            
            // Check if product is deleted
            if (product.deleted) {
              console.warn('Product is deleted, cannot determine plan from product name');
            } else {
              const productName = (product as Stripe.Product).name || '';
              if (productName.toLowerCase().includes('starter')) {
                planName = 'Starter';
                planId = 'starter';
              } else if (productName.toLowerCase().includes('professional')) {
                planName = 'Professional';
                planId = 'professional';
              } else if (productName.toLowerCase().includes('business')) {
                planName = 'Business';
                planId = 'business';
              }
            }
          } catch (e) {
            console.warn('Could not retrieve product for plan detection:', e);
          }
        }
      }
    }
    
    console.log('Plan detection:', {
      priceId,
      priceAmount,
      metadataPlanName: subscription.metadata?.planName,
      detectedPlan: planName,
      detectedPlanId: planId
    });

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: {
          id: planId,
          name: planName,
        },
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
