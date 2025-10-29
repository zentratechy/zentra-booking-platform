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

    // First, retrieve the payment intent to check if it has a connected account
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Create refund
    // For payments with transfer_data.destination, set reverse_transfer: true
    // This automatically reverses the transfer from the connected account back to platform
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents, undefined = full refund
      reason: 'requested_by_customer', // Stripe only accepts: duplicate, fraudulent, or requested_by_customer
      // Reverse the transfer from connected account back to platform
      reverse_transfer: paymentIntent.transfer_data?.destination ? true : false,
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

