import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
    const isSandbox = squareAppId?.startsWith('sandbox-');
    
    if (!squareAppId) {
      return NextResponse.json({ error: 'Square App ID not configured' }, { status: 400 });
    }

    const redirectUri = `${request.nextUrl.origin}/api/square/oauth`;
    const state = 'test-state-' + Date.now();
    const scope = 'MERCHANT_PROFILE_READ PAYMENTS_WRITE PAYMENTS_READ';

    const baseUrl = isSandbox
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';

    const oauthUrl = `${baseUrl}/oauth2/authorize?client_id=${squareAppId}&scope=${encodeURIComponent(scope)}&state=${state}&session=false&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return NextResponse.json({
      squareAppId,
      isSandbox,
      redirectUri,
      oauthUrl,
      baseUrl,
      message: 'Square OAuth configuration test'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error.message 
    }, { status: 500 });
  }
}




