import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Send verification code email
    const { data, error } = await resend.emails.send({
      from: 'Zentra Booking <noreply@mail.zentrabooking.com>',
      to: [email],
      subject: 'Your Zentra Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #d4a574 0%, #b88f61 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Verification Code</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e8e3dc; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Your verification code is:</p>
            <div style="background: #f5f1ed; border: 2px solid #d4a574; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #8b7355; letter-spacing: 8px; font-family: monospace;">${code}</div>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">This code expires in 10 minutes. Please do not share this code with anyone.</p>
            <p style="font-size: 14px; color: #666; margin-top: 10px;">If you didn't request this code, please ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>© ${new Date().getFullYear()} Zentra Booking. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending verification email:', error);
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`📧 Verification code email sent to ${email}`);

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'Verification code sent successfully'
    });

  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}





