import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { 
      businessId, 
      voucherValue, 
      recipientName, 
      recipientEmail, 
      purchaserName, 
      purchaserEmail, 
      message 
    } = await request.json();

    if (!businessId || !voucherValue || !recipientName || !recipientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('🧪 Test: Creating voucher manually...');

    // Generate voucher code
    const voucherCode = 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Calculate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create voucher document
    const voucherData = {
      businessId,
      voucherCode,
      voucherValue: parseFloat(voucherValue),
      currency: 'GBP',
      recipientName,
      recipientEmail,
      purchaserName: purchaserName || 'Test Purchaser',
      purchaserEmail: purchaserEmail || 'test@example.com',
      message: message || 'Test voucher',
      expiryDate: expiryDate,
      status: 'active',
      createdAt: serverTimestamp(),
      usedAt: null,
      usedBy: null,
      usedFor: null
    };

    const voucherRef = await addDoc(collection(db, 'vouchers'), voucherData);
    console.log('✅ Voucher created with ID:', voucherRef.id);

    // Send voucher email
    try {
      await resend.emails.send({
        from: `Zentra <noreply@mail.zentrabooking.com>`,
        to: [recipientEmail],
        subject: `🎁 Gift Voucher - £${voucherValue} from Test Business`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🎁 You've received a gift voucher!</h2>
            <p>Hi ${recipientName},</p>
            <p>You've received a gift voucher worth <strong>£${voucherValue}</strong>!</p>
            <p><strong>Voucher Code:</strong> ${voucherCode}</p>
            <p><strong>Message:</strong> ${message || 'Enjoy your voucher!'}</p>
            <p>This voucher expires on ${expiryDate.toLocaleDateString()}.</p>
            <p>Best regards,<br>Test Business</p>
          </div>
        `,
      });
      console.log('✅ Voucher email sent');
    } catch (emailError) {
      console.error('❌ Error sending voucher email:', emailError);
    }

    return NextResponse.json({ 
      success: true, 
      voucherId: voucherRef.id,
      voucherCode,
      message: 'Test voucher created successfully'
    });

  } catch (error: any) {
    console.error('❌ Error creating test voucher:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
