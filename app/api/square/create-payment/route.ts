import { NextRequest, NextResponse } from 'next/server';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { businessId, amount, sourceId, customerId, referenceId, note } = await request.json();

    // Get business Square credentials
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists()) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = businessDoc.data();
    const squareAccessToken = businessData.paymentConfig?.square?.accessToken;
    let squareLocationId = businessData.paymentConfig?.square?.locationId;

    if (!squareAccessToken) {
      return NextResponse.json({ error: 'Square not connected' }, { status: 400 });
    }

    // If location ID is missing, try to fetch it
    if (!squareLocationId) {
      const isSandbox = businessData.paymentConfig?.square?.sandboxMode;
      const baseUrl = isSandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
      
      try {
        const locationsResponse = await fetch(`${baseUrl}/v2/locations`, {
          headers: {
            'Authorization': `Bearer ${squareAccessToken}`,
            'Square-Version': '2024-10-17',
          },
        });

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          if (locationsData.locations && locationsData.locations.length > 0) {
            const location = locationsData.locations.find((loc: any) => loc.status === 'ACTIVE') || locationsData.locations[0];
            squareLocationId = location.id;
            
            // Save the location ID for future use
            await updateDoc(doc(db, 'businesses', businessId), {
              'paymentConfig.square.locationId': squareLocationId,
            });
          }
        }
      } catch (locationError) {
        console.error('Error fetching location ID:', locationError);
      }
    }

    if (!squareLocationId) {
      return NextResponse.json({ error: 'Square location not configured. Please reconnect Square.' }, { status: 400 });
    }

    // Determine Square API base URL based on environment
    const isSandbox = businessData.paymentConfig?.square?.sandboxMode;
    const baseUrl = isSandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
    
    // Create payment using Square API
    const response = await fetch(`${baseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-10-17',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: `${Date.now()}-${Math.random()}`,
        amount_money: {
          amount: Math.round(amount * 100), // Convert to cents
          currency: businessData.currency?.toUpperCase() || 'USD',
        },
        location_id: squareLocationId,
        customer_id: customerId,
        reference_id: referenceId,
        note: note,
      }),
    });

    const paymentData = await response.json();

    if (paymentData.errors) {
      console.error('Square payment error:', paymentData.errors);
      return NextResponse.json({ 
        error: paymentData.errors[0]?.detail || 'Payment failed' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      payment: paymentData.payment,
      paymentId: paymentData.payment?.id,
    });
  } catch (error: any) {
    console.error('Error creating Square payment:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process payment' 
    }, { status: 500 });
  }
}












