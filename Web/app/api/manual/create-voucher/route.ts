import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { 
      businessId, 
      voucherValue, 
      recipientName, 
      recipientEmail, 
      purchaserName, 
      purchaserEmail, 
      message,
      stripeSessionId,
      stripePaymentIntentId
    } = await request.json();

    if (!businessId || !voucherValue || !recipientName || !recipientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('🧪 Manual voucher creation:', {
      businessId,
      voucherValue,
      recipientName,
      recipientEmail,
      purchaserName,
      purchaserEmail
    });

    // Generate voucher code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Create expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create voucher in Firestore
    const voucher = {
      businessId,
      code: code,
      value: parseFloat(voucherValue.toString()),
      originalValue: parseFloat(voucherValue.toString()),
      balance: parseFloat(voucherValue.toString()),
      recipientName,
      recipientEmail,
      message: message || '',
      purchaserName: purchaserName || 'Unknown',
      purchaserEmail: purchaserEmail || '',
      purchaserPhone: '',
      expiryDate: expiryDate,
      status: 'active',
      redeemed: false,
      redeemedAmount: 0,
      createdAt: serverTimestamp(),
      source: 'manual_creation',
      stripeSessionId: stripeSessionId || 'manual_' + Date.now(),
      stripePaymentIntentId: stripePaymentIntentId || 'manual_' + Date.now(),
    };

    const voucherRef = await addDoc(collection(db, 'vouchers'), voucher);
    console.log('✅ Voucher created with ID:', voucherRef.id);

    // Send voucher email to recipient
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://zentrabooking.com'}/api/email/send-voucher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          voucherCode: code,
          voucherValue: parseFloat(voucherValue.toString()),
          currency: 'GBP',
          recipientName,
          recipientEmail,
          message: message || '',
          purchaserName: purchaserName || 'Unknown',
          purchaserEmail: purchaserEmail || '',
          expiryDate: expiryDate.toISOString(),
        }),
      });
      console.log('✅ Voucher email sent to recipient');
    } catch (emailError) {
      console.error('❌ Error sending voucher email:', emailError);
    }

    // Send confirmation email to purchaser
    if (purchaserEmail) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://zentrabooking.com'}/api/email/send-voucher-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            voucherCode: code,
            voucherValue: parseFloat(voucherValue.toString()),
            currency: 'GBP',
            recipientName,
            recipientEmail,
            purchaserName: purchaserName || 'Unknown',
            purchaserEmail: purchaserEmail || '',
          }),
        });
        console.log('✅ Confirmation email sent to purchaser');
      } catch (emailError) {
        console.error('❌ Error sending confirmation email:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      voucherId: voucherRef.id,
      voucherCode: code,
      message: 'Voucher created successfully'
    });

  } catch (error: any) {
    console.error('❌ Error creating manual voucher:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




