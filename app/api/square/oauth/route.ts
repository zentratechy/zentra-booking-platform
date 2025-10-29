import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This should be the businessId
  
  if (!code || !state) {
    const origin = request.nextUrl.origin;
    return NextResponse.redirect(new URL(`${origin}/dashboard/settings?square_error=missing_params`, request.url));
  }

  try {
    // Determine Square API base URL based on environment
    // Check both environment variable and app ID format
    const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
    const squareEnv = process.env.SQUARE_ENVIRONMENT || process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT;
    const isSandbox = squareEnv === 'sandbox' || squareAppId?.startsWith('sandbox-');
    const baseUrl = isSandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
    
    console.log('Square OAuth - Environment:', squareEnv);
    console.log('Square OAuth - Is Sandbox:', isSandbox);
    console.log('Square OAuth - Base URL:', baseUrl);
    console.log('Square OAuth - Application ID:', squareAppId?.substring(0, 20) + '...');
    console.log('Square OAuth - Authorization code received:', code ? 'yes' : 'no');
    console.log('Square OAuth - State (businessId):', state);
    
    const origin = request.nextUrl.origin;
    
    if (!squareAppId) {
      console.error('Square OAuth - Application ID not configured');
      return NextResponse.redirect(new URL(`${origin}/dashboard/settings?square_error=app_id_missing`, request.url));
    }

    if (!process.env.SQUARE_APPLICATION_SECRET) {
      console.error('Square OAuth - Application Secret not configured');
      return NextResponse.redirect(new URL(`${origin}/dashboard/settings?square_error=app_secret_missing`, request.url));
    }
    
    // Exchange authorization code for access token
    console.log('Square OAuth - Exchanging authorization code for access token...');
    console.log('Square OAuth - Request URL:', `${baseUrl}/oauth2/token`);
    console.log('Square OAuth - Request body:', {
      client_id: squareAppId?.substring(0, 20) + '...',
      code: code ? 'present' : 'missing',
      grant_type: 'authorization_code'
    });

    const tokenResponse = await fetch(`${baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2024-10-17',
      },
      body: JSON.stringify({
        client_id: squareAppId,
        client_secret: process.env.SQUARE_APPLICATION_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    console.log('Square OAuth - Token response status:', tokenResponse.status);
    console.log('Square OAuth - Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    const tokenData = await tokenResponse.json();
    console.log('Square OAuth - Token response body:', JSON.stringify(tokenData, null, 2));

    // Check for HTTP errors first
    if (!tokenResponse.ok) {
      console.error('Square OAuth - HTTP Error:', tokenResponse.status, tokenResponse.statusText);
      const errorMessage = tokenData.error_description || tokenData.error || `HTTP ${tokenResponse.status}`;
      return NextResponse.redirect(new URL(`${origin}/dashboard/settings?square_error=${encodeURIComponent(errorMessage)}`, request.url));
    }

    // Check for Square API errors
    if (tokenData.errors && Array.isArray(tokenData.errors) && tokenData.errors.length > 0) {
      console.error('Square OAuth - API Errors:', tokenData.errors);
      const firstError = tokenData.errors[0];
      const errorMessage = firstError.detail || firstError.code || 'square_api_error';
      return NextResponse.redirect(new URL(`${origin}/dashboard/settings?square_error=${encodeURIComponent(errorMessage)}`, request.url));
    }

    // Legacy error format
    if (tokenData.error) {
      console.error('Square OAuth error:', tokenData);
      const errorMessage = tokenData.error_description || tokenData.error || 'unknown_error';
      return NextResponse.redirect(new URL(`${origin}/dashboard/settings?square_error=${encodeURIComponent(errorMessage)}`, request.url));
    }

    // Check for access token
    if (!tokenData.access_token) {
      console.error('Square OAuth - No access token in response');
      console.error('Square OAuth - Full response:', JSON.stringify(tokenData, null, 2));
      console.error('Square OAuth - Response keys:', Object.keys(tokenData));
      
      // Provide more specific error based on what we got
      let errorMessage = 'no_access_token';
      if (tokenData.error) {
        errorMessage = tokenData.error;
      } else if (tokenData.message) {
        errorMessage = tokenData.message;
      } else if (tokenData.errors && tokenData.errors.length > 0) {
        errorMessage = tokenData.errors[0].detail || 'token_exchange_failed';
      }
      
      return NextResponse.redirect(new URL(`${origin}/dashboard/settings?square_error=${encodeURIComponent(errorMessage)}`, request.url));
    }

    console.log('Square OAuth - Access token received:', tokenData.access_token.substring(0, 20) + '...');
    console.log('Square OAuth - Has refresh token:', !!tokenData.refresh_token);

    // Get merchant info
    let merchantId = '';
    let merchantName = 'Square Account';
    try {
      console.log('Square OAuth - Fetching merchant info...');
      const merchantResponse = await fetch(`${baseUrl}/v2/merchants`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Square-Version': '2024-10-17',
        },
      });

      if (!merchantResponse.ok) {
        console.warn('Square OAuth - Failed to fetch merchant info:', merchantResponse.status, merchantResponse.statusText);
      } else {
        const merchantData = await merchantResponse.json();
        console.log('Square OAuth - Merchant data received:', merchantData);
        
        if (merchantData.merchant && merchantData.merchant.length > 0) {
          const merchant = merchantData.merchant[0];
          merchantId = merchant.id || '';
          merchantName = merchant.business_name || 'Square Account';
          console.log('Square OAuth - Merchant ID:', merchantId);
          console.log('Square OAuth - Merchant Name:', merchantName);
        } else {
          console.warn('Square OAuth - No merchant found in response:', merchantData);
        }
      }
    } catch (merchantError) {
      console.error('Square OAuth - Error fetching merchant info:', merchantError);
      // Continue anyway - we can save the connection without merchant info
    }

    // Store the tokens and merchant info in Firestore
    try {
      console.log('Square OAuth - Saving to Firestore for business:', state);
      const updateData: any = {
        paymentProvider: 'square',
        'paymentConfig.square.connected': true,
        'paymentConfig.square.accessToken': tokenData.access_token,
        'paymentConfig.square.refreshToken': tokenData.refresh_token || '',
        'paymentConfig.square.merchantId': merchantId,
        'paymentConfig.square.sandboxMode': isSandbox,
        'paymentConfig.square.connectedAt': new Date().toISOString(),
      };

      // Only add merchant name if we got it
      if (merchantName && merchantName !== 'Square Account') {
        updateData['paymentConfig.square.merchantName'] = merchantName;
      }

      await updateDoc(doc(db, 'businesses', state), updateData);
      
      console.log('Square OAuth - Successfully stored connection data for business:', state);
      console.log('Square OAuth - Update data:', { ...updateData, accessToken: '***hidden***' });
    } catch (firestoreError: any) {
      console.error('Square OAuth - Error storing to Firestore:', firestoreError);
      console.error('Square OAuth - Error details:', {
        code: firestoreError.code,
        message: firestoreError.message,
        businessId: state
      });
      return NextResponse.redirect(new URL(`${origin}/dashboard/settings?square_error=${encodeURIComponent(firestoreError.message || 'storage_error')}`, request.url));
    }
    
    // Redirect back to settings with success message
    const redirectUrl = new URL(`${origin}/dashboard/settings`, request.url);
    redirectUrl.searchParams.set('square_connected', 'true');
    redirectUrl.searchParams.set('merchant_name', encodeURIComponent(merchantName));

    console.log('Square OAuth - Redirecting to:', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Error in Square OAuth:', error);
    const origin = request.nextUrl.origin;
    return NextResponse.redirect(new URL(`${origin}/dashboard/settings?square_error=${encodeURIComponent(error.message || 'server_error')}`, request.url));
  }
}

