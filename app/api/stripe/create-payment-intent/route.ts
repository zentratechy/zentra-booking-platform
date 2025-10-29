import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trackApiRequest } from '@/lib/api-middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: NextRequest) {
  try {
    // Track API call
    await trackApiRequest(request, '/api/stripe/create-payment-intent');
    
    const { businessId, serviceId, amount, isDeposit, metadata, customerEmail, customerName } = await request.json();

    if (!businessId || !amount) {
      return NextResponse.json(
        { error: 'Business ID and amount required' },
        { status: 400 }
      );
    }

    // Get business payment config
    const businessRef = doc(db, 'businesses', businessId);
    const businessDoc = await getDoc(businessRef);
    
    if (!businessDoc.exists()) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data();
    const stripeAccountId = businessData.paymentConfig?.stripe?.accountId;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Business has not connected Stripe yet' },
        { status: 400 }
      );
    }

    // Get business currency (default to USD)
    const currency = (businessData.currency || 'usd').toLowerCase();
    
    // Convert amount to smallest unit (cents for most currencies)
    const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp'];
    const amountInSmallestUnit = zeroDecimalCurrencies.includes(currency)
      ? Math.round(amount)
      : Math.round(amount * 100);

    console.log('Creating payment intent on connected account:', stripeAccountId);

    // Create payment intent directly on the connected account
    // This ensures payments go directly to the business's Stripe account, not through Zentra
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: currency,
      payment_method_types: ['card'], // Only allow card payments, disable Google Pay
      metadata: {
        ...metadata,
        businessId,
        serviceId,
        stripeAccountId, // Store for reference
        isDeposit: isDeposit ? 'true' : 'false',
      },
    }, {
      // Use stripeAccount in request options to create payment on connected account
      // Payments will go directly to the business's account
      stripeAccount: stripeAccountId,
    });

    console.log('Payment intent created on connected account:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      success: true,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

