import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, Timestamp } from 'firebase/firestore';
// import { awardLoyaltyPoints } from '@/lib/loyalty';

// Initialize Stripe lazily to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
};

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
      const stripe = getStripe();
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
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
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

    // Note: Payment intent uses transfer_data.destination to automatically transfer funds
    // to the connected account. No manual transfer needed - Stripe handles it automatically
    if (stripeAccountId) {
      console.log('Payment will be automatically transferred to connected account:', stripeAccountId);
    } else {
      console.warn('No stripeAccountId found in metadata - funds will stay on platform account');
    }

    // Update appointment payment status if appointmentId is provided
    if (appointmentId && businessId) {
      try {
        const appointmentRef = doc(db, 'appointments', appointmentId);
        const appointmentDoc = await getDoc(appointmentRef);

        if (appointmentDoc.exists()) {
          const appointmentData = appointmentDoc.data();
          
          // Check if this payment intent has already been processed
          // (frontend might have already updated it via handlePaymentSuccess)
          const existingPaymentIntentId = appointmentData.payment?.stripePaymentIntentId;
          const alreadyProcessed = existingPaymentIntentId === paymentIntent.id;
          
          if (alreadyProcessed) {
            console.log('Payment intent already processed, skipping webhook update:', paymentIntent.id);
            return;
          }
          
          // Check if payment was already marked as paid via link (frontend processed it)
          // If so, only update the payment intent ID if missing, but don't double-add amount
          const alreadyPaidViaLink = appointmentData.payment?.paidViaLink && 
                                     appointmentData.payment?.status === 'paid';
          
          let updateData: any = {
            'payment.stripePaymentIntentId': paymentIntent.id,
            updatedAt: serverTimestamp(),
          };
          
          if (alreadyPaidViaLink) {
            // Frontend already processed the payment, just ensure payment intent ID is stored
            console.log('Payment already processed by frontend, only updating payment intent ID');
            await updateDoc(appointmentRef, updateData);
            return;
          }
          
          // Process payment amount (first time webhook is processing this)
          const currentPaid = appointmentData.payment?.amount || 0;
          const totalPaid = currentPaid + amount;
          const remainingBalance = Math.max(0, (appointmentData.price || 0) - totalPaid);

          updateData = {
            ...updateData,
            'payment.status': remainingBalance <= 0 ? 'paid' : 'partial',
            'payment.amount': totalPaid,
            'payment.remainingBalance': remainingBalance,
            'payment.paidViaLink': true,
          };

          await updateDoc(appointmentRef, updateData);

          // Do NOT award loyalty points on payment. Points are awarded when appointment is marked 'completed'.

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

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing checkout.session.completed:', {
      sessionId: session.id,
      metadata: session.metadata,
      paymentStatus: session.payment_status,
      mode: session.mode,
      subscription: session.subscription,
      customer: session.customer
    });

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      console.warn('Checkout session completed but payment not paid:', {
        sessionId: session.id,
        paymentStatus: session.payment_status
      });
      return;
    }

    // Check if this is a voucher purchase
    if (session.metadata?.type === 'voucher_purchase') {
      console.log('Processing voucher purchase...');
      await handleVoucherPurchase(session);
      console.log('Voucher purchase processed successfully');
    } 
    // Check if this is a subscription checkout
    else if (session.mode === 'subscription') {
      console.log('Processing subscription checkout completion...');
      
      if (!session.subscription) {
        console.error('Subscription checkout completed but no subscription ID found:', {
          sessionId: session.id,
          mode: session.mode
        });
        return;
      }

      const stripe = getStripe();
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;
      
      console.log('Retrieving subscription from Stripe:', subscriptionId);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      console.log('Subscription retrieved:', {
        id: subscription.id,
        status: subscription.status,
        customer: subscription.customer,
        metadata: subscription.metadata
      });
      
      await handleSubscriptionCreated(subscription);
      console.log('Subscription checkout processed successfully');
    } else {
      console.log('Not a voucher purchase or subscription, skipping');
    }
  } catch (error: any) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

