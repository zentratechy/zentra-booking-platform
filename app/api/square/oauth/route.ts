import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This should be the businessId
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?square_error=missing_params', request.url));
  }

  try {
    // Determine Square API base URL based on environment
    const isSandbox = process.env.SQUARE_ENVIRONMENT === 'sandbox';
    const baseUrl = isSandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
    
    console.log('Square OAuth - Environment:', process.env.SQUARE_ENVIRONMENT);
    console.log('Square OAuth - Base URL:', baseUrl);
    console.log('Square OAuth - Application ID:', process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID?.substring(0, 20) + '...');
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2024-10-17',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
        client_secret: process.env.SQUARE_APPLICATION_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Square OAuth error:', tokenData);
      return NextResponse.redirect(new URL(`/dashboard/settings?square_error=${tokenData.error}`, request.url));
    }

    // Get merchant info
    const merchantResponse = await fetch(`${baseUrl}/v2/merchants`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Square-Version': '2024-10-17',
      },
    });

    const merchantData = await merchantResponse.json();
    const merchant = merchantData.merchant?.[0];

    // Store the tokens and merchant info in Firestore
    try {
      await updateDoc(doc(db, 'businesses', state), {
        paymentProvider: 'square',
        'paymentConfig.square.connected': true,
        'paymentConfig.square.accessToken': tokenData.access_token,
        'paymentConfig.square.refreshToken': tokenData.refresh_token,
        'paymentConfig.square.merchantId': merchant?.id || '',
        'paymentConfig.square.sandboxMode': isSandbox,
        'paymentConfig.square.connectedAt': new Date().toISOString(),
      });
      
      console.log('Square OAuth - Successfully stored connection data for business:', state);
    } catch (firestoreError) {
      console.error('Square OAuth - Error storing to Firestore:', firestoreError);
      return NextResponse.redirect(new URL('/dashboard/settings?square_error=storage_error', request.url));
    }
    
    // Redirect back to settings with success message
    const redirectUrl = new URL('/dashboard/settings', request.url);
    redirectUrl.searchParams.set('square_connected', 'true');
    redirectUrl.searchParams.set('merchant_name', merchant?.business_name || 'Square Account');

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Error in Square OAuth:', error);
    return NextResponse.redirect(new URL('/dashboard/settings?square_error=server_error', request.url));
  }
}

