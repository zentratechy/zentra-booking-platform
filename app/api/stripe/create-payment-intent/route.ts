import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

    console.log('Creating payment intent for connected account:', stripeAccountId);

    // Create payment intent on platform account (will be transferred to connected account after payment)
    // This approach works better with Stripe Elements using the platform's publishable key
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: currency,
      payment_method_types: ['card'], // Only allow card payments, disable Google Pay
      // Use application_fee_amount if you want to take a platform fee
      // Otherwise, use transfer_data to specify where funds should go
      transfer_data: {
        destination: stripeAccountId, // Funds will be transferred to connected account
      },
      metadata: {
        ...metadata,
        businessId,
        serviceId,
        stripeAccountId, // Store connected account ID for reference
        isDeposit: isDeposit ? 'true' : 'false',
      },
    });

    console.log('Payment intent created with transfer to connected account:', paymentIntent.id);

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

