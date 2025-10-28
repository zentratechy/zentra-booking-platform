import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export const voucherPaymentWebhook = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = functions.config().stripe?.webhook_secret || 'whsec_le3eUrGpGDyf9dA652Wa8LlSeJoRT6zv';

  let event: Stripe.Event;

  try {
    console.log('🔔 Webhook received:', {
      hasSignature: !!sig,
      bodyLength: req.body?.length || 0,
      webhookSecret: webhookSecret.substring(0, 10) + '...',
      signature: sig?.substring(0, 20) + '...'
    });

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('✅ Webhook signature verified successfully');
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    res.status(400).send('Invalid signature');
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing checkout.session.completed:', {
        sessionId: session.id,
        metadata: session.metadata,
        paymentStatus: session.payment_status
      });
      
      // Check if this is a voucher purchase
      if (session.metadata?.type === 'voucher_purchase') {
        console.log('Processing voucher purchase...');
        await handleVoucherPurchase(session);
        console.log('Voucher purchase processed successfully');
      } else {
        console.log('Not a voucher purchase, skipping');
      }
    } else {
      console.log('Event type not handled:', event.type);
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).send('Webhook handler failed');
  }
});

async function handleVoucherPurchase(session: Stripe.Checkout.Session) {
  try {
    const metadata = session.metadata!;
    const db = admin.firestore();

    console.log('Creating voucher with metadata:', metadata);

    // Generate voucher code
    const voucherCode = 'VCH' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Calculate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create voucher document
    const voucherData = {
      businessId: metadata.businessId,
      voucherCode,
      voucherValue: parseFloat(metadata.voucherValue),
      currency: 'GBP',
      recipientName: metadata.recipientName,
      recipientEmail: metadata.recipientEmail,
      purchaserName: metadata.purchaserName,
      purchaserEmail: metadata.purchaserEmail,
      purchaserPhone: metadata.purchaserPhone || '',
      message: metadata.message || '',
      expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      usedAt: null,
      usedBy: null,
      usedFor: null,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent
    };

    const voucherRef = await db.collection('vouchers').add(voucherData);
    console.log('✅ Voucher created with ID:', voucherRef.id);

    // Send voucher emails
    await sendVoucherEmails(voucherData, metadata.businessId);

  } catch (error: any) {
    console.error('❌ Error creating voucher:', error);
    throw error;
  }
}

async function sendVoucherEmails(voucherData: any, businessId: string) {
  try {
    const db = admin.firestore();
    
    // Get business settings for branding
    let businessSettings = {};
    try {
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      if (businessDoc.exists) {
        const businessData = businessDoc.data()!;
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

    // Send voucher email to recipient
    const recipientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4a574; font-size: 28px; margin: 0;">🎁 Gift Voucher</h1>
        </div>
        
        <div style="background: #f5e6d3; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #8b7355; margin-top: 0;">Hi ${voucherData.recipientName}!</h2>
          <p style="font-size: 18px; margin-bottom: 20px;">You've received a gift voucher worth <strong style="color: #d4a574;">£${voucherData.voucherValue}</strong>!</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Voucher Code</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #d4a574; letter-spacing: 2px;">${voucherData.voucherCode}</p>
          </div>
          
          ${voucherData.message ? `<p style="font-style: italic; color: #8b7355;">"${voucherData.message}"</p>` : ''}
          
          <p style="color: #666; font-size: 14px;">This voucher expires on ${voucherData.expiryDate.toDate().toLocaleDateString()}.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #8b7355;">Best regards,<br>${(businessSettings as any).businessName || 'Your Business'}</p>
        </div>
      </div>
    `;

    // Send confirmation email to purchaser
    const purchaserEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4a574; font-size: 28px; margin: 0;">✅ Voucher Purchase Confirmed</h1>
        </div>
        
        <div style="background: #f5e6d3; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #8b7355; margin-top: 0;">Thank you for your purchase!</h2>
          <p style="font-size: 18px; margin-bottom: 20px;">Your gift voucher has been sent to <strong>${voucherData.recipientName}</strong>.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Voucher Details</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Recipient:</strong> ${voucherData.recipientName}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Value:</strong> £${voucherData.voucherValue}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Code:</strong> ${voucherData.voucherCode}</p>
            ${voucherData.message ? `<p style="margin: 5px 0; font-size: 16px;"><strong>Message:</strong> "${voucherData.message}"</p>` : ''}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #8b7355;">Best regards,<br>${(businessSettings as any).businessName || 'Your Business'}</p>
        </div>
      </div>
    `;

    // Send emails using Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send to recipient
    await resend.emails.send({
      from: `Zentra <noreply@mail.zentrabooking.com>`,
      to: [voucherData.recipientEmail],
      subject: `🎁 Gift Voucher - £${voucherData.voucherValue} from ${(businessSettings as any).businessName || 'Your Business'}`,
      html: recipientEmailHtml,
    });

    // Send to purchaser
    await resend.emails.send({
      from: `Zentra <noreply@mail.zentrabooking.com>`,
      to: [voucherData.purchaserEmail],
      subject: `✅ Voucher Purchase Confirmed - £${voucherData.voucherValue}`,
      html: purchaserEmailHtml,
    });

    console.log('✅ Voucher emails sent successfully');

  } catch (error: any) {
    console.error('❌ Error sending voucher emails:', error);
    throw error;
  }
}
