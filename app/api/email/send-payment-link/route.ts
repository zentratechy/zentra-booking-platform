import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { generatePaymentLinkEmail } from '@/lib/emailTemplates';

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

    // Compose businessSettings for branded header/footer
    const businessSettings: any = {};
    try {
      if (businessId) {
        const businessDoc = await getDoc(doc(db, 'businesses', businessId));
        if (businessDoc.exists()) {
          const b = businessDoc.data() as any;
          businessSettings.logo = b.emailSettings?.logo || b.logo;
          businessSettings.signature = b.emailSettings?.signature;
          businessSettings.footerText = b.emailSettings?.footerText;
          businessSettings.businessName = b.businessName || b.name;
          businessSettings.businessPhone = b.phone;
          businessSettings.businessEmail = b.email;
          businessSettings.businessAddress = b.address;
          businessSettings.colorScheme = b.colorScheme || 'classic';
          businessSettings.loyaltyProgram = b.loyaltyProgram;
        }
      }
    } catch (e) {
      console.warn('Failed to load business settings for email header:', e);
    }

    // Build HTML using shared template (includes logo/header) and our referral logic in lib templates
    const paymentData: any = {
      customerName: clientName,
      // Do not pass clientId into the shared template so its internal referral block is suppressed
      clientId: undefined,
      amount,
      currency: 'gbp',
      paymentLink,
      businessName,
      businessId,
      serviceName,
      templateHint: 'payment',
    };

    let finalHtml = generatePaymentLinkEmail(paymentData, businessSettings);
    console.log('📧 Payment Email HTML Preview (first 600 chars):', finalHtml.slice(0, 600));
    console.log('🔧 Loyalty settings:', JSON.stringify(((businessSettings as any)?.loyaltyProgram?.settings) || {}, null, 2));

    // Respect referral toggle from businessSettings
    const referralEnabled = (businessSettings as any)?.loyaltyProgram?.settings?.referral?.enabled ??
                            (businessSettings as any)?.loyaltyProgram?.settings?.referralEnabled ?? true;

    // Ensure referral link exists only if enabled; if template missed it, append a minimal block as fallback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://zentrabooking.com';
    const hasReferral = finalHtml.includes('/book/') && finalHtml.includes('?ref=');
    console.log('🔧 Referral toggle resolved:', referralEnabled, 'hasReferralInTemplate:', hasReferral);
    if (referralEnabled && !hasReferral && typeof businessId === 'string' && typeof clientId === 'string' && businessId && clientId) {
      const fallbackReferral = `
        <div style="margin:25px 0;padding:20px;background:rgba(255,255,255,0.1);border-radius:8px;border:1px solid rgba(255,255,255,0.2);text-align:center">
          <h3 style="color:#8b3e6b;font-size:16px;margin:0 0 12px 0;font-weight:600">💝 Refer a Friend & Earn Rewards!</h3>
          <p style="color:#5a3b4a;font-size:14px;margin:0 0 12px 0;">Share your booking link to earn rewards:</p>
          <a href="${baseUrl}/book/${businessId}?ref=${clientId}" style="display:inline-block;background:#8b3e6b;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">📱 Share Booking Link</a>
          <div style="color:#6b5160;font-size:12px;margin-top:8px;word-break:break-all;">${baseUrl}/book/${businessId}?ref=${clientId}</div>
        </div>
      `;
      // Insert before closing body if possible; otherwise append
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${fallbackReferral}</body>`);
      } else {
        finalHtml += fallbackReferral;
      }
      console.log('🔁 Referral fallback appended:', `${baseUrl}/book/${businessId}?ref=${clientId}`);
    } else {
      console.log('🔗 Referral present or disabled:', hasReferral, 'enabled:', referralEnabled);
    }

    // Append debug marker comment near footer for quick inspection
    const marker = `<!-- referral: ${referralEnabled ? 'enabled' : 'disabled'}; source: payment-route; hasUrl:${finalHtml.includes('/book/') && finalHtml.includes('?ref=')} -->`;
    if (finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', `${marker}</body>`);
    } else {
      finalHtml += marker;
    }

    // Final safety: strip any stray 'undefined' placeholders or empty blocks
    finalHtml = finalHtml
      // remove any divs that only contain 'undefined'
      .replace(/<div[^>]*>\s*undefined\s*<\/div>/gi, '')
      // remove bare text nodes 'undefined' surrounded by whitespace
      .replace(/>\s*undefined\s*</gi, '><');

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${businessName} <noreply@mail.zentrabooking.com>`,
      replyTo: businessEmail,
      to: [clientEmail],
      subject: `Payment Link - ${serviceName}`,
      html: finalHtml,
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

