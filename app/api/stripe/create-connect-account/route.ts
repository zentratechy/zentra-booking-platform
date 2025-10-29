import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Stripe secret key not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    });

    const { email, businessName } = await request.json();

    console.log('Creating Stripe Connect account for:', { email, businessName });

    if (!email || !businessName) {
      return NextResponse.json(
        { error: 'Email and business name required' },
        { status: 400 }
      );
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'standard',
      email,
      business_profile: {
        name: businessName,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    return NextResponse.json({ 
      accountId: account.id,
      success: true 
    });
  } catch (error: any) {
    console.error('Error creating Stripe account:', error);
    
    // Handle specific Stripe errors
    let errorMessage = 'Failed to create Stripe account';
    
    if (error.type === 'StripeConnectionError' || error.code === 'api_connection_error') {
      errorMessage = 'Unable to connect to Stripe. Please check your internet connection and try again.';
    } else if (error.type === 'StripeAuthenticationError' || error.code === 'api_key_expired') {
      errorMessage = 'Stripe API key is invalid or expired. Please contact support.';
    } else if (error.message?.includes('Connect') || error.message?.includes('connect')) {
      errorMessage = 'Stripe Connect is not enabled for your account. Please enable Stripe Connect in your Stripe Dashboard to connect payment accounts.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


