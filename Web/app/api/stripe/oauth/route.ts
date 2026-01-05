import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This should be the businessId
  
  const origin = request.nextUrl.origin;

  if (!code || !state) {
    return NextResponse.redirect(new URL(`${origin}/dashboard/settings?stripe_error=missing_params`, request.url));
  }

  try {
    // Exchange authorization code for access token
    const oauthResponse = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    const accountId = oauthResponse.stripe_user_id;

    if (!accountId) {
      console.error('Stripe OAuth: No account ID in response');
      return NextResponse.redirect(new URL(`${origin}/dashboard/settings?stripe_error=no_account_id`, request.url));
    }

    // Store the account ID in Firestore
    try {
      await updateDoc(doc(db, 'businesses', state), {
        paymentProvider: 'stripe',
        'paymentConfig.stripe.accountId': accountId,
        'paymentConfig.stripe.connected': true,
        'paymentConfig.stripe.connectedAt': new Date().toISOString(),
      });
      
      console.log('Stripe OAuth: Successfully stored account ID for business:', state);
    } catch (firestoreError: any) {
      console.error('Stripe OAuth: Error storing to Firestore:', firestoreError);
      return NextResponse.redirect(new URL(`${origin}/dashboard/settings?stripe_error=storage_error`, request.url));
    }
    
    // Redirect back to settings with success message
    const redirectUrl = new URL(`${origin}/dashboard/settings`, request.url);
    redirectUrl.searchParams.set('stripe_connected', 'true');
    redirectUrl.searchParams.set('account_id', accountId);

    console.log('Stripe OAuth: Redirecting to:', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Error in Stripe OAuth:', error);
    return NextResponse.redirect(new URL(`${origin}/dashboard/settings?stripe_error=${encodeURIComponent(error.message || 'server_error')}`, request.url));
  }
}





