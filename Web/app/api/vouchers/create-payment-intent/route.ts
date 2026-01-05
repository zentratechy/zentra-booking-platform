import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { trackApiRequest } from '@/lib/api-middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: NextRequest) {
  try {
    // Track API call
    await trackApiRequest(request, '/api/vouchers/create-payment-intent');
    
    const { 
      businessId, 
      voucherValue, 
      recipientName, 
      recipientEmail, 
      message, 
      purchaserName, 
      purchaserEmail, 
      purchaserPhone 
    } = await request.json();

    if (!businessId || !voucherValue || !recipientName || !recipientEmail || !purchaserName || !purchaserEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get business data
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists()) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data();
    const currency = businessData.currency || 'GBP';
    const stripeAccountId = businessData.paymentConfig?.stripe?.accountId;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Business has not connected Stripe yet' },
        { status: 400 }
      );
    }

    // Convert amount to smallest unit (cents for most currencies)
    const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp'];
    const amountInSmallestUnit = zeroDecimalCurrencies.includes(currency.toLowerCase())
      ? Math.round(voucherValue)
      : Math.round(voucherValue * 100);

    // Create payment intent on platform account (will be transferred to connected account after payment)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        businessId,
        voucherValue: voucherValue.toString(),
        recipientName,
        recipientEmail,
        message: message || '',
        purchaserName,
        purchaserEmail,
        purchaserPhone: purchaserPhone || '',
        type: 'voucher_purchase',
        stripeAccountId,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      success: true,
    });
  } catch (error: any) {
    console.error('Error creating voucher payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}





