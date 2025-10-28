import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    const account = await stripe.accounts.retrieve(accountId);

    return NextResponse.json({
      connected: account.charges_enabled && account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      success: true,
    });
  } catch (error: any) {
    console.error('Error checking account status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check account status' },
      { status: 500 }
    );
  }
}


