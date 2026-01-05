import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if Twilio credentials are configured
    const hasAccountSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasAuthToken = !!process.env.TWILIO_AUTH_TOKEN;
    const hasPhoneNumber = !!process.env.TWILIO_PHONE_NUMBER;

    const status = {
      twilioConfigured: hasAccountSid && hasAuthToken && hasPhoneNumber,
      credentials: {
        accountSid: hasAccountSid ? '✅ Set' : '❌ Missing',
        authToken: hasAuthToken ? '✅ Set' : '❌ Missing',
        phoneNumber: hasPhoneNumber ? '✅ Set' : '❌ Missing'
      },
      message: hasAccountSid && hasAuthToken && hasPhoneNumber 
        ? 'SMS functionality is ready!' 
        : 'SMS will fallback to console logging (development mode)'
    };

    return NextResponse.json(status);

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check SMS configuration' },
      { status: 500 }
    );
  }
}








