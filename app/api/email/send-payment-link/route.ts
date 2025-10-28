import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      appointmentId, 
      clientEmail, 
      clientName, 
      amount, 
      serviceName, 
      paymentLink, 
      businessId 
    } = body;

    // Validate required fields
    if (!clientEmail || !clientName || !amount || !serviceName || !paymentLink) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Zentra <noreply@zentra.app>', // Update with your domain
      to: [clientEmail],
      subject: `Payment Link - ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #d4a574, #b88f61); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Link</h1>
          </div>
          
          <div style="background: #faf8f5; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #8b7355; margin-top: 0;">Hi ${clientName},</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Thank you for booking with us! Please complete your payment for the following service:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #d4a574; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #8b7355;">Service Details</h3>
              <p style="margin: 5px 0; color: #333;"><strong>Service:</strong> ${serviceName}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Amount:</strong> £${amount.toFixed(2)}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentLink}" 
                 style="background: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Pay Now - £${amount.toFixed(2)}
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              This payment link is secure and will expire in 7 days.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>If you have any questions, please contact us.</p>
            <p>© 2025 Zentra. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data?.id,
      message: 'Payment link sent successfully' 
    });

  } catch (error) {
    console.error('Payment link email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

