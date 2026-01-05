import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getStripeKey } from '@/lib/stripe-config';

// Initialize Stripe lazily to avoid build-time errors
const getStripe = () => {
  const key = getStripeKey();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key, {
    apiVersion: '2025-09-30.clover',
  });
};

export async function POST(request: NextRequest) {
  try {
    const { businessId, planId, customerId } = await request.json();

    if (!businessId || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId and planId are required' },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription - if so, use update endpoint instead
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        const existingCustomerId = businessData?.stripeCustomerId || customerId;
        
        if (existingCustomerId) {
          const stripe = getStripe();
          const existingSubscriptions = await stripe.subscriptions.list({
            customer: existingCustomerId,
            status: 'active',
            limit: 1,
          });

          if (existingSubscriptions.data.length > 0) {
            // User has an active subscription - redirect to update endpoint
            return NextResponse.json(
              { 
                error: 'You already have an active subscription. Please use the update endpoint to change plans.',
                redirectToUpdate: true,
                message: 'To change your plan, the system will update your existing subscription instead of creating a new one.'
              },
              { status: 400 }
            );
          }
        }
      }
    } catch (checkError) {
      // If check fails, continue with creating new subscription
      console.warn('Could not check for existing subscription, proceeding with new subscription:', checkError);
    }

    // Define subscription plans
    const plans = {
      starter: {
        priceId: process.env.STRIPE_STARTER_PRICE_ID,
        name: 'Starter',
        price: 29,
        features: ['Up to 2 staff', 'Up to 50 clients', 'Basic features']
      },
      professional: {
        priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
        name: 'Professional',
        price: 79,
        features: ['Up to 10 staff', 'Unlimited clients', 'Advanced features']
      },
      business: {
        priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
        name: 'Business',
        price: 149,
        features: ['Unlimited staff', 'Unlimited clients', 'All features']
      }
    };

    const selectedPlan = plans[planId as keyof typeof plans];
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = customerId;
    if (!stripeCustomerId) {
      // Create a new customer for this business
      const stripe = getStripe();
      const customer = await stripe.customers.create({
        metadata: {
          businessId: businessId,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create Stripe Checkout Session
    // If we have a valid price ID, verify it exists, otherwise create price on the fly
    const lineItems: any[] = [];
    const stripe = getStripe();
    
    let usePriceId = false;
    if (selectedPlan.priceId && selectedPlan.priceId.startsWith('price_')) {
      // Verify the price ID exists in Stripe before using it
      try {
        await stripe.prices.retrieve(selectedPlan.priceId);
        usePriceId = true;
      } catch (priceError: any) {
        console.warn(`Price ID ${selectedPlan.priceId} not found in Stripe, creating price on the fly:`, priceError.message);
        usePriceId = false;
      }
    }
    
    if (usePriceId) {
      // Use existing price ID if available and valid
      lineItems.push({
        price: selectedPlan.priceId,
        quantity: 1,
      });
    } else {
      // Create price on the fly using price_data
      lineItems.push({
        price_data: {
          currency: 'gbp',
          unit_amount: selectedPlan.price * 100, // Convert to cents
          recurring: {
            interval: 'month',
          },
          product_data: {
            name: `${selectedPlan.name} Plan - Zentra`,
            description: `Monthly subscription for ${selectedPlan.name} plan`,
          },
        },
        quantity: 1,
      });
    }

    console.log('Creating Stripe Checkout Session:', {
      customer: stripeCustomerId,
      planId: planId,
      planName: selectedPlan.name,
      usePriceId: usePriceId,
      priceId: selectedPlan.priceId,
      lineItems: lineItems
    });

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://zentrabooking.com'}/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://zentrabooking.com'}/subscription?canceled=true`,
      subscription_data: {
        metadata: {
          businessId: businessId,
          planName: selectedPlan.name,
        },
      },
      // Restrict to UK customers only
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['GB'],
      },
      // Set currency to GBP
      currency: 'gbp',
    });

    console.log('Checkout Session created:', {
      sessionId: session.id,
      url: session.url,
      mode: session.mode,
      customer: session.customer
    });

    // Store customer ID and end trial in Firestore
    try {
      await setDoc(doc(db, 'businesses', businessId), {
        stripeCustomerId: stripeCustomerId,
        lastUpdated: new Date(),
        trial: {
          active: false,
          endedAt: new Date(),
          reason: 'subscription_created'
        }
      }, { merge: true });
    } catch (firestoreError) {
      console.error('Error storing customer ID:', firestoreError);
      // Don't fail the request if Firestore fails
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      plan: selectedPlan,
    });

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
      return NextResponse.json(
        { 
          error: 'Price not found. Please check your Stripe configuration.',
          details: 'The subscription price ID does not exist in your Stripe account.',
          stripeError: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create subscription',
        details: error.message || 'Unknown error',
        stripeError: error.type || 'Unknown error type'
      },
      { status: 500 }
    );
  }
}
