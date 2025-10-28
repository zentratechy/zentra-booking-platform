import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    console.log('🧪 Testing simple email delivery...');
    
    // Send a very simple email without templates
    const result = await resend.emails.send({
      from: 'Zentra <noreply@mail.zentrabooking.com>',
      to: ['jamesjacksonclark@gmail.com'], // Use your actual email
      subject: 'Simple Test Email - Please Check Inbox',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Test Email</h1>
            <p>This is a simple test email to verify Resend delivery.</p>
            <p>If you receive this, Resend is working correctly!</p>
            <p>Time sent: ${new Date().toLocaleString()}</p>
          </body>
        </html>
      `,
    });

    console.log('✅ Simple email result:', JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Simple test email sent! Check your inbox (and spam) for jamesjacksonclark@gmail.com',
      result: result,
    });
  } catch (error: any) {
    console.error('❌ Simple email error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}









