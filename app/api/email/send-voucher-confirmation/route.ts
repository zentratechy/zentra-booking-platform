import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateVoucherConfirmationEmail } from '@/lib/emailTemplates';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { 
      purchaserEmail, 
      purchaserName, 
      recipientName,
      recipientEmail,
      voucherCode, 
      voucherValue, 
      currency, 
      businessId
    } = await request.json();

    if (!purchaserEmail || !purchaserName || !voucherCode || !voucherValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('📧 Sending voucher confirmation email to purchaser:', purchaserEmail);

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

    // Generate confirmation email using template
    const confirmationData = {
      purchaserName,
      recipientName,
      recipientEmail,
      voucherCode,
      voucherValue,
      currency,
      businessName: (businessSettings as any).businessName || 'Your Business'
    };

    const emailHtml = generateVoucherConfirmationEmail(confirmationData, businessSettings);

    // Format currency for subject line
    const formatPrice = (amount: number, currency: string) => {
      const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '$';
      return `${symbol}${amount.toFixed(2)}`;
    };

    await resend.emails.send({
      from: `Zentra <noreply@mail.zentrabooking.com>`,
      to: [purchaserEmail],
      subject: `🎁 Gift Voucher Purchase Confirmation - ${formatPrice(voucherValue, currency)}`,
      html: emailHtml,
      replyTo: 'support@mail.zentrabooking.com',
    });
    
    console.log('✅ Voucher confirmation email sent successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error sending voucher confirmation email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






