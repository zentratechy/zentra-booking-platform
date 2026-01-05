import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { randomBytes } from 'crypto';

// Initialize Resend lazily to avoid build-time errors
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate reset token and store it
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in a temporary collection
    await setDoc(doc(db, 'password_resets', email), {
      token: resetToken,
      expires: resetExpires,
      email: email,
    });

    // Generate reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Generate email HTML
    const emailHtml = generatePasswordResetEmail(resetUrl, email);

    console.log('🚀 Sending password reset email via Resend...');
    
    // Send email
    const resend = getResend();
    const data = await resend.emails.send({
      from: 'Zentra Booking <noreply@mail.zentrabooking.com>',
      to: [email],
      subject: 'Reset Your Zentra Password',
      html: emailHtml,
      replyTo: 'support@mail.zentrabooking.com',
    });

    console.log('✅ Password reset email sent successfully:', data);

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset email sent successfully',
      data 
    });
  } catch (error: any) {
    console.error('❌ Error sending password reset email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send password reset email' },
      { status: 500 }
    );
  }
}

function generatePasswordResetEmail(resetUrl: string, email: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - Zentra</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B7355, #A8B5A0); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold; font-family: 'Playfair Display', serif;">
            Zentra
          </h1>
          <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">
            Your Beauty & Wellness Management Platform
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
            Reset Your Password
          </h2>
          
          <p style="color: #4a5568; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
            Hello! We received a request to reset your password for your Zentra account.
          </p>
          
          <p style="color: #4a5568; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
            If you made this request, click the button below to reset your password:
          </p>

          <!-- Reset Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background-color: #8B7355; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s;">
              Reset My Password
            </a>
          </div>

          <p style="color: #718096; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #8B7355; margin: 8px 0 0 0; font-size: 14px; word-break: break-all;">
            ${resetUrl}
          </p>

          <div style="background-color: #f7fafc; border-left: 4px solid #8B7355; padding: 16px; margin: 30px 0; border-radius: 0 4px 4px 0;">
            <p style="color: #2d3748; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
              ⏰ This link expires in 1 hour
            </p>
            <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.5;">
              For security reasons, this password reset link will expire after 1 hour. If you need to reset your password after that, please request a new reset link.
            </p>
          </div>

          <p style="color: #718096; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; margin: 0 0 8px 0; font-size: 14px;">
            Need help? Contact us at 
            <a href="mailto:support@mail.zentrabooking.com" style="color: #8B7355; text-decoration: none;">
              support@mail.zentrabooking.com
            </a>
          </p>
          <p style="color: #a0aec0; margin: 0; font-size: 12px;">
            © 2024 Zentra. All rights reserved.<br>
            4 Tansley Lane, Woburn Sands, Buckinghamshire, MK17 8GH
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
