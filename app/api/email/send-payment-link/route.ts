import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
      businessId: bodyBusinessId, 
      clientId: bodyClientId
    } = body;

    // Validate required fields
    if (!clientEmail || !clientName || !amount || !serviceName || !paymentLink) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch business data for email personalization
    let businessName = 'Your Business';
    let businessEmail = 'noreply@mail.zentrabooking.com';
    
    let businessId = bodyBusinessId as string | undefined;
    let clientId = bodyClientId as string | undefined;

    if (businessId) {
      try {
        const businessDoc = await getDoc(doc(db, 'businesses', businessId));
        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          businessName = businessData.businessName || businessData.name || 'Your Business';
          businessEmail = businessData.email || 'noreply@mail.zentrabooking.com';
        }
      } catch (error) {
        console.error('Error fetching business data:', error);
        // Continue with defaults
      }
    }

    // If appointmentId is provided, fetch appointment to derive missing ids
    try {
      if (appointmentId && (!businessId || !clientId)) {
        const aptSnap = await getDoc(doc(db, 'appointments', appointmentId));
        if (aptSnap.exists()) {
          const aptData = aptSnap.data() as any;
          if (!businessId && aptData.businessId) businessId = aptData.businessId;
          if (!clientId && aptData.clientId) clientId = aptData.clientId;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch appointment for referral info:', e);
    }

    // Build referral section (only if we have both ids as strings)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://zentrabooking.com';
    const canShowReferral = typeof businessId === 'string' && typeof clientId === 'string' && businessId && clientId;
    const referralSection = canShowReferral ? `
          <div style="background: linear-gradient(135deg, #f9c2d1, #f3a6c0); padding: 24px; border-radius: 12px; text-align: center; margin-top: 28px; border: 1px solid rgba(0,0,0,0.05);">
            <h3 style="margin: 0 0 12px 0; color: #8b3e6b; font-size: 18px;">💝 Refer a Friend & Earn Rewards!</h3>
            <p style="margin: 0 0 16px 0; color: #5a3b4a; font-size: 14px;">Love our service? Share your link — you’ll both earn bonus loyalty points when they book.</p>
            <a href="${baseUrl}/book/${businessId}?ref=${clientId}" style="display:inline-block;background:#8b3e6b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">📱 Share Booking Link</a>
            <p style="margin: 12px 0 0 0; color: #6b5160; font-size: 12px;">Copy and share this link to earn referral rewards.</p>
          </div>
    ` : '';

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${businessName} <noreply@mail.zentrabooking.com>`,
      replyTo: businessEmail,
      to: [clientEmail],
      subject: `Payment Link - ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #d4a574, #b88f61); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Link</h1>
          </div>
          
          <div style="background: #faf8f5; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #8b7355; margin-top: 0;">Hi ${clientName || 'Customer'},</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Thank you for booking with ${businessName}! Please complete your payment for the following service:
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
          
          ${referralSection}

          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>If you have any questions, please contact ${businessName}.</p>
            <p>© 2025 ${businessName}. All rights reserved.</p>
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

