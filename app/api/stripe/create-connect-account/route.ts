import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: Request) {
  try {
    const { email, businessName } = await request.json();

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
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}


