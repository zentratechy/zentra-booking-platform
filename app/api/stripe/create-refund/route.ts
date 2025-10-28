import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: Request) {
  try {
    const { paymentIntentId, amount, reason } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      );
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents, undefined = full refund
      reason: 'requested_by_customer', // Stripe only accepts: duplicate, fraudulent, or requested_by_customer
      metadata: {
        refund_reason: reason || 'Customer request', // Store custom reason in metadata
      },
    });

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        reason: refund.reason,
      },
    });
  } catch (error: any) {
    console.error('Error creating refund:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create refund' },
      { status: 500 }
    );
  }
}

