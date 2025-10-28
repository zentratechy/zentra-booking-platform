import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { 
      businessId, 
      voucherValue, 
      recipientName, 
      recipientEmail, 
      purchaserName, 
      purchaserEmail, 
      message 
    } = await request.json();

    if (!businessId || !voucherValue || !recipientName || !recipientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('🧪 Creating test voucher:', {
      businessId,
      voucherValue,
      recipientName,
      recipientEmail
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
      purchaserName: purchaserName || 'Test Purchaser',
      purchaserEmail: purchaserEmail || '',
      purchaserPhone: '',
      expiryDate: Timestamp.fromDate(expiryDate),
      status: 'active',
      redeemed: false,
      redeemedAmount: 0,
      createdAt: serverTimestamp(),
      source: 'test_creation',
      stripeSessionId: 'test_' + Date.now(),
      stripePaymentIntentId: 'test_' + Date.now(),
    };

    console.log('💾 Creating voucher in Firestore:', voucher);

    const voucherRef = await addDoc(collection(db, 'vouchers'), voucher);
    console.log('✅ Voucher created successfully with ID:', voucherRef.id);

    return NextResponse.json({ 
      success: true, 
      voucherId: voucherRef.id,
      voucherCode: code,
      message: 'Test voucher created successfully'
    });

  } catch (error: any) {
    console.error('❌ Error creating test voucher:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
