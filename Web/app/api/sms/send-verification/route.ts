import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone number and verification code are required' },
        { status: 400 }
      );
    }

    // Format phone number (ensure it starts with +)
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: `Your Zentra verification code is: ${code}. This code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
      to: formattedPhone
    });

    console.log(`📱 SMS sent to ${formattedPhone}: ${message.sid}`);

    return NextResponse.json({
      success: true,
      messageId: message.sid,
      message: 'Verification code sent successfully'
    });

  } catch (error: any) {
    console.error('Error sending SMS:', error);
    
    // Handle specific Twilio errors
    if (error.code === 21211) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }
    
    if (error.code === 21614) {
      return NextResponse.json(
        { error: 'Phone number is not a valid mobile number' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}








