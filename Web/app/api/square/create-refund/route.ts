import { NextRequest, NextResponse } from 'next/server';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { businessId, paymentId, amount, reason } = await request.json();

    // Get business Square credentials
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists()) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = businessDoc.data();
    const squareAccessToken = businessData.paymentConfig?.square?.accessToken;

    if (!squareAccessToken) {
      return NextResponse.json({ error: 'Square not connected' }, { status: 400 });
    }

    // Create refund using Square API
    const response = await fetch('https://connect.squareup.com/v2/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-10-17',
      },
      body: JSON.stringify({
        idempotency_key: `refund-${Date.now()}-${Math.random()}`,
        payment_id: paymentId,
        amount_money: {
          amount: Math.round(amount * 100), // Convert to cents
          currency: businessData.currency?.toUpperCase() || 'USD',
        },
        reason: reason || 'Customer request',
      }),
    });

    const refundData = await response.json();

    if (refundData.errors) {
      console.error('Square refund error:', refundData.errors);
      return NextResponse.json({ 
        error: refundData.errors[0]?.detail || 'Refund failed' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      refund: refundData.refund,
      refundId: refundData.refund?.id,
    });
  } catch (error: any) {
    console.error('Error creating Square refund:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process refund' 
    }, { status: 500 });
  }
}
















