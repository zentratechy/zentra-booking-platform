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
        }
      }
    } catch (e) {
      console.warn('Failed to load business settings for email header:', e);
    }

    // Build HTML using shared template (includes logo/header) and our referral logic in lib templates
    const paymentData: any = {
      customerName: clientName,
      clientId,
      amount,
      currency: 'gbp',
      paymentLink,
      businessName,
      businessId,
      serviceName,
    };

    const finalHtml = generatePaymentLinkEmail(paymentData, businessSettings);
    console.log('📧 Payment Email HTML Preview (first 600 chars):', finalHtml.slice(0, 600));

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

