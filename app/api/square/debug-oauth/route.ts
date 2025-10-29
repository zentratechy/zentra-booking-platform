import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
    const squareSecret = process.env.SQUARE_APPLICATION_SECRET;
    const squareEnv = process.env.SQUARE_ENVIRONMENT;
    const origin = request.nextUrl.origin;
    
    // Analyze the Square App ID
    const isSandbox = squareAppId?.startsWith('sandbox-');
    const appIdFormat = squareAppId?.startsWith('sandbox-sq0idb-') ? 'sandbox' : 
                       squareAppId?.startsWith('sq0idp-') ? 'production' : 'unknown';
    
    // Build the redirect URI
    const redirectUri = `${origin}/api/square/oauth`;
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    
    // Build OAuth URL components
    const baseUrl = isSandbox
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';
    
    const scope = 'MERCHANT_PROFILE_READ PAYMENTS_WRITE PAYMENTS_READ';
    const encodedScope = encodeURIComponent(scope);
    
    const oauthUrl = `${baseUrl}/oauth2/authorize?client_id=${squareAppId}&scope=${encodedScope}&state=test&session=false&redirect_uri=${encodedRedirectUri}`;
    
    // Verify secret format
    const secretFormat = squareSecret?.startsWith('sandbox-sq0csb-') ? 'sandbox' :
                        squareSecret?.startsWith('sq0csp-') ? 'production' : 'unknown';
    
    return NextResponse.json({
      analysis: {
        'Square App ID': {
          value: squareAppId || 'NOT SET',
          format: appIdFormat,
          isValid: appIdFormat !== 'unknown' && !!squareAppId,
          expectedFormat: isSandbox ? 'sandbox-sq0idb-XXXXX' : 'sq0idp-XXXXX'
        },
        'Square Secret': {
          value: squareSecret ? `${squareSecret.substring(0, 20)}...` : 'NOT SET',
          format: secretFormat,
          isValid: secretFormat !== 'unknown' && !!squareSecret,
          expectedFormat: isSandbox ? 'sandbox-sq0csb-XXXXX' : 'sq0csp-XXXXX'
        },
        'Square Environment': {
          value: squareEnv || 'NOT SET',
          isValid: squareEnv === 'sandbox' || squareEnv === 'production'
        },
        'Environment Detection': {
          detected: isSandbox ? 'sandbox' : 'production',
          baseUrl: baseUrl,
          matches: isSandbox && squareEnv === 'sandbox'
        },
        'Current Origin': {
          value: origin,
          redirectUri: redirectUri,
          encodedRedirectUri: encodedRedirectUri
        },
        'OAuth URL': {
          full: oauthUrl,
          components: {
            baseUrl: baseUrl,
            clientId: squareAppId,
            scope: scope,
            encodedScope: encodedScope,
            redirectUri: redirectUri,
            encodedRedirectUri: encodedRedirectUri
          }
        }
      },
      checklist: {
        'Square App ID configured': !!squareAppId,
        'Square App ID format valid': appIdFormat !== 'unknown',
        'Square Secret configured': !!squareSecret,
        'Square Secret format valid': secretFormat !== 'unknown',
        'Environment variable set': !!squareEnv,
        'Sandbox detection matches': isSandbox === (squareEnv === 'sandbox'),
        'Redirect URI generated': !!redirectUri,
        'OAuth URL constructed': !!oauthUrl
      },
      issues: [
        ...(!squareAppId ? ['Square App ID is missing'] : []),
        ...(appIdFormat === 'unknown' ? ['Square App ID format is invalid'] : []),
        ...(!squareSecret ? ['Square Secret is missing'] : []),
        ...(secretFormat === 'unknown' ? ['Square Secret format is invalid'] : []),
        ...(!squareEnv ? ['SQUARE_ENVIRONMENT not set'] : []),
        ...(isSandbox && squareEnv !== 'sandbox' ? ['Environment mismatch: App ID is sandbox but SQUARE_ENVIRONMENT is not'] : []),
        ...(!isSandbox && squareEnv === 'sandbox' ? ['Environment mismatch: App ID is production but SQUARE_ENVIRONMENT is sandbox'] : [])
      ],
      recommendations: [
        ...(appIdFormat === 'unknown' ? ['Verify Square App ID starts with "sandbox-sq0idb-" (sandbox) or "sq0idp-" (production)'] : []),
        ...(secretFormat === 'unknown' ? ['Verify Square Secret starts with "sandbox-sq0csb-" (sandbox) or "sq0csp-" (production)'] : []),
        ...(!squareEnv ? ['Add SQUARE_ENVIRONMENT=sandbox or SQUARE_ENVIRONMENT=production to .env.local'] : []),
        ['Make sure redirect URI is added to Square app: ' + redirectUri],
        ['Test OAuth URL: ' + oauthUrl]
      ]
    }, { 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error.message 
    }, { status: 500 });
  }
}
