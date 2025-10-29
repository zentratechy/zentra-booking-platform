import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe secret key not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    });

    const { paymentIntentId, amount, reason } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      );
    }

    // First, retrieve the payment intent to check if it has a connected account
    console.log('Retrieving payment intent:', paymentIntentId);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    console.log('Payment intent retrieved:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      transfer_data: paymentIntent.transfer_data,
      hasDestination: !!paymentIntent.transfer_data?.destination
    });
    
    // Create refund
    // For payments with transfer_data.destination, set reverse_transfer: true
    // This automatically reverses the transfer from the connected account back to platform
    const refundAmount = amount ? Math.round(amount * 100) : undefined;
    const shouldReverseTransfer = !!paymentIntent.transfer_data?.destination;
    
    console.log('Creating refund:', {
      paymentIntentId,
      amount: refundAmount,
      shouldReverseTransfer,
      reason: reason || 'Customer request'
    });
    
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount, // Convert to cents, undefined = full refund
      reason: 'requested_by_customer', // Stripe only accepts: duplicate, fraudulent, or requested_by_customer
      // Reverse the transfer from connected account back to platform
      reverse_transfer: shouldReverseTransfer,
      metadata: {
        refund_reason: reason || 'Customer request', // Store custom reason in metadata
      },
    });

    console.log('Refund created successfully:', {
      id: refund.id,
      amount: refund.amount,
      status: refund.status
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
    console.error('Error creating refund:', {
      message: error.message,
      type: error.type,
      code: error.code,
      paymentIntentId,
      stack: error.stack
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create refund';
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        errorMessage = 'Payment intent not found. Please verify the payment ID.';
      } else if (error.message?.includes('already been refunded')) {
        errorMessage = 'This payment has already been refunded.';
      } else if (error.message?.includes('cannot be refunded')) {
        errorMessage = 'This payment cannot be refunded. It may not be captured yet or may be in a non-refundable state.';
      } else {
        errorMessage = error.message || 'Invalid refund request. Please check the payment details.';
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.code || error.type },
      { status: error.statusCode || 500 }
    );
  }
}

