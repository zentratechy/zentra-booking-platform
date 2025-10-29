import { NextRequest, NextResponse } from 'next/server';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

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

    // Determine Square API base URL based on environment
    const isSandbox = businessData.paymentConfig?.square?.sandboxMode;
    const baseUrl = isSandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
    
    // Fetch locations from Square
    const locationsResponse = await fetch(`${baseUrl}/v2/locations`, {
      headers: {
        'Authorization': `Bearer ${squareAccessToken}`,
        'Square-Version': '2024-10-17',
      },
    });

    if (!locationsResponse.ok) {
      const errorData = await locationsResponse.json();
      console.error('Square locations error:', errorData);
      return NextResponse.json({ 
        error: errorData.errors?.[0]?.detail || 'Failed to fetch locations',
        statusCode: locationsResponse.status
      }, { status: locationsResponse.status });
    }

    const locationsData = await locationsResponse.json();

    if (!locationsData.locations || locationsData.locations.length === 0) {
      return NextResponse.json({ 
        error: 'No locations found in Square account',
        locations: []
      }, { status: 404 });
    }

    // Get the first location (or primary location if available)
    const location = locationsData.locations.find((loc: any) => loc.status === 'ACTIVE') || locationsData.locations[0];
    const locationId = location.id;

    // Update business document with location ID
    await updateDoc(doc(db, 'businesses', businessId), {
      'paymentConfig.square.locationId': locationId,
    });

    return NextResponse.json({
      success: true,
      locations: locationsData.locations,
      selectedLocation: {
        id: location.id,
        name: location.name,
        address: location.address,
      },
      message: 'Location ID saved successfully'
    });

  } catch (error: any) {
    console.error('Error fetching Square locations:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch locations' 
    }, { status: 500 });
  }
}

