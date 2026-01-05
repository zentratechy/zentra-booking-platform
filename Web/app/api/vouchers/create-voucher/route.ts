import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Resend } from 'resend';
import { generateVoucherEmail, generateVoucherConfirmationEmail } from '@/lib/emailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    const { 
      businessId, 
      voucherValue, 
      recipientName, 
      recipientEmail, 
      message, 
      purchaserName, 
      purchaserEmail, 
      purchaserPhone,
      paymentIntentId
    } = await request.json();

    if (!businessId || !voucherValue || !recipientName || !recipientEmail || !purchaserName || !purchaserEmail || !paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get business data for currency and settings
    let currency = 'GBP';
    let businessSettings: any = {};
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        currency = businessData.currency || 'GBP';
        businessSettings = {
          logo: businessData.emailSettings?.logo || businessData.logo,
          signature: businessData.emailSettings?.signature,
          footerText: businessData.emailSettings?.footerText,
          businessName: businessData.businessName || businessData.name,
          businessPhone: businessData.phone,
          businessEmail: businessData.email,
          businessAddress: businessData.address,
          colorScheme: businessData.colorScheme || 'classic',
          loyaltyProgram: businessData.loyaltyProgram || {} // Include loyalty program for email template
        };
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
      // Continue with defaults
    }

    // Generate voucher code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Create expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create voucher in Firestore
    const voucher = {
      businessId,
      code: code,
      value: parseFloat(voucherValue.toString()),
      originalValue: parseFloat(voucherValue.toString()),
      balance: parseFloat(voucherValue.toString()),
      recipientName,
      recipientEmail,
      message: message || '',
      purchaserName,
      purchaserEmail,
      purchaserPhone: purchaserPhone || '',
      expiryDate: Timestamp.fromDate(expiryDate),
      status: 'active',
      redeemed: false,
      redeemedAmount: 0,
      createdAt: serverTimestamp(),
      source: 'online_purchase',
      stripePaymentIntentId: paymentIntentId,
    };

    const voucherRef = await addDoc(collection(db, 'vouchers'), voucher);

    // Send voucher email to recipient
    try {
      console.log('📧 Sending voucher email to recipient:', recipientEmail);
      console.log('📧 Resend API Key configured:', !!process.env.RESEND_API_KEY);
      
      const voucherData = {
        recipientName,
        voucherCode: code,
        voucherValue: parseFloat(voucherValue.toString()),
        currency: currency,
        message: message || '',
        purchaserName,
        expiryDate: expiryDate.toISOString(),
        businessName: businessSettings.businessName || 'Your Business'
      };

      const emailHtml = generateVoucherEmail(voucherData, businessSettings);
      console.log('📧 Email HTML generated, length:', emailHtml?.length || 0);
      
      const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: currency.toUpperCase(),
        }).format(amount);
      };

      const { data, error } = await resend.emails.send({
        from: `${businessSettings.businessName || 'Zentra'} <noreply@mail.zentrabooking.com>`,
        replyTo: businessSettings.businessEmail || 'support@mail.zentrabooking.com',
        to: [recipientEmail],
        subject: `🎁 Gift Voucher - ${formatPrice(parseFloat(voucherValue.toString()), currency)} from ${businessSettings.businessName || 'Your Business'}`,
        html: emailHtml,
      });

      if (error) {
        console.error('❌ Resend API error sending voucher email:', error);
      } else {
        console.log('✅ Voucher email sent successfully to recipient:', data?.id);
      }
    } catch (emailError: any) {
      console.error('❌ Exception sending voucher email:', emailError);
      console.error('❌ Error details:', JSON.stringify(emailError, null, 2));
    }

    // Send confirmation email to purchaser
    try {
      console.log('📧 Sending confirmation email to purchaser:', purchaserEmail);
      console.log('📧 Resend API Key configured:', !!process.env.RESEND_API_KEY);
      
      const confirmationData = {
        purchaserName,
        recipientName,
        recipientEmail,
        voucherCode: code,
        voucherValue: parseFloat(voucherValue.toString()),
        currency: currency,
        businessName: businessSettings.businessName || 'Your Business'
      };

      const emailHtml = generateVoucherConfirmationEmail(confirmationData, businessSettings);
      console.log('📧 Confirmation email HTML generated, length:', emailHtml?.length || 0);
      
      const formatPrice = (amount: number, currency: string) => {
        const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '$';
        return `${symbol}${amount.toFixed(2)}`;
      };

      const { data, error } = await resend.emails.send({
        from: `${businessSettings.businessName || 'Zentra'} <noreply@mail.zentrabooking.com>`,
        replyTo: businessSettings.businessEmail || 'support@mail.zentrabooking.com',
        to: [purchaserEmail],
        subject: `🎁 Gift Voucher Purchase Confirmation - ${formatPrice(parseFloat(voucherValue.toString()), currency)}`,
        html: emailHtml,
      });

      if (error) {
        console.error('❌ Resend API error sending confirmation email:', error);
      } else {
        console.log('✅ Confirmation email sent successfully to purchaser:', data?.id);
      }
    } catch (emailError: any) {
      console.error('❌ Exception sending confirmation email:', emailError);
      console.error('❌ Error details:', JSON.stringify(emailError, null, 2));
    }

    return NextResponse.json({
      success: true,
      voucherId: voucherRef.id,
      voucherCode: code,
    });
  } catch (error: any) {
    console.error('Error creating voucher:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create voucher' },
      { status: 500 }
    );
  }
}

