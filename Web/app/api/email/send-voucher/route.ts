import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateVoucherEmail } from '@/lib/emailTemplates';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { 
      recipientEmail, 
      recipientName, 
      voucherCode, 
      voucherValue, 
      currency, 
      message, 
      purchaserName, 
      expiryDate, 
      businessName,
      businessId
    } = await request.json();

    if (!recipientEmail || !recipientName || !voucherCode || !voucherValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('🎁 Sending voucher email to:', recipientEmail);

    // Fetch business settings for branding
    let businessSettings = {};
    if (businessId) {
      try {
        const businessDoc = await getDoc(doc(db, 'businesses', businessId));
        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          businessSettings = {
            logo: businessData.emailSettings?.logo || businessData.logo,
            signature: businessData.emailSettings?.signature,
            footerText: businessData.emailSettings?.footerText,
            businessName: businessData.businessName || businessData.name,
            businessPhone: businessData.phone,
            businessEmail: businessData.email,
            businessAddress: businessData.address,
            colorScheme: businessData.colorScheme || 'classic'
          };
        }
      } catch (error) {
        console.error('❌ Error fetching business settings:', error);
        // Continue with default settings
      }
    }

    // Generate voucher email using template
    const voucherData = {
      recipientName,
      voucherCode,
      voucherValue,
      currency,
      message,
      purchaserName,
      expiryDate,
      businessName: (businessSettings as any).businessName || businessName
    };

    const emailHtml = generateVoucherEmail(voucherData, businessSettings);

    // Format currency for subject line
    const formatPrice = (amount: number, currency: string) => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount);
    };

    await resend.emails.send({
      from: `Zentra <noreply@mail.zentrabooking.com>`,
      to: [recipientEmail],
      subject: `🎁 Gift Voucher - ${formatPrice(voucherValue, currency)} from ${(businessSettings as any).businessName || businessName || 'Your Business'}`,
      html: emailHtml,
      replyTo: 'support@mail.zentrabooking.com',
    });
    
    console.log('✅ Voucher email sent successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error sending voucher email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send voucher email' }, { status: 500 });
  }
}
