import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// Initialize Resend lazily to avoid build-time errors
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export async function POST(request: Request) {
  try {
    const { email, businessName, ownerName } = await request.json();

    if (!email || !businessName || !ownerName) {
      return NextResponse.json(
        { error: 'Email, business name, and owner name are required' },
        { status: 400 }
      );
    }

    // Generate email HTML
    const emailHtml = generateWelcomeEmail(businessName, ownerName);

    console.log('🚀 Sending welcome email via Resend...');
    
    // Send email
    const resend = getResend();
    const data = await resend.emails.send({
      from: 'Zentra Booking <noreply@mail.zentrabooking.com>',
      to: [email],
      subject: `Welcome to Zentra, ${ownerName}! 🎉`,
      html: emailHtml,
      replyTo: 'support@mail.zentrabooking.com',
    });

    console.log('✅ Welcome email sent successfully:', data);

    return NextResponse.json({ 
      success: true, 
      message: 'Welcome email sent successfully',
      data 
    });
  } catch (error: any) {
    console.error('❌ Error sending welcome email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}

function generateWelcomeEmail(businessName: string, ownerName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Zentra - ${businessName}</title>
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
            Welcome to Zentra, ${ownerName}! 🎉
          </h2>
          
          <p style="color: #4a5568; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
            Congratulations on joining Zentra! We're thrilled to have <strong>${businessName}</strong> as part of our community of successful beauty and wellness professionals.
          </p>
          
          <p style="color: #4a5568; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
            Your 14-day free trial has started, and you're ready to transform your business with our all-in-one management platform.
          </p>

          <!-- Features Grid -->
          <div style="margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">
              What you can do with Zentra:
            </h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
              <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 24px; margin-bottom: 8px;">📅</div>
                <h4 style="color: #2d3748; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Online Booking</h4>
                <p style="color: #4a5568; margin: 0; font-size: 14px;">Let clients book 24/7</p>
              </div>
              
              <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 24px; margin-bottom: 8px;">💳</div>
                <h4 style="color: #2d3748; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Payment Processing</h4>
                <p style="color: #4a5568; margin: 0; font-size: 14px;">Accept payments easily</p>
              </div>
              
              <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 24px; margin-bottom: 8px;">👥</div>
                <h4 style="color: #2d3748; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Staff Management</h4>
                <p style="color: #4a5568; margin: 0; font-size: 14px;">Manage your team</p>
              </div>
              
              <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                <h4 style="color: #2d3748; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Analytics</h4>
                <p style="color: #4a5568; margin: 0; font-size: 14px;">Track your success</p>
              </div>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
               style="display: inline-block; background-color: #8B7355; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s;">
              Get Started with Your Dashboard
            </a>
          </div>

          <!-- Quick Start Tips -->
          <div style="background-color: #f7fafc; border-left: 4px solid #8B7355; padding: 20px; margin: 30px 0; border-radius: 0 4px 4px 0;">
            <h4 style="color: #2d3748; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
              🚀 Quick Start Tips:
            </h4>
            <ul style="color: #4a5568; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li>Complete your business profile in Settings</li>
              <li>Add your services and pricing</li>
              <li>Set up your staff members</li>
              <li>Configure your online booking settings</li>
              <li>Connect your payment processor</li>
            </ul>
          </div>

          <p style="color: #4a5568; margin: 30px 0 0 0; font-size: 16px; line-height: 1.6;">
            Need help getting started? Our support team is here to assist you every step of the way. Don't hesitate to reach out if you have any questions!
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



