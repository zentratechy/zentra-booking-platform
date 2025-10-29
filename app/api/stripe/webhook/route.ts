import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { awardLoyaltyPoints } from '@/lib/loyalty';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const metadata = paymentIntent.metadata;
    const stripeAccountId = metadata.stripeAccountId;
    const appointmentId = metadata.appointmentId;
    const businessId = metadata.businessId;
    const amount = paymentIntent.amount / 100; // Convert from cents

    console.log('Payment succeeded:', {
      paymentIntentId: paymentIntent.id,
      amount,
      businessId,
      appointmentId,
      stripeAccountId,
      metadata: metadata,
    });

    // Note: Payment was created directly on the connected account using stripeAccount parameter
    // So the funds are already in the business's account - no transfer needed
    if (stripeAccountId) {
      console.log('Payment was created on connected account:', stripeAccountId, '- funds are already in business account, no transfer needed');
    } else {
      console.warn('No stripeAccountId found in metadata - payment may be on platform account');
    }

    // Update appointment payment status if appointmentId is provided
    if (appointmentId && businessId) {
      try {
        const appointmentRef = doc(db, 'appointments', appointmentId);
        const appointmentDoc = await getDoc(appointmentRef);

        if (appointmentDoc.exists()) {
          const appointmentData = appointmentDoc.data();
          const currentPaid = appointmentData.payment?.amount || 0;
          const totalPaid = currentPaid + amount;
          const remainingBalance = Math.max(0, (appointmentData.price || 0) - totalPaid);

          await updateDoc(appointmentRef, {
            'payment.status': remainingBalance <= 0 ? 'paid' : 'partial',
            'payment.amount': totalPaid,
            'payment.remainingBalance': remainingBalance,
            'payment.stripePaymentIntentId': paymentIntent.id,
            updatedAt: serverTimestamp(),
          });

          // Award loyalty points if applicable
          if (appointmentData.clientId && appointmentData.clientEmail) {
            try {
              await awardLoyaltyPoints(
                businessId,
                appointmentData.clientId,
                appointmentData.clientEmail,
                amount
              );
            } catch (loyaltyError) {
              console.error('Failed to award loyalty points:', loyaltyError);
            }
          }

          // Update client's totalSpent
          if (appointmentData.clientId) {
            const clientRef = doc(db, 'clients', appointmentData.clientId);
            const clientDoc = await getDoc(clientRef);
            const currentTotalSpent = clientDoc.data()?.totalSpent || 0;

            await updateDoc(clientRef, {
              totalSpent: currentTotalSpent + amount,
              updatedAt: serverTimestamp(),
            });
          }

          console.log('Appointment updated successfully');
        }
      } catch (dbError) {
        console.error('Error updating appointment:', dbError);
      }
    }
  } catch (error: any) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}


