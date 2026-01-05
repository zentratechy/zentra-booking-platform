import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { generateBookingConfirmationEmail, generatePaymentLinkEmail, generateRescheduleConfirmationEmail, generateVoucherEmail } from '@/lib/emailTemplates';
import { adminDb } from '@/lib/firebase-admin';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Initialize Resend lazily to avoid build-time errors
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export async function POST(request: Request) {
  try {
    const { to, subject, html, type, appointmentData, paymentData, appointmentDetails, businessId } = await request.json();

    console.log('📧 Email send request received:', { to, subject, type, businessId });

    // Validate required fields
    if (!to || !subject) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    // Fetch business settings for branding
    let businessSettings: any = {};
    if (businessId) {
      try {
        // Use Firebase Admin SDK for server-side operations, fallback to client SDK
        let businessData = null;
        if (adminDb) {
          try {
            const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
            if (businessDoc.exists) {
              businessData = businessDoc.data();
            }
          } catch (adminError: any) {
            console.error('❌ Firebase Admin error (will try client SDK):', adminError.message);
            // Fall through to try client SDK
          }
        }
        
        // Try client SDK if admin failed or not available
        if (!businessData && db) {
          try {
            const businessDoc = await getDoc(doc(db, 'businesses', businessId));
            if (businessDoc.exists()) {
              businessData = businessDoc.data();
            }
          } catch (clientError: any) {
            console.error('❌ Firebase client SDK error:', clientError.message);
          }
        }
        
        if (businessData) {
          businessSettings = {
            logo: businessData.emailSettings?.logo || businessData.logo,
            signature: businessData.emailSettings?.signature,
            footerText: businessData.emailSettings?.footerText,
            businessName: businessData.businessName || businessData.name,
            businessPhone: businessData.phone,
            businessEmail: businessData.email,
            businessAddress: businessData.address,
            colorScheme: businessData.colorScheme || 'classic',
            loyaltyProgram: businessData.loyaltyProgram || {}
          };
        } else {
          console.warn('⚠️ Business data not found, using defaults');
        }
      } catch (error: any) {
        console.error('❌ Error fetching business settings:', error);
        console.error('❌ Error details:', error.message);
        // Continue with default settings - don't fail email sending
      }
    }

    let emailHtml = html;

    // Generate HTML from template if type is specified
    if (type === 'booking_confirmation' && appointmentData) {
      console.log('📝 Generating booking confirmation email template');
      console.log('📝 Business settings:', businessSettings);
      console.log('📝 Appointment data:', JSON.stringify(appointmentData, null, 2));
      console.log('📝 Business ID in appointmentData:', appointmentData.businessId, 'type:', typeof appointmentData.businessId);
      console.log('📝 Client ID in appointmentData:', appointmentData.clientId, 'type:', typeof appointmentData.clientId);
      // Ensure businessId is in appointmentData if not already
      if (!appointmentData.businessId && businessId) {
        appointmentData.businessId = businessId;
        console.log('✅ Added businessId to appointmentData:', businessId);
      }
      try {
        emailHtml = generateBookingConfirmationEmail(appointmentData, businessSettings);
        console.log('✅ Template generated, length:', emailHtml?.length);
        // Check if referral link is in the HTML
        if (emailHtml.includes('Share Booking Link')) {
          console.log('✅ Referral link section found in HTML');
        } else {
          console.log('⚠️ Referral link section NOT found in HTML');
        }
      } catch (templateError) {
        console.error('❌ Error generating template:', templateError);
        throw templateError;
      }
    } else if (type === 'payment_link' && paymentData) {
      console.log('📝 Generating payment link email template');
      console.log('📝 Payment data:', JSON.stringify(paymentData, null, 2));
      console.log('📝 Payment data - businessId:', paymentData.businessId, 'clientId:', paymentData.clientId);
      // Ensure businessId is in paymentData if not already
      if (!paymentData.businessId && businessId) {
        paymentData.businessId = businessId;
      }
      emailHtml = generatePaymentLinkEmail(paymentData, businessSettings);
    } else if (type === 'reschedule_confirmation' && appointmentDetails) {
      console.log('📝 Generating reschedule confirmation email template');
      emailHtml = generateRescheduleConfirmationEmail(appointmentDetails, businessSettings);
    } else if (type === 'voucher' && appointmentData) {
      console.log('📝 Generating voucher email template');
      emailHtml = generateVoucherEmail(appointmentData, businessSettings);
    }

    console.log('🚀 Sending email via Resend...');
    console.log('📧 To:', to);
    console.log('📧 Subject:', subject);
    console.log('📧 HTML length:', emailHtml?.length);
    console.log('📧 Resend API Key exists:', !!process.env.RESEND_API_KEY);
    
    // Validate Resend API key
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 500 }
      );
    }
    
    // Check if email is unsubscribed
    const unsubscribedEmails = (businessSettings as any)?.unsubscribedEmails || [];
    if (unsubscribedEmails.includes(to)) {
      console.log('📧 Email address is unsubscribed, skipping send');
      return NextResponse.json({ 
        success: true, 
        message: 'Email skipped - recipient unsubscribed' 
      });
    }

    // Send email with business-specific sender
    const businessName = (businessSettings as any)?.businessName || (businessSettings as any)?.name || 'Your Business';
    const businessEmail = (businessSettings as any)?.email || 'noreply@mail.zentrabooking.com';
    
    try {
      const resend = getResend();
      const result = await resend.emails.send({
        from: `${businessName} <noreply@mail.zentrabooking.com>`,
        to: [to],
        subject: subject,
        html: emailHtml,
        replyTo: businessEmail, // Use business email as reply-to
        headers: {
          'X-Mailer': 'Zentra Booking System',
          'X-Priority': '3',
        },
      });

      console.log('✅ Resend response:', JSON.stringify(result, null, 2));

      // Check if there's an error in the response
      if (result.error) {
        console.error('❌ Resend returned an error:', result.error);
        return NextResponse.json({ 
          success: false, 
          error: result.error 
        }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: result.data });
    } catch (resendError: any) {
      console.error('❌ Resend API error:', resendError);
      console.error('❌ Resend error details:', resendError.message, resendError.response?.data);
      return NextResponse.json(
        { error: resendError.message || 'Failed to send email via Resend' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    console.error('Error details:', error.message, error.response?.data);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

