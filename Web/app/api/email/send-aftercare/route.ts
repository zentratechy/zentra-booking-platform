import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { 
      appointmentId, 
      aftercareTemplateId, 
      clientEmail, 
      clientName, 
      businessId,
      templateName,
      templateContent,
      businessName,
      businessLogo
    } = await request.json();

    if (!appointmentId || !aftercareTemplateId || !clientEmail || !clientName || !businessId || !templateName || !templateContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Format the content for email
    const formatContentForEmail = (content: string) => {
      return content
        .replace(/^# (.*$)/gim, '<h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 20px 0 10px 0;">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 style="font-size: 20px; font-weight: 600; color: #1f2937; margin: 16px 0 8px 0;">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; font-weight: 500; color: #1f2937; margin: 14px 0 6px 0;">$1</h3>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong style="font-weight: 600;">$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em style="font-style: italic;">$1</em>')
        .replace(/^- (.*$)/gim, '<li style="margin: 4px 0; padding-left: 0; list-style: none;">• $1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li style="margin: 4px 0; padding-left: 0; list-style: none;">$1</li>')
        .replace(/\n\n/gim, '</p><p style="margin: 12px 0; line-height: 1.6; color: #374151;">')
        .replace(/^(?!<[h|l])/gim, '<p style="margin: 12px 0; line-height: 1.6; color: #374151;">')
        .replace(/(<li.*<\/li>)/gim, '<ul style="margin: 12px 0; padding-left: 0; list-style: none;">$1</ul>');
    };

    const formattedContent = formatContentForEmail(templateContent);

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Zentra <noreply@mail.zentrabooking.com>',
      to: [clientEmail],
      subject: `Aftercare Instructions - ${templateName}`,
      replyTo: 'support@mail.zentrabooking.com', // Optional: Add reply-to address
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Aftercare Instructions</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              ${businessLogo ? `
                <div style="margin-bottom: 20px;">
                  <img src="${businessLogo}" alt="${businessName}" style="max-height: 60px; max-width: 200px; object-fit: contain;" />
                </div>
              ` : ''}
              <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 10px 0;">Aftercare Instructions</h1>
              <p style="color: #e5e7eb; font-size: 16px; margin: 0;">${businessName}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 10px 0;">${templateName}</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">Aftercare instructions for your recent treatment</p>
              </div>
              
              <div style="color: #374151; line-height: 1.6;">
                ${formattedContent}
              </div>
              
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                  If you have any questions or concerns about your treatment, please don't hesitate to contact us.
                </p>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Thank you for choosing ${businessName}!
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This email was sent by Zentra Salon Management System
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending aftercare email:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Error in send-aftercare API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
