import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getStripeKey } from '@/lib/stripe-config';

const stripe = new Stripe(getStripeKey(), {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: NextRequest) {
  try {
    const { businessId, planId, customerId } = await request.json();

    if (!businessId || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId and planId are required' },
        { status: 400 }
      );
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
      const customer = await stripe.customers.create({
        metadata: {
          businessId: businessId,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create Stripe Checkout Session
    // If we have a valid price ID, use it, otherwise create price on the fly
    const lineItems: any[] = [];
    
    if (selectedPlan.priceId && selectedPlan.priceId.startsWith('price_')) {
      // Use existing price ID if available
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
