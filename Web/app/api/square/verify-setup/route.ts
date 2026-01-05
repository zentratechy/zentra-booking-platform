import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
    const squareSecret = process.env.SQUARE_APPLICATION_SECRET;
    const squareEnv = process.env.SQUARE_ENVIRONMENT;
    const origin = request.nextUrl.origin;
    
    const isSandbox = squareAppId?.startsWith('sandbox-');
    const baseUrl = isSandbox
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';
    
    const redirectUri = `${origin}/api/square/oauth`;
    const scope = 'MERCHANT_PROFILE_READ PAYMENTS_WRITE PAYMENTS_READ';
    
    const oauthUrl = `${baseUrl}/oauth2/authorize?client_id=${squareAppId}&scope=${encodeURIComponent(scope)}&state=test&session=false&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    return NextResponse.json({
      status: 'setup_verification',
      domain: {
        current: origin,
        redirectUri: redirectUri,
        expectedInSquare: redirectUri
      },
      square: {
        appId: squareAppId,
        environment: squareEnv || (isSandbox ? 'sandbox' : 'production'),
        isSandbox: isSandbox,
        baseUrl: baseUrl,
        appIdFormat: squareAppId?.startsWith('sandbox-sq0idb-') ? 'valid_sandbox' : 
                    squareAppId?.startsWith('sq0idp-') ? 'valid_production' : 'invalid',
        secretFormat: squareSecret?.startsWith('sandbox-sq0csb-') ? 'valid_sandbox' :
                     squareSecret?.startsWith('sq0csp-') ? 'valid_production' : 'invalid'
      },
      oauthUrl: oauthUrl,
      checklist: {
        'Square App ID configured': !!squareAppId,
        'Square Secret configured': !!squareSecret,
        'Redirect URI matches domain': redirectUri.includes(origin),
        'OAuth URL uses connect subdomain': baseUrl.includes('connect.'),
        'Environment matches app ID': isSandbox === (squareEnv === 'sandbox' || !squareEnv)
      },
      actionItems: [
        `✅ Add this redirect URI to Square app: ${redirectUri}`,
        '✅ Verify Square app OAuth is enabled',
        '✅ Test OAuth URL: Click the oauthUrl below',
        '✅ After Square setup, try connecting in Zentra dashboard'
      ],
      testOAuthUrl: oauthUrl
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Verification failed',
      details: error.message
    }, { status: 500 });
  }
}




