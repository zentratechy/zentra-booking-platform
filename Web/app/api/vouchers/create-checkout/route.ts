import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: NextRequest) {
  try {
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

    console.log('Voucher checkout request:', {
      businessId,
      voucherValue,
      recipientName,
      recipientEmail,
      purchaserName,
      purchaserEmail
    });

    if (!businessId || !voucherValue || !recipientName || !recipientEmail || !purchaserName || !purchaserEmail) {
      console.error('Missing required fields:', {
        businessId: !!businessId,
        voucherValue: !!voucherValue,
        recipientName: !!recipientName,
        recipientEmail: !!recipientEmail,
        purchaserName: !!purchaserName,
        purchaserEmail: !!purchaserEmail
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get business data
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists()) {
      console.error('Business not found:', businessId);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data();
    const currency = businessData.currency || 'GBP';

    console.log('Creating Stripe checkout session for voucher:', {
      currency,
      voucherValue,
      businessName: businessData.businessName || businessData.name
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Gift Voucher - ${businessData.businessName || businessData.name}`,
              description: `£${voucherValue} gift voucher for ${recipientName}`,
            },
            unit_amount: voucherValue * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://zentrabooking.com'}/voucher-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://zentrabooking.com'}/vouchers/${businessId}`,
      customer_email: purchaserEmail,
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
      },
      // Restrict to UK customers only
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['GB'],
      },
    });

    console.log('Stripe checkout session created:', session.id);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Error creating voucher checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