async function handleVoucherPurchase(session: Stripe.Checkout.Session) {
  try {
    const metadata = session.metadata!;
    
    console.log('🎁 Starting voucher creation with metadata:', metadata);
    
    // Generate voucher code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    console.log('🎫 Generated voucher code:', code);

    // Create expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    console.log('📅 Expiry date:', expiryDate.toISOString());

    // Create voucher in Firestore
    const voucher = {
      businessId: metadata.businessId,
      code: code,
      value: parseFloat(metadata.voucherValue),
      originalValue: parseFloat(metadata.voucherValue),
      balance: parseFloat(metadata.voucherValue),
      recipientName: metadata.recipientName,
      recipientEmail: metadata.recipientEmail,
      message: metadata.message,
      purchaserName: metadata.purchaserName,
      purchaserEmail: metadata.purchaserEmail,
      purchaserPhone: metadata.purchaserPhone,
      expiryDate: Timestamp.fromDate(expiryDate),
      status: 'active',
      redeemed: false,
      redeemedAmount: 0,
      createdAt: serverTimestamp(),
      source: 'online_purchase',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
    };

    console.log('💾 Creating voucher in Firestore:', voucher);

    const voucherRef = await addDoc(collection(db, 'vouchers'), voucher);
    console.log('✅ Voucher created successfully with ID:', voucherRef.id);

    // Send voucher email to recipient
    try {
      const emailUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://zentrabooking.com'}/api/email/send-voucher`;
      console.log('📧 Sending voucher email to:', metadata.recipientEmail);
      console.log('📧 Email endpoint:', emailUrl);
      
      const emailResponse = await fetch(emailUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: metadata.businessId,
          voucherCode: code,
          voucherValue: parseFloat(metadata.voucherValue),
          currency: 'GBP',
          recipientName: metadata.recipientName,
          recipientEmail: metadata.recipientEmail,
          message: metadata.message,
          purchaserName: metadata.purchaserName,
          purchaserEmail: metadata.purchaserEmail,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Email API returned error:', emailResponse.status, errorData);
        throw new Error(`Email API error: ${emailResponse.status} - ${errorData.error || 'Unknown error'}`);
      }

      const emailResult = await emailResponse.json();
      console.log('✅ Voucher email sent to recipient:', emailResult);
    } catch (emailError: any) {
      console.error('❌ Error sending voucher email:', emailError.message || emailError);
      // Don't throw - continue with voucher creation even if email fails
    }

    // Send confirmation email to purchaser
    try {
      const confirmationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://zentrabooking.com'}/api/email/send-voucher-confirmation`;
      console.log('📧 Sending confirmation email to:', metadata.purchaserEmail);
      console.log('📧 Confirmation endpoint:', confirmationUrl);
      
      const confirmationResponse = await fetch(confirmationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: metadata.businessId,
          voucherCode: code,
          voucherValue: parseFloat(metadata.voucherValue),
          currency: 'GBP',
          recipientName: metadata.recipientName,
          recipientEmail: metadata.recipientEmail,
          purchaserName: metadata.purchaserName,
          purchaserEmail: metadata.purchaserEmail,
        }),
      });

      if (!confirmationResponse.ok) {
        const errorData = await confirmationResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Confirmation email API returned error:', confirmationResponse.status, errorData);
        throw new Error(`Confirmation email API error: ${confirmationResponse.status} - ${errorData.error || 'Unknown error'}`);
      }

      const confirmationResult = await confirmationResponse.json();
      console.log('✅ Confirmation email sent to purchaser:', confirmationResult);
    } catch (emailError: any) {
      console.error('❌ Error sending confirmation email:', emailError.message || emailError);
      // Don't throw - continue with voucher creation even if email fails
    }

    console.log('🎉 Voucher created successfully:', code);
  } catch (error: any) {
    console.error('❌ Error handling voucher purchase:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log('Processing customer.subscription.created:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata,
      items: subscription.items.data.map(item => ({
        priceId: item.price.id,
        productId: item.price.product
      }))
    });

    const businessId = subscription.metadata?.businessId;
    if (!businessId) {
      console.warn('No businessId in subscription metadata, cannot update Firestore');
      console.warn('Subscription metadata:', subscription.metadata);
      return;
    }

    const businessRef = doc(db, 'businesses', businessId);
    const businessDoc = await getDoc(businessRef);

    if (!businessDoc.exists()) {
      console.warn(`Business ${businessId} not found in Firestore`);
      return;
    }

    // Get plan name from metadata or price
    const planName = subscription.metadata?.planName || 'Unknown';
    const priceId = subscription.items.data[0]?.price.id;

    // Update business document with subscription info
    await updateDoc(businessRef, {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: planName,
        planId: planName.toLowerCase(),
        priceId: priceId,
        currentPeriodEnd: Timestamp.fromDate(new Date((subscription as any).current_period_end * 1000)),
        currentPeriodStart: Timestamp.fromDate(new Date((subscription as any).current_period_start * 1000)),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        createdAt: serverTimestamp(),
      },
      stripeCustomerId: typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id,
      lastUpdated: serverTimestamp(),
    });

    console.log('✅ Subscription created and saved to Firestore:', subscription.id);
  } catch (error: any) {
    console.error('❌ Error handling subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('Processing customer.subscription.updated:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata
    });

    const businessId = subscription.metadata?.businessId;
    if (!businessId) {
      console.warn('No businessId in subscription metadata, cannot update Firestore');
      return;
    }

    const businessRef = doc(db, 'businesses', businessId);
    const businessDoc = await getDoc(businessRef);

    if (!businessDoc.exists()) {
      console.warn(`Business ${businessId} not found in Firestore`);
      return;
    }

    // Get plan name from metadata or price
    const planName = subscription.metadata?.planName || 'Unknown';
    const priceId = subscription.items.data[0]?.price.id;

    // Update business document with subscription info
    await updateDoc(businessRef, {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: planName,
        planId: planName.toLowerCase(),
        priceId: priceId,
        currentPeriodEnd: Timestamp.fromDate(new Date((subscription as any).current_period_end * 1000)),
        currentPeriodStart: Timestamp.fromDate(new Date((subscription as any).current_period_start * 1000)),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        updatedAt: serverTimestamp(),
      },
      lastUpdated: serverTimestamp(),
    });

    console.log('✅ Subscription updated in Firestore:', subscription.id);
  } catch (error: any) {
    console.error('❌ Error handling subscription updated:', error);
    throw error;
  }
}


