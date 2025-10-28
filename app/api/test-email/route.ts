import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    console.log('🧪 Testing Resend configuration...');
    console.log('📧 API Key exists:', !!process.env.RESEND_API_KEY);
    console.log('📧 API Key preview:', process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 10)}...` : 'NOT SET');
    
    // Try to send a simple test email
    const result = await resend.emails.send({
      from: 'Zentra <noreply@mail.zentrabooking.com>',
      to: ['test@resend.dev'], // Resend's test email address
      subject: 'Test Email from Zentra',
      html: '<p>This is a test email to verify Resend configuration.</p>',
    });

    console.log('✅ Test email result:', JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      apiKeyExists: !!process.env.RESEND_API_KEY,
      result: result,
    });
  } catch (error: any) {
    console.error('❌ Test email error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      apiKeyExists: !!process.env.RESEND_API_KEY,
    }, { status: 500 });
  }
}









